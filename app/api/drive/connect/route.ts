import { fail, owner } from '@/lib/archive-server';
import { beginConnection } from '@/lib/google-drive';
export async function POST(request:Request){try{return Response.redirect(await beginConnection(owner(request),request),303);}catch(e){return fail(e);}}
