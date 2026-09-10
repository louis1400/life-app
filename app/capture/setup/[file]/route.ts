import code from '@/integrations/drive-capture/Code.gs?raw';
import capture from '@/integrations/drive-capture/Capture.html?raw';
export async function GET(_request:Request,context:{params:Promise<{file:string}>}){
 const {file}=await context.params;const text=file==='Code.gs.txt'?code:file==='Capture.html.txt'?capture:null;
 return text===null?new Response('Not found',{status:404}):new Response(text,{headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'}});
}
