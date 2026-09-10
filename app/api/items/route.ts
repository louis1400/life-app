import { ApiError, bucket, db, fail, owner, serialize, validate, uploadForm } from '@/lib/archive-server';
import { connection, digest } from '@/lib/google-drive';
import { archiveRow, operationResult, syncItem } from '@/lib/archive-sync';
export async function GET(request:Request){try{
 const user=owner(request);const rows=await db().prepare('SELECT * FROM archive_items WHERE owner=? AND deleted=0 ORDER BY created_at DESC').bind(user).all();
 const pending=await db().prepare("SELECT id,title,sync_error AS error,deleted FROM archive_items WHERE owner=? AND sync_action!='' ORDER BY created_at LIMIT 100").bind(user).all();
 return Response.json({items:rows.results.map(serialize),pending:pending.results},{headers:{'Cache-Control':'private, no-store'}});
}catch(e){return fail(e);}}
export async function POST(request:Request){try{
 const user=owner(request);
 if(Number(request.headers.get('content-length'))>27*1024*1024)throw new ApiError('Upload files up to 25 MB.',413);
 const form=await uploadForm(request);let raw;try{raw=JSON.parse(String(form.get('details')));}catch{throw new ApiError('Could not read this item. Please try again.');}
 const value=validate(raw),upload=form.get('file'),file=upload instanceof File&&upload.size>0?upload:null;
 const id=String(form.get('requestId')||'');if(!/^[a-f0-9-]{36}$/i.test(id))throw new ApiError('Reload the save form and try again.',428);
 if(!value.url&&!file)throw new ApiError('Add a link or choose a file.');
 if(file&&file.size>25*1024*1024)throw new ApiError('Upload files up to 25 MB.',413);
 const bytes=file?await file.arrayBuffer():null;
 const fileHash=bytes?Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join(''):'';
 const hash=await digest(JSON.stringify({value,fileName:file?.name,mime:file?.type,fileHash}));
 const old=await archiveRow(user,id);
 if(old){if(old.create_hash!==hash||old.deleted)throw new ApiError('This save was already used. Start a new item to save different details.',409);return operationResult(old.sync_action?await syncItem(user,id):old);}
 const c=await connection(user);if(!c?.refresh_token)throw new ApiError('Connect Google Drive before saving. Your draft is kept here.',409);
 const now=new Date().toISOString();let content='';
 if(file&&(file.type==='text/plain'||/\.(txt|md)$/i.test(file.name))&&file.size<500000)content=new TextDecoder().decode(bytes!).slice(0,100000);
 const key=file?'archive-staging/'+crypto.randomUUID():null;
 if(key)await bucket().put(key,bytes!);
 // Do not clean up after an ambiguous D1 transport failure: the insert may have committed.
 const inserted=await db().prepare("INSERT INTO archive_items (id,owner,title,url,kind,note,tags,destinations,file_key,file_name,mime,size,content,created_at,updated_at,drive_account_id,create_hash,operation_id,sync_action) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'create' WHERE NOT EXISTS (SELECT 1 FROM archive_items WHERE owner=? AND url=? AND url!='' AND deleted=0) ON CONFLICT(id) DO NOTHING RETURNING id")
 .bind(id,user,value.title,value.url,value.kind,value.note,JSON.stringify(value.tags),JSON.stringify(value.destinations),key,file?.name||null,file?.type||null,file?.size||0,content,now,now,c.account_id,hash,id,user,value.url).first();
 if(!inserted){
   if(key)await bucket().delete(key);
   const concurrent=await archiveRow(user,id);
   if(concurrent){if(concurrent.create_hash!==hash||concurrent.deleted)throw new ApiError('This save was already used for different details.',409);return operationResult(concurrent);}
   const duplicate=await db().prepare('SELECT id FROM archive_items WHERE owner=? AND url=? AND deleted=0 LIMIT 1').bind(user,value.url).first<any>();
   return Response.json({error:'This link is already in your archive.',duplicateId:duplicate?.id},{status:409});
 }
 return operationResult(await syncItem(user,id),201);
}catch(e){return fail(e);}}
