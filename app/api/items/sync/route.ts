import { ApiError, db, fail, owner } from '@/lib/archive-server';
import { syncItem } from '@/lib/archive-sync';
export async function POST(request:Request){try{
 const user=owner(request),{id}=await request.json() as {id?:unknown};if(typeof id!=='string')throw new ApiError('Choose a pending item.');
 await syncItem(user,id);
 const row=await db().prepare('SELECT sync_action FROM archive_items WHERE id=? AND owner=?').bind(id,user).first<any>();
 return Response.json({pending:!!row?.sync_action});
}catch(e){return fail(e);}}
