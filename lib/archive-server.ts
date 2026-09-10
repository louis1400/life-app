import { env } from "cloudflare:workers";
import { destinations, kinds, normalizeUrl } from "./archive";
export function db(){if(!env.DB)throw new Error('Database unavailable');return env.DB;}
export function bucket(){if(!env.BUCKET)throw new Error('File storage unavailable');return env.BUCKET;}
export class ApiError extends Error{constructor(message:string,public status=400){super(message);}}
export function owner(request:Request){
 const id=request.headers.get('oai-authenticated-user-id');
 if(!id)throw new ApiError('Please sign in to open your archive.',401);
 if(!['GET','HEAD'].includes(request.method)){const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)throw new ApiError('This request is not allowed.',403);}
 return id;
}
export function fail(e:unknown){if(e instanceof ApiError)return Response.json({error:e.message},{status:e.status});console.error('Archive operation failed',e);return Response.json({error:'Your archive is temporarily unavailable. Please try again; your unsaved input is still here.'},{status:503});}
export function serialize(row:any){return {sourceFileUrl:row.source_file_url||null, sourceFolder:row.source_folder||null, version:row.version, syncPending:!!row.sync_action, syncError:row.sync_error||'', id:row.id,title:row.title,url:row.url,kind:row.kind,note:row.note,tags:JSON.parse(row.tags),destinations:JSON.parse(row.destinations),fileName:row.file_name,mime:row.mime,size:row.size,content:row.content,createdAt:row.created_at,updatedAt:row.updated_at,hasFile:!!row.file_key||!!(row.drive_file_id&&row.file_name),storage:row.source_file_url?"external-drive":(row.drive_file_id||row.sync_action==='create')?"google-drive":"legacy",driveUrl:row.drive_url||null};}
export function validate(raw:any){
 if(!raw||typeof raw!=='object')throw new ApiError('Please enter item details.');
 const title=typeof raw.title==='string'?raw.title.trim():'';
 if(!title||title.length>300)throw new ApiError('Add a title of up to 300 characters.');
 if(!kinds.includes(raw.kind))throw new ApiError('Choose a valid content type.');
 const note=typeof raw.note==='string'?raw.note.trim():'';
 if(note.length>20000)throw new ApiError('Keep your note under 20,000 characters.');
 if(!Array.isArray(raw.tags)||raw.tags.length>30||raw.tags.some((x:any)=>typeof x!=='string'||x.length>60))throw new ApiError('Use up to 30 tags, each under 60 characters.');
 if(!Array.isArray(raw.destinations)||raw.destinations.some((x:any)=>!destinations.includes(x)))throw new ApiError('Choose a listed collection.');
 let url='';try{url=normalizeUrl(raw.url||'');}catch{throw new ApiError('Enter a valid http or https link.');}
 return {title,url,kind:raw.kind,note,tags:[...new Set(raw.tags.map((x:string)=>x.trim()).filter(Boolean))],destinations:[...new Set(raw.destinations)]};
}

export async function uploadForm(request:Request){
 const max=27*1024*1024;if(Number(request.headers.get('content-length'))>max)throw new ApiError('Upload files up to 25 MB.',413);
 if(!request.body)throw new ApiError('Choose a link or file.');let size=0;
 const stream=request.body.pipeThrough(new TransformStream<Uint8Array,Uint8Array>({transform(chunk,controller){size+=chunk.byteLength;if(size>max)throw new ApiError('Upload files up to 25 MB.',413);controller.enqueue(chunk);}}));
 return new Response(stream,{headers:{'Content-Type':request.headers.get('content-type')||''}}).formData();
}
