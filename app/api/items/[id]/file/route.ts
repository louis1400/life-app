import { driveClient } from '@/lib/google-drive';
import { ApiError, bucket, db, fail, owner } from '@/lib/archive-server';
export async function GET(request:Request,context:{params:Promise<{id:string}>}){try{
 const user=owner(request),{id}=await context.params;const row=await db().prepare('SELECT * FROM archive_items WHERE id=? AND owner=?').bind(id,user).first();if(!row||row.deleted||(!row.file_key&&!(row.drive_file_id&&row.file_name)))throw new ApiError('File not found.',404);
 const mime=String(row.mime||'application/octet-stream'),safe=/^(image\/(png|jpeg|gif|webp|avif)|video\/(mp4|webm|quicktime)|audio\/(mpeg|mp4|ogg|wav))$/.test(mime),download=new URL(request.url).searchParams.has('download')||!safe;
 const headers=new Headers({'Content-Type':safe?mime:'application/octet-stream','Content-Disposition':`${download?'attachment':'inline'}; filename*=UTF-8''${encodeURIComponent(String(row.file_name||'download')).replaceAll("'",'%27')}`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Accept-Ranges':'bytes'});
 if(row.drive_file_id&&(!row.sync_action||!row.file_key)){
   const client=await driveClient(user,String(row.drive_account_id));
   const upstreamHeaders=new Headers();const range=request.headers.get('range');if(range)upstreamHeaders.set('Range',range);
   const media=await client.fetch('/files/'+encodeURIComponent(String(row.drive_file_id))+'?alt=media',{headers:upstreamHeaders});
   for(const name of ['Content-Length','Content-Range']){const value=media.headers.get(name);if(value)headers.set(name,value);}
   return new Response(media.body,{status:media.status,headers});
 }
 const object=await bucket().get(String(row.file_key),{range:request.headers});if(!object)throw new ApiError('File not found.',404);
 let status=200;if(request.headers.has('range')&&object.range&&'offset' in object.range&&'length' in object.range&&object.range.length){headers.set('Content-Range',`bytes ${object.range.offset}-${object.range.offset!+object.range.length-1}/${object.size}`);headers.set('Content-Length',String(object.range.length));status=206;}else headers.set('Content-Length',String(object.size));
 return new Response(object.body,{status,headers});
 }catch(e){return fail(e);}}
