import {ApiError,db,fail,owner,validate} from '@/lib/archive-server';
import {inferKind} from '@/lib/archive';
import {digest} from '@/lib/google-drive';
export async function POST(request:Request){try{
 const user=owner(request);
 if(!request.headers.get('content-type')?.startsWith('application/json'))throw new ApiError('Choose a capture export.',415);
 const reader=request.body?.getReader();if(!reader)throw new ApiError('Choose a capture export.');
 const chunks:Uint8Array[]=[];let size=0;while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>1024*1024){await reader.cancel();throw new ApiError('Import up to 500 captures at a time.',413);}chunks.push(value);}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 const data=JSON.parse(new TextDecoder().decode(bytes));
 if(data?.format!=='life-archive/captures-v1'||!Array.isArray(data.records)||data.records.length<1||data.records.length>500)throw new ApiError('Choose a Life Archive capture export with 1–500 items.');
 const statements=[];
 for(const record of data.records){
  if(!record||typeof record.driveFileId!=='string'||!/^[a-zA-Z0-9_-]{10,200}$/.test(record.driveFileId)||typeof record.folder!=='string'||record.folder.length>200)throw new ApiError('The export contains invalid Drive file details.');
  const value=validate({title:record.title,url:record.url,kind:inferKind(record.url),note:'',tags:record.tags,destinations:[]});
  if(!value.url)throw new ApiError('An imported capture must have a source link.');
  const id='capture-'+await digest(user+':'+record.driveFileId),now=new Date().toISOString();
  const created=typeof record.savedAt==='string'&&Number.isFinite(Date.parse(record.savedAt))?new Date(record.savedAt).toISOString():now;
  statements.push(db().prepare("INSERT INTO archive_items (id,owner,title,url,kind,note,tags,destinations,created_at,updated_at,source_file_url,source_folder) SELECT ?,?,?,?,?,'',?,'[]',?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM archive_items WHERE owner=? AND url=? AND deleted=0) ON CONFLICT(id) DO NOTHING")
   .bind(id,user,value.title,value.url,value.kind,JSON.stringify(value.tags),created,now,'https://drive.google.com/file/d/'+record.driveFileId+'/view',record.folder,user,value.url));
 }
 const results=await db().batch(statements),imported=results.reduce((sum,r)=>sum+(r.meta.changes||0),0);
 return Response.json({imported,skipped:data.records.length-imported},{headers:{'Cache-Control':'private, no-store'}});
}catch(error){if(error instanceof SyntaxError)return fail(new ApiError('This is not a valid capture export.'));return fail(error);}}
