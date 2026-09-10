import { fail, owner } from '@/lib/archive-server';
import { digest } from '@/lib/google-drive';
export async function GET(request:Request){try{
 return Response.json({draftScope:await digest(owner(request))},{headers:{'Cache-Control':'private, no-store'}});
}catch(error){return fail(error);}}
