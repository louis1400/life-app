import { ApiError, bucket, db, serialize } from './archive-server';
import { driveClient, reserveFileId, trashArtifact, updateArtifact, uploadArtifact, type UploadFile } from './google-drive';
export async function archiveRow(user:string,id:string) {
  return db().prepare('SELECT * FROM archive_items WHERE owner=? AND id=?').bind(user,id).first<any>();
}
// The row is the durable operation record. Pending operations cannot be replaced.
export async function syncItem(user:string,id:string) {
  const token=crypto.randomUUID(), now=Date.now();
  const claimed=await db().prepare("UPDATE archive_items SET sync_token=?,sync_until=? WHERE owner=? AND id=? AND sync_action!='' AND sync_until<? RETURNING *")
    .bind(token,now+600000,user,id,now).first<any>();
  if(!claimed)return archiveRow(user,id);
  try {
    if(claimed.sync_action==='delete') {
      if(claimed.drive_file_id)await trashArtifact(await driveClient(user,claimed.drive_account_id),claimed.drive_file_id);
      if(claimed.file_key)await bucket().delete(claimed.file_key);
    } else {
      const client=await driveClient(user,claimed.drive_account_id||undefined);
      if(claimed.sync_action==='create') {
        if(!claimed.drive_file_id) {
          const reserved=await reserveFileId(client);
          const reservedRow=await db().prepare('UPDATE archive_items SET drive_file_id=?,drive_account_id=? WHERE owner=? AND id=? AND sync_token=? RETURNING id').bind(reserved,client.connection.account_id,user,id,token).first();
          if(!reservedRow)throw new ApiError('This save is already being recovered. Refresh Vault.',409);
          claimed.drive_file_id=reserved;
        }
        let file:UploadFile|null=null;
        if(claimed.file_key){
          const object=await bucket().get(claimed.file_key);
          if(!object)throw new ApiError('The saved upload is unavailable. Keep this item while its file is recovered.',503);
          file={name:claimed.file_name,type:claimed.mime||'application/octet-stream',size:object.size,stream:()=>object.body};
        }
        const {title,url,kind,note,tags,destinations,createdAt,updatedAt}=serialize(claimed);
        const saved=await uploadArtifact(client,id,{title,url,kind,note,tags,destinations,createdAt,updatedAt},file,claimed.drive_file_id);
        await db().prepare('UPDATE archive_items SET drive_url=? WHERE owner=? AND id=? AND sync_token=?').bind(saved.url,user,id,token).run();
      } else if(claimed.drive_file_id){const {title,url,kind,note,tags,destinations,createdAt,updatedAt}=serialize(claimed);await updateArtifact(client,claimed,{title,url,kind,note,tags,destinations,createdAt,updatedAt});}
    }
    // Keep tombstones so deletion is safe to retry after losing the response.
    await db().prepare("UPDATE archive_items SET sync_action='',sync_error='',sync_token=NULL,sync_until=0 WHERE owner=? AND id=? AND sync_token=?").bind(user,id,token).run();
    if(claimed.file_key&&claimed.sync_action==='create'){
      await bucket().delete(claimed.file_key);
      await db().prepare("UPDATE archive_items SET file_key=NULL WHERE owner=? AND id=? AND file_key=? AND sync_action=''").bind(user,id,claimed.file_key).run();
    }
  } catch(error) {
    const message=error instanceof ApiError?error.message:'Drive could not be updated. Your change is kept in Vault; retry the Drive update.';
    await db().prepare('UPDATE archive_items SET sync_error=?,sync_token=NULL,sync_until=0 WHERE owner=? AND id=? AND sync_token=?').bind(message,user,id,token).run();
  }
  return archiveRow(user,id);
}
export function operationResult(row:any,status=200){
  return Response.json({item:serialize(row),pending:!!row.sync_action},{status:row.sync_action?202:status,headers:{'Cache-Control':'private, no-store'}});
}
export function requireOperation(raw:any): asserts raw is {version:number;operationId:string} {
  if(!Number.isSafeInteger(raw?.version)||raw.version<1||typeof raw?.operationId!=='string'||!/^[a-f0-9-]{36}$/i.test(raw.operationId))throw new ApiError('Reload this item before saving your changes.',428);
}
