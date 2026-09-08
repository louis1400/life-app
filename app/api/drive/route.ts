import { fail, owner } from '@/lib/archive-server';
import { disconnectDrive, driveStatus } from '@/lib/google-drive';
export async function GET(request:Request){try{return Response.json(await driveStatus(owner(request)),{headers:{'Cache-Control':'private, no-store'}});}catch(e){return fail(e);}}
export async function DELETE(request:Request){try{await disconnectDrive(owner(request));return Response.json({ok:true});}catch(e){return fail(e);}}
