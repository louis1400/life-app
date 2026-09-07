import { ApiError, bucket, db, fail, owner, serialize, validate } from '@/lib/archive-server';
export async function GET(request:Request){try{const user=owner(request);const rows=await db().prepare('SELECT * FROM archive_items WHERE owner=? ORDER BY created_at DESC').bind(user).all();return Response.json({items:rows.results.map(serialize)},{headers:{'Cache-Control':'private, no-store'}});}catch(e){return fail(e);}}
export async function POST(request:Request){
 let key:string|null=null;
 try{
  const user=owner(request);
  if(Number(request.headers.get('content-length'))>27*1024*1024)throw new ApiError('Upload files up to 25 MB.',413);
  const form=await request.formData();let raw;try{raw=JSON.parse(String(form.get('details')));}catch{throw new ApiError('Could not read this item. Please try again.');}
  const value=validate(raw),upload=form.get('file'),file=upload instanceof File&&upload.size>0?upload:null;
  if(!value.url&&!file)throw new ApiError('Add a link or choose a file.');
  if(file&&file.size>25*1024*1024)throw new ApiError('Upload files up to 25 MB.',413);
  if(value.url){const duplicate=await db().prepare('SELECT id FROM archive_items WHERE owner=? AND url=? LIMIT 1').bind(user,value.url).first();if(duplicate)return Response.json({error:'This link is already in your archive.',duplicateId:duplicate.id},{status:409});}
  const id=crypto.randomUUID(),now=new Date().toISOString();let content='';
  if(file){key=user+'/'+id;await bucket().put(key,file.stream(),{httpMetadata:{contentType:file.type||'application/octet-stream'}});if((file.type==='text/plain'||/\.(txt|md)$/i.test(file.name))&&file.size<500000)content=(await file.text()).slice(0,100000);}
  await db().prepare('INSERT INTO archive_items (id,owner,title,url,kind,note,tags,destinations,file_key,file_name,mime,size,content,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(id,user,value.title,value.url,value.kind,value.note,JSON.stringify(value.tags),JSON.stringify(value.destinations),key,file?.name||null,file?.type||null,file?.size||0,content,now,now).run();
  key=null;const row=await db().prepare('SELECT * FROM archive_items WHERE id=? AND owner=?').bind(id,user).first();return Response.json({item:serialize(row)},{status:201});
 }catch(e){if(key){try{await bucket().delete(key);}catch(cleanup){console.error('Upload cleanup failed',cleanup);}}return fail(e);}
}
