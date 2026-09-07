import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile, readdir, mkdir, rm } from 'node:fs/promises';
import { build } from 'esbuild';
import { Miniflare } from 'miniflare';

const SCOPE='https://www.googleapis.com/auth/drive.file';
const origin='https://archive.test';
function mockGoogle(){
 const files=new Map(),sessions=new Map();let next=1,account='google-a',tokenRevoked=false,quota=false,evilSession=false,folderCreated=false;
 const folder={id:'archive-folder',webViewLink:'https://drive.google.com/drive/folders/archive-folder',mimeType:'application/vnd.google-apps.folder',trashed:false};
 const mock={files,folder,get account(){return account;},set account(v){account=v;},set revoked(v){tokenRevoked=v;},set quota(v){quota=v;},set evilSession(v){evilSession=v;},
 async fetch(request){
  const u=new URL(request.url),method=request.method;
  if(u.origin==='https://oauth2.googleapis.com'&&u.pathname==='/token'){
   const form=new URLSearchParams(await request.text());
   if(form.get('grant_type')==='refresh_token'){
    if(tokenRevoked)return Response.json({error:'invalid_grant'},{status:400});
    assert.equal(form.get('refresh_token'),'test-refresh-token');
    return Response.json({access_token:'test-access-token'});
   }
   assert.equal(form.get('client_secret'),'test-client-secret');
   return Response.json({access_token:'test-access-token',refresh_token:'test-refresh-token',scope:SCOPE});
  }
  assert.equal(u.origin,'https://www.googleapis.com','No credentials or file data may leave Google endpoints');
  assert.equal(request.headers.get('authorization'),'Bearer test-access-token');
  if(u.pathname==='/drive/v3/about')return Response.json({user:{permissionId:account,emailAddress:account+'@example.org'}});
  if(u.pathname==='/drive/v3/files'&&method==='GET')return Response.json({files:folderCreated?[folder]:[]});
  if(u.pathname==='/drive/v3/files'&&method==='POST'){const data=await request.json();assert.equal(data.name,'Life Archive');assert.equal(data.appProperties.archiveRoot,'life-archive-v1');assert.equal(folderCreated,false,'Reconnect must reuse the folder');folderCreated=true;return Response.json(folder);}
  if(u.pathname==='/drive/v3/files/archive-folder'&&method==='GET')return Response.json(folder);
  if(u.pathname==='/upload/drive/v3/files'&&method==='POST'){
   if(quota)return Response.json({error:{errors:[{reason:'storageQuotaExceeded'}]}},{status:403});
   const metadata=await request.json();assert.deepEqual(metadata.parents,['archive-folder']);
   const id='file-'+next++;sessions.set(id,metadata);
   return new Response(null,{status:200,headers:{Location:evilSession?'https://evil.test/steal':'https://www.googleapis.com/upload/drive/v3/files?upload_id='+id}});
  }
  if(u.pathname==='/upload/drive/v3/files'&&method==='PUT'){
   const id=u.searchParams.get('upload_id');assert.ok(sessions.has(id));files.set(id,{...sessions.get(id),bytes:new Uint8Array(await request.arrayBuffer()),trashed:false});
   return Response.json({id,webViewLink:'https://drive.google.com/file/d/'+id+'/view'});
  }
  if(u.pathname.startsWith('/upload/drive/v3/files/')&&method==='PATCH'){
   const id=u.pathname.split('/').at(-1),body=await request.text();assert.ok(files.has(id));files.get(id).updatedBody=body;return Response.json({id});
  }
  if(u.pathname.startsWith('/drive/v3/files/')){
   const id=u.pathname.split('/').at(-1),file=files.get(id);if(!file)return new Response(null,{status:404});
   if(method==='PATCH'){Object.assign(file,await request.json());return Response.json({id});}
   if(u.searchParams.get('alt')==='media'){
    if(file.trashed)return new Response(null,{status:404});
    const range=request.headers.get('range');
    if(range){const [,a,b]=/bytes=(\d+)-(\d+)/.exec(range);const bytes=file.bytes.slice(Number(a),Number(b)+1);return new Response(bytes,{status:206,headers:{'Content-Range':`bytes ${a}-${b}/${file.bytes.length}`,'Content-Length':String(bytes.length)}});}
    return new Response(file.bytes,{headers:{'Content-Length':String(file.bytes.length)}});
   }
  }
  throw new Error('Unexpected Google operation '+method+' '+u.pathname);
 }};
 return mock;
}
async function setup(name,configured=true){
 await mkdir('work',{recursive:true});const out='work/'+name+'.mjs';
 await build({stdin:{contents:`import * as collection from './app/api/items/route'; import * as item from './app/api/items/[id]/route'; import * as file from './app/api/items/[id]/file/route'; import * as drive from './app/api/drive/route'; import * as connect from './app/api/drive/connect/route'; import * as callback from './app/api/drive/callback/route'; export default {fetch(request){const p=new URL(request.url).pathname.split('/');const api=p[2]==='drive'?(p[3]==='connect'?connect:p[3]==='callback'?callback:drive):p.length>4?file:p.length>3?item:collection;return api[request.method](request,{params:Promise.resolve({id:p[3]})});}}`,resolveDir:process.cwd(),sourcefile:'test-worker.ts'},bundle:true,platform:'browser',format:'esm',external:['cloudflare:workers'],outfile:out});
 const mock=mockGoogle();
 const mf=new Miniflare({modules:true,scriptPath:out,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],r2Buckets:['BUCKET'],bindings:configured?{APP_ORIGIN:origin,GOOGLE_DRIVE_CLIENT_ID:'test-client-id',GOOGLE_DRIVE_CLIENT_SECRET:'test-client-secret',GOOGLE_DRIVE_TOKEN_KEY:'a'.repeat(64)}:{},outboundService:mock.fetch});
 const db=await mf.getD1Database('DB');
 for(const migration of (await readdir('drizzle')).filter(n=>n.endsWith('.sql')).sort())for(const statement of (await readFile('drizzle/'+migration,'utf8')).split('--> statement-breakpoint'))await db.prepare(statement.trim()).run();
 const request=async(path,init={},user='owner-a')=>{const r=new Request(origin+path,{...init,headers:{...(user?{'oai-authenticated-user-id':user}:{}),...init.headers}});return mf.dispatchFetch(r.url,{method:r.method,headers:Object.fromEntries(r.headers),body:r.body?await r.arrayBuffer():undefined,redirect:'manual'});};
 async function start(){const r=await request('/api/drive/connect',{method:'POST',headers:{Origin:origin}});assert.equal(r.status,303);const u=new URL(r.headers.get('Location'));assert.equal(u.origin,'https://accounts.google.com');assert.equal(u.searchParams.get('scope'),SCOPE);return u.searchParams.get('state');}
 async function connect(){const state=await start();const response=await request('/api/drive/callback?code=code&state='+state);assert.equal(response.headers.get('Location'),'/?drive=connected');return state;}
 return {mf,db,mock,request,start,connect,async dispose(){await mf.dispose();await rm(out,{force:true});}};
}
const details={title:'Hume reading',url:'https://example.org/hume',kind:'Article',note:'For philosophy',tags:['hume'],destinations:['Reading','Study']};
function form(value,upload){const f=new FormData();f.set('details',JSON.stringify(value));if(upload)f.set('file',upload,'notes.txt');return f;}

test('Drive OAuth state, encrypted grants, account binding, revocation and setup states',async()=>{
 const x=await setup('drive-auth-test');const{request,db,mock}=x;
 try{
  assert.equal((await request('/api/drive',{},null)).status,401);
  assert.equal((await request('/api/drive/connect',{method:'POST',headers:{Origin:'https://evil.test'}})).status,403);
  assert.equal((await request('/api/items',{method:'POST',body:form(details)})).status,409);
  const state=await x.start();
  assert.match((await request('/api/drive/callback?state='+state+'&code=x',{},'owner-b')).headers.get('Location'),/drive_error=/);
  assert.match((await request('/api/drive/callback?state=bad&code=x')).headers.get('Location'),/drive_error=/);
  assert.equal((await request('/api/drive/callback?state='+state+'&code=x')).headers.get('Location'),'/?drive=connected');
  assert.match((await request('/api/drive/callback?state='+state+'&code=x')).headers.get('Location'),/drive_error=/,'State cannot be reused');
  const stored=await db.prepare('SELECT * FROM drive_connections WHERE owner=?').bind('owner-a').first();assert.ok(stored.refresh_token&&!stored.refresh_token.includes('test-refresh-token'));
  const status=await (await request('/api/drive')).json();assert.equal(status.connected,true);assert.equal(status.email,'google-a@example.org');assert.ok(!JSON.stringify(status).includes('token'));
  const expired=await x.start();await db.prepare('UPDATE drive_oauth_states SET expires_at=0').run();assert.match((await request('/api/drive/callback?state='+expired+'&code=x')).headers.get('Location'),/drive_error=/);
  const cancelled=await x.start();assert.match((await request('/api/drive/callback?state='+cancelled+'&error=access_denied')).headers.get('Location'),/cancelled/);
  const item=await request('/api/items',{method:'POST',body:form(details)});assert.equal(item.status,201);
  mock.account='google-b';const other=await x.start();assert.match((await request('/api/drive/callback?state='+other+'&code=x')).headers.get('Location'),/same%20Google%20account/);mock.account='google-a';
  mock.revoked=true;assert.equal((await request('/api/items',{method:'POST',body:form({...details,url:'https://example.org/new'})})).status,409);assert.equal((await (await request('/api/drive')).json()).connected,false);mock.revoked=false;
  await x.connect();assert.equal((await request('/api/drive',{method:'DELETE'})).status,200);assert.equal((await (await request('/api/drive')).json()).connected,false);assert.equal([...mock.files.values()][0].trashed,false);
 }finally{await x.dispose();}
 const y=await setup('drive-unconfigured-test',false);try{const status=await(await y.request('/api/drive')).json();assert.equal(status.configured,false);assert.equal((await y.request('/api/drive/connect',{method:'POST',headers:{Origin:origin}})).status,503);}finally{await y.dispose();}
});

test('Drive saves original bytes and bookmarks, scopes access, handles errors, and keeps legacy files usable',async()=>{
 const x=await setup('drive-storage-test');const{request,db,mock}=x;
 try{
  await x.connect();
  let response=await request('/api/items',{method:'POST',body:form(details)});assert.equal(response.status,201,await response.clone().text());const saved=(await response.json()).item;assert.equal(saved.storage,'google-drive');assert.equal(saved.hasFile,false);
  const bookmark=[...mock.files.values()][0];assert.equal(JSON.parse(new TextDecoder().decode(bookmark.bytes)).url,details.url);
  assert.equal((await(await request('/api/items',{},'owner-b')).json()).items.length,0);
  assert.equal((await request('/api/items/'+saved.id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(details)},'owner-b')).status,404);
  assert.equal((await request('/api/items',{method:'POST',body:form(details)})).status,409);
  assert.equal((await request('/api/items',{method:'POST',body:form({...details,url:'javascript:alert(1)'})})).status,400);
  assert.equal((await request('/api/items',{method:'POST',headers:{Origin:'https://elsewhere.test'},body:form(details)})).status,403);
  response=await request('/api/items/'+saved.id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({...details,title:'Updated reading',destinations:[]})});assert.equal(response.status,200);assert.deepEqual((await response.json()).item.destinations,[]);assert.match(bookmark.updatedBody,/Updated reading/);
  response=await request('/api/items',{method:'POST',body:form({...details,url:'',kind:'Document',title:'My text'},new Blob(['A preserved text file.'],{type:'text/plain'}))});assert.equal(response.status,201,await response.clone().text());const uploaded=(await response.json()).item;assert.equal(uploaded.content,'A preserved text file.');assert.equal(uploaded.hasFile,true);
  assert.equal((await request('/api/items/'+uploaded.id+'/file',{},'owner-b')).status,404);
  response=await request('/api/items/'+uploaded.id+'/file');assert.equal(response.status,200);assert.match(response.headers.get('content-disposition'),/^attachment/);assert.equal(await response.text(),'A preserved text file.');
  response=await request('/api/items/'+uploaded.id+'/file',{headers:{Range:'bytes=2-6'}});assert.equal(response.status,206);assert.equal(await response.text(),'prese');
  mock.quota=true;response=await request('/api/items',{method:'POST',body:form({...details,url:'https://example.org/quota'})});assert.equal(response.status,507);mock.quota=false;
  mock.evilSession=true;response=await request('/api/items',{method:'POST',body:form({...details,url:'https://example.org/evil'})});assert.equal(response.status,502);mock.evilSession=false;
  mock.folder.trashed=true;assert.equal((await request('/api/items',{method:'POST',body:form({...details,url:'https://example.org/folder'})})).status,409);mock.folder.trashed=false;
  // Inject a database failure after a confirmed upload; the Drive artifact must be trashed.
  await db.prepare("CREATE TRIGGER fail_test_insert BEFORE INSERT ON archive_items WHEN NEW.title='Fail insert' BEGIN SELECT RAISE(FAIL,'test failure'); END").run();
  assert.equal((await request('/api/items',{method:'POST',body:form({...details,title:'Fail insert',url:'https://example.org/fail'})})).status,503);assert.equal([...mock.files.values()].at(-1).trashed,true);await db.prepare('DROP TRIGGER fail_test_insert').run();
  assert.equal((await request('/api/items/'+uploaded.id,{method:'DELETE'})).status,200);assert.equal((await request('/api/items/'+uploaded.id+'/file')).status,404);
  assert.equal((await request('/api/items/'+saved.id,{method:'DELETE'},'owner-b')).status,404);assert.equal((await request('/api/items/'+saved.id,{method:'DELETE'})).status,200);assert.equal(bookmark.trashed,true);
  // Pre-existing R2 files survive the additive schema migration and a disconnected Drive.
  const bucket=await x.mf.getR2Bucket('BUCKET');await bucket.put('legacy-file','legacy bytes');
  await db.prepare("INSERT INTO archive_items (id,owner,title,kind,file_key,file_name,mime,created_at,updated_at) VALUES ('legacy','owner-a','Legacy','Document','legacy-file','legacy.txt','text/plain','2026-01-01','2026-01-01')").run();await request('/api/drive',{method:'DELETE'});
  response=await request('/api/items/legacy/file');assert.equal(response.status,200);assert.equal(await response.text(),'legacy bytes');
  assert.equal((await request('/api/items/legacy',{method:'DELETE'})).status,200);
 }finally{await x.dispose();}
});
