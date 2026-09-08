import { env } from 'cloudflare:workers';
import { ApiError, db } from './archive-server';

const SCOPE = 'https://www.googleapis.com/auth/drive.file';
const API = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';
const CALLBACK = '/api/drive/callback';
const ROOT_MARKER = 'life-archive-v1';
type Settings = { GOOGLE_DRIVE_CLIENT_ID?: string; GOOGLE_DRIVE_CLIENT_SECRET?: string; GOOGLE_DRIVE_TOKEN_KEY?: string; APP_ORIGIN?: string };
export type Connection = { owner:string; account_id:string; email:string; refresh_token:string|null; folder_id:string; folder_url:string; updated_at:string };
type DriveFile = { id:string; webViewLink?:string; mimeType?:string; trashed?:boolean };
export function configured() {
  const e = env as Settings;
  return !!(e.GOOGLE_DRIVE_CLIENT_ID && e.GOOGLE_DRIVE_CLIENT_SECRET && /^[a-f0-9]{64}$/i.test(e.GOOGLE_DRIVE_TOKEN_KEY || '') && validOrigin(e.APP_ORIGIN));
}
function validOrigin(value?:string) { try { const u=new URL(value||''); return u.protocol==='https:'&&u.origin===value; } catch { return false; } }
function settings() {
  if (!configured()) throw new ApiError('Google Drive setup is not complete yet.',503);
  return env as unknown as Required<Settings>;
}
function hex(bytes:Uint8Array){return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');}
async function digest(value:string){return hex(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))));}
async function key(){const raw=settings().GOOGLE_DRIVE_TOKEN_KEY;return crypto.subtle.importKey('raw',Uint8Array.from(raw.match(/../g)!,x=>parseInt(x,16)),{name:'AES-GCM'},false,['encrypt','decrypt']);}
export async function encryptToken(token:string,user:string){
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(user)},await key(),new TextEncoder().encode(token));
  return hex(iv)+'.'+hex(new Uint8Array(encrypted));
}
async function decryptToken(value:string,user:string){
  try { const [iv,data]=value.split('.').map(part=>Uint8Array.from(part.match(/../g)!,x=>parseInt(x,16)));
    return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(user)},await key(),data));
  } catch { throw new ApiError('Google Drive needs to be reconnected.',409); }
}
export async function connection(user:string){return db().prepare('SELECT * FROM drive_connections WHERE owner=?').bind(user).first<Connection>();}
export async function driveStatus(user:string){
  const c=await connection(user);
  return {configured:configured(),connected:!!c?.refresh_token,email:c?.email||null,folderUrl:c?.folder_url||null};
}
async function requestGoogle(url:string,init:RequestInit={}){
  try{return await fetch(url,{...init,redirect:'manual',signal:AbortSignal.timeout(45000)});}
  catch{throw new ApiError('Google Drive could not be reached. Please try again.',503);}
}
async function tokenRequest(body:URLSearchParams){
  const response=await requestGoogle('https://oauth2.googleapis.com/token',{method:'POST',body});
  const data=await response.json() as {access_token?:string;refresh_token?:string;scope?:string;error?:string};
  if(!response.ok||!data.access_token){
    if(data.error==='invalid_grant')throw new ApiError('Google Drive access expired. Please reconnect it.',409);
    throw new ApiError('Google Drive authorization failed. Please try connecting again.',502);
  }
  return data as typeof data & {access_token:string};
}
export async function beginConnection(user:string,request:Request){
  const e=settings();
  if(request.headers.get('origin')!==e.APP_ORIGIN)throw new ApiError('Start the connection from your archive.',403);
  const state=hex(crypto.getRandomValues(new Uint8Array(32))),now=Date.now();
  await db().batch([
    db().prepare('DELETE FROM drive_oauth_states WHERE expires_at < ? OR owner = ?').bind(now,user),
    db().prepare('INSERT INTO drive_oauth_states (hash,owner,expires_at) VALUES (?,?,?)').bind(await digest(state),user,now+600000),
  ]);
  const query=new URLSearchParams({client_id:e.GOOGLE_DRIVE_CLIENT_ID,redirect_uri:e.APP_ORIGIN+CALLBACK,response_type:'code',scope:SCOPE,access_type:'offline',prompt:'consent select_account',state});
  return 'https://accounts.google.com/o/oauth2/v2/auth?'+query;
}
async function checkResponse(response:Response){
  if(response.ok)return response;
  if(response.status===401)throw new ApiError('Google Drive access expired. Please reconnect it.',409);
  if(response.status===404)throw new ApiError('This file or folder is unavailable in Google Drive. It may have been moved to Trash or access may have changed.',404);
  if(response.status===416)throw new ApiError('The requested file range is unavailable.',416);
  if(response.status===403){
    const body=await response.json().catch(()=>({})) as {error?:{errors?:{reason?:string}[]}};
    if(body.error?.errors?.some(e=>e.reason==='storageQuotaExceeded'))throw new ApiError('Your Google Drive storage is full. Free some space and try again.',507);
    throw new ApiError('Google Drive did not allow this operation. Check access or reconnect.',403);
  }
  throw new ApiError('Google Drive could not complete the operation. Please try again.',502);
}
async function withToken(token:string,path:string,init:RequestInit={}){
  const headers=new Headers(init.headers);headers.set('Authorization','Bearer '+token);
  return checkResponse(await requestGoogle(API+path,{...init,headers}));
}
function fileLink(value:DriveFile){
  if(value.webViewLink){try{const u=new URL(value.webViewLink);if(u.protocol==='https:'&&u.hostname==='drive.google.com')return u.href;}catch{}}
  return '';
}
export async function completeConnection(user:string,url:URL){
  const e=settings(),state=url.searchParams.get('state');
  if(!state||!/^[a-f0-9]{64}$/.test(state))throw new ApiError('The connection request is invalid. Please start again.',400);
  const pending=await db().prepare('DELETE FROM drive_oauth_states WHERE hash=? AND owner=? AND expires_at>? RETURNING owner').bind(await digest(state),user,Date.now()).first();
  if(!pending)throw new ApiError('The connection request expired. Please start again.',400);
  if(url.searchParams.has('error'))throw new ApiError('Google Drive connection was cancelled.',400);
  const code=url.searchParams.get('code');if(!code)throw new ApiError('Google did not return an authorization code.',400);
  const token=await tokenRequest(new URLSearchParams({code,client_id:e.GOOGLE_DRIVE_CLIENT_ID,client_secret:e.GOOGLE_DRIVE_CLIENT_SECRET,redirect_uri:e.APP_ORIGIN+CALLBACK,grant_type:'authorization_code'}));
  if(!token.scope?.split(' ').includes(SCOPE)||!token.refresh_token)throw new ApiError('Please allow Google Drive file access and reconnect.',400);
  const about=await (await withToken(token.access_token,'/about?fields=user(permissionId,emailAddress)')).json() as {user?:{permissionId?:string;emailAddress?:string}};
  const account=about.user?.permissionId,email=about.user?.emailAddress;
  if(!account||!email)throw new ApiError('Could not verify the connected Google Drive account.',502);
  const existing=await db().prepare('SELECT id FROM archive_items WHERE owner=? AND drive_account_id IS NOT NULL AND drive_account_id!=? LIMIT 1').bind(user,account).first();
  if(existing)throw new ApiError('Reconnect the same Google account used for your saved artifacts.',409);
  const marker=await digest(e.APP_ORIGIN+':'+user);
  const q=`trashed = false and mimeType = 'application/vnd.google-apps.folder' and appProperties has { key='archiveRoot' and value='${ROOT_MARKER}' } and appProperties has { key='archiveOwner' and value='${marker}' }`;
  const found=await (await withToken(token.access_token,'/files?'+new URLSearchParams({q,fields:'files(id,webViewLink)',pageSize:'1'}))).json() as {files:DriveFile[]};
  const folder=found.files[0]||await (await withToken(token.access_token,'/files?fields=id,webViewLink',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Life Archive',mimeType:'application/vnd.google-apps.folder',appProperties:{archiveRoot:ROOT_MARKER,archiveOwner:marker}})})).json() as DriveFile;
  if(!folder.id)throw new ApiError('Could not create your archive folder.',502);
  const encrypted=await encryptToken(token.refresh_token,user);
  await db().prepare('INSERT INTO drive_connections (owner,account_id,email,refresh_token,folder_id,folder_url,updated_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT(owner) DO UPDATE SET account_id=excluded.account_id,email=excluded.email,refresh_token=excluded.refresh_token,folder_id=excluded.folder_id,folder_url=excluded.folder_url,updated_at=excluded.updated_at').bind(user,account,email,encrypted,folder.id,fileLink(folder),new Date().toISOString()).run();
}
export async function driveClient(user:string,expectedAccount?:string){
  const c=await connection(user);if(!c?.refresh_token)throw new ApiError('Connect Google Drive before saving to your archive.',409);
  if(expectedAccount&&c.account_id!==expectedAccount)throw new ApiError('Reconnect the Google account that owns this artifact.',409);
  const e=settings();let token;
  try{token=await tokenRequest(new URLSearchParams({client_id:e.GOOGLE_DRIVE_CLIENT_ID,client_secret:e.GOOGLE_DRIVE_CLIENT_SECRET,refresh_token:await decryptToken(c.refresh_token,user),grant_type:'refresh_token'}));}
  catch(error){if(error instanceof ApiError&&error.status===409)await db().prepare('UPDATE drive_connections SET refresh_token=NULL WHERE owner=? AND refresh_token=?').bind(user,c.refresh_token).run();throw error;}
  if(token.refresh_token)await db().prepare('UPDATE drive_connections SET refresh_token=? WHERE owner=? AND refresh_token=?').bind(await encryptToken(token.refresh_token,user),user,c.refresh_token).run();
  return {connection:c,token:token.access_token,fetch:(path:string,init?:RequestInit)=>withToken(token.access_token,path,init)};
}
export type DriveClient=Awaited<ReturnType<typeof driveClient>>;
export async function disconnectDrive(user:string){
  // Remove local access while keeping the account/folder identity for reconnection.
  // Files remain in Drive. Google Account settings can revoke the grant itself.
  await db().batch([db().prepare('UPDATE drive_connections SET refresh_token=NULL WHERE owner=?').bind(user),db().prepare('DELETE FROM drive_oauth_states WHERE owner=?').bind(user)]);
}
export async function uploadArtifact(client:DriveClient,id:string,details:Record<string,unknown>,file:File|null){
  const folder=await (await client.fetch('/files/'+encodeURIComponent(client.connection.folder_id)+'?fields=id,mimeType,trashed')).json() as DriveFile;
  if(folder.trashed||folder.mimeType!=='application/vnd.google-apps.folder')throw new ApiError('Your Life Archive folder is unavailable. Restore it in Google Drive or reconnect.',409);
  const blob=file||new Blob([JSON.stringify({format:'life-archive/bookmark-v1',id,...details},null,2)],{type:'application/json'});
  const mime=blob.type||'application/octet-stream';
  const metadata={name:file?.name||String(details.title).slice(0,150)+'.bookmark.json',parents:[folder.id],description:String(details.note||''),appProperties:{archiveId:id,artifactKind:String(details.kind)}};
  const start=await checkResponse(await requestGoogle(UPLOAD+'?uploadType=resumable&fields=id,webViewLink',{method:'POST',headers:{Authorization:'Bearer '+client.token,'Content-Type':'application/json','X-Upload-Content-Type':mime,'X-Upload-Content-Length':String(blob.size)},body:JSON.stringify(metadata)}));
  const location=start.headers.get('Location');let session:URL;try{session=new URL(location||'');}catch{throw new ApiError('Google Drive did not start the upload.',502);}
  if(session.origin!=='https://www.googleapis.com'||!session.pathname.startsWith('/upload/drive/v3/files'))throw new ApiError('Google Drive returned an invalid upload destination.',502);
  const response=await checkResponse(await requestGoogle(session.href,{method:'PUT',headers:{Authorization:'Bearer '+client.token,'Content-Type':mime,'Content-Length':String(blob.size)},body:blob.stream()}));
  const saved=await response.json() as DriveFile;if(!saved.id)throw new ApiError('Google Drive did not confirm the saved file.',502);
  return {id:saved.id,url:fileLink(saved),accountId:client.connection.account_id};
}
export async function updateArtifact(client:DriveClient,row:any,details:Record<string,unknown>){
  const fileId=encodeURIComponent(row.drive_file_id);
  if(row.file_name){await client.fetch('/files/'+fileId,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({description:String(details.note||''),appProperties:{artifactKind:String(details.kind)}})});return;}
  // Multipart replaces bookmark content and its name together in one Drive operation.
  const boundary='archive_'+crypto.randomUUID();
  const body=`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({name:String(details.title).slice(0,150)+'.bookmark.json',description:String(details.note||''),appProperties:{artifactKind:String(details.kind)}})}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify({format:'life-archive/bookmark-v1',id:row.id,...details},null,2)}\r\n--${boundary}--\r\n`;
  await checkResponse(await requestGoogle(UPLOAD+'/'+fileId+'?uploadType=multipart',{method:'PATCH',headers:{Authorization:'Bearer '+client.token,'Content-Type':'multipart/related; boundary='+boundary},body}));
}
export async function trashArtifact(client:DriveClient,id:string){
  try{await client.fetch('/files/'+encodeURIComponent(id),{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({trashed:true})});}
  catch(e){if(!(e instanceof ApiError&&e.status===404))throw e;}
}
