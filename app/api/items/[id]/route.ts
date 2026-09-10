import { ApiError, db, fail, owner, serialize, validate } from '@/lib/archive-server';
import { archiveRow, operationResult, requireOperation, syncItem } from '@/lib/archive-sync';
type Context={params:Promise<{id:string}>};
export async function GET(request:Request,context:Context){try{const row=await archiveRow(owner(request),(await context.params).id);if(!row||row.deleted)throw new ApiError('Item not found.',404);return Response.json({item:serialize(row)},{headers:{'Cache-Control':'private, no-store'}});}catch(e){return fail(e);}}
export async function PATCH(request:Request,context:Context){try{
 const user=owner(request),{id}=await context.params,raw=await request.json();requireOperation(raw);const value=validate(raw);
 const old=await archiveRow(user,id);if(!old||old.deleted)throw new ApiError('Item not found.',404);
 if(old.operation_id===raw.operationId){if(JSON.stringify(validate(serialize(old)))!==JSON.stringify(value))throw new ApiError('This retry has different details. Start a new save.',409);return operationResult(old.sync_action?await syncItem(user,id):old);}
 if(!value.url&&!old.file_key&&!old.file_name)throw new ApiError('A bookmarked item needs a source link.');
 const row=await db().prepare("UPDATE archive_items SET title=?,url=?,kind=?,note=?,tags=?,destinations=?,updated_at=?,version=version+1,operation_id=?,sync_action=CASE WHEN drive_file_id IS NULL THEN '' ELSE 'update' END,sync_error='' WHERE id=? AND owner=? AND version=? AND deleted=0 AND sync_action='' AND NOT EXISTS (SELECT 1 FROM archive_items other WHERE other.owner=? AND other.url=? AND other.url!='' AND other.id!=? AND other.deleted=0) RETURNING *")
 .bind(value.title,value.url,value.kind,value.note,JSON.stringify(value.tags),JSON.stringify(value.destinations),new Date().toISOString(),raw.operationId,id,user,raw.version,user,value.url,id).first<any>();
 if(!row)throw new ApiError('This item changed, has a pending Drive update, or this link is already saved. Your draft is kept; reload the latest item before trying again.',409);
 return operationResult(row.sync_action?await syncItem(user,id):row);
}catch(e){return fail(e);}}
export async function DELETE(request:Request,context:Context){try{
 const user=owner(request),{id}=await context.params,raw=await request.json();requireOperation(raw);
 const old=await archiveRow(user,id);if(!old)throw new ApiError('Item not found.',404);
 if(old.operation_id===raw.operationId&&old.deleted)return operationResult(old.sync_action?await syncItem(user,id):old);
 const row=await db().prepare("UPDATE archive_items SET deleted=1,version=version+1,operation_id=?,sync_action='delete',sync_error='' WHERE owner=? AND id=? AND version=? AND deleted=0 AND sync_action='' RETURNING *").bind(raw.operationId,user,id,raw.version).first();
 if(!row)throw new ApiError('This item changed or has a pending Drive update. Reload it before deleting.',409);
 return operationResult(await syncItem(user,id));
}catch(e){return fail(e);}}
