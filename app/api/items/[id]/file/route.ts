import { ApiError, bucket, db, fail, owner } from '@/lib/archive-server';
export async function GET(request:Request,context:{params:Promise<{id:string}>}){try{
 const user=owner(request),{id}=await context.params;const row=await db().prepare('SELECT * FROM archive_items WHERE id=? AND owner=?').bind(id,user).first();if(!row?.file_key)throw new ApiError('File not found.',404);
 const object=await bucket().get(String(row.file_key),{range:request.headers});if(!object)throw new ApiError('File not found.',404);
 const mime=String(row.mime||'application/octet-stream'),safe=/^(image\/(png|jpeg|gif|webp|avif)|video\/(mp4|webm|quicktime)|audio\/(mpeg|mp4|ogg|wav))$/.test(mime),download=new URL(request.url).searchParams.has('download')||!safe;
 const headers=new Headers({'Content-Type':safe?mime:'application/octet-stream','Content-Disposition':`${download?'attachment':'inline'}; filename*=UTF-8''${encodeURIComponent(String(row.file_name||'download')).replaceAll("'",'%27')}`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Accept-Ranges':'bytes'});
 let status=200;if(request.headers.has('range')&&object.range&&'offset' in object.range&&'length' in object.range&&object.range.length){headers.set('Content-Range',`bytes ${object.range.offset}-${object.range.offset!+object.range.length-1}/${object.size}`);headers.set('Content-Length',String(object.range.length));status=206;}else headers.set('Content-Length',String(object.size));
 return new Response(object.body,{status,headers});
 }catch(e){return fail(e);}}
