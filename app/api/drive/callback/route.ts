import { completeConnection } from '@/lib/google-drive';
import { ApiError, owner } from '@/lib/archive-server';
export async function GET(request:Request){
  try{await completeConnection(owner(request),new URL(request.url));return new Response(null,{status:303,headers:{Location:'/vault?drive=connected','Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});}
  catch(error){const message=error instanceof ApiError?error.message:'Google Drive connection failed. Please try again.';return new Response(null,{status:303,headers:{Location:'/vault?drive_error='+encodeURIComponent(message),'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});}
}
