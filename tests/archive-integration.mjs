import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile, mkdir, rm } from 'node:fs/promises';
import { build } from 'esbuild';
import { Miniflare } from 'miniflare';

test('Archive persistence, ownership, file preservation and validation',async()=>{
 await mkdir('work',{recursive:true});
 const out='work/archive-test-worker.mjs';
 await build({stdin:{contents:`import * as collection from './app/api/items/route'; import * as item from './app/api/items/[id]/route'; import * as file from './app/api/items/[id]/file/route'; export default {fetch(request){const p=new URL(request.url).pathname.split('/');const api=p.length>4?file:p.length>3?item:collection;return api[request.method](request,{params:Promise.resolve({id:p[3]})});}}`,resolveDir:process.cwd(),sourcefile:'test-worker.ts'},bundle:true,platform:'browser',format:'esm',external:['cloudflare:workers'],outfile:out});
 const mf=new Miniflare({modules:true,scriptPath:out,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],r2Buckets:['BUCKET']});
 try{
  const db=await mf.getD1Database('DB');
  for(const statement of (await readFile('drizzle/0000_faithful_wonder_man.sql','utf8')).split('--> statement-breakpoint'))await db.prepare(statement.trim()).run();
  const request=async(path,init={},user='owner-a')=>{const r=new Request('https://archive.test'+path,{...init,headers:{...(user?{'oai-authenticated-user-id':user}:{}),...init.headers}});return mf.dispatchFetch(r.url,{method:r.method,headers:Object.fromEntries(r.headers),body:r.body?await r.arrayBuffer():undefined});};
  const details={title:'Hume reading',url:'https://example.org/hume',kind:'Article',note:'For philosophy',tags:['hume'],destinations:['Reading','Study']};
  function form(value,upload){const f=new FormData();f.set('details',JSON.stringify(value));if(upload)f.set('file',upload,'notes.txt');return f;}
  assert.equal((await request('/api/items',{},null)).status,401);
  let response=await request('/api/items',{method:'POST',body:form(details)});assert.equal(response.status,201,await response.clone().text());const saved=(await response.json()).item;
  response=await request('/api/items');assert.equal((await response.json()).items.length,1);
  assert.equal((await (await request('/api/items',{},'owner-b')).json()).items.length,0);
  assert.equal((await request('/api/items/'+saved.id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(details)},'owner-b')).status,404);
  assert.equal((await request('/api/items',{method:'POST',body:form(details)})).status,409);
  assert.equal((await request('/api/items',{method:'POST',body:form({...details,url:'javascript:alert(1)'})})).status,400);
  assert.equal((await request('/api/items',{method:'POST',headers:{Origin:'https://elsewhere.test'},body:form(details)})).status,403);
  response=await request('/api/items/'+saved.id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({...details,title:'Updated reading',destinations:[]})});assert.equal(response.status,200);assert.deepEqual((await response.json()).item.destinations,[]);
  response=await request('/api/items',{method:'POST',body:form({...details,url:'',kind:'Document',title:'My text'},new Blob(['A preserved text file.'],{type:'text/plain'}))});assert.equal(response.status,201,await response.clone().text());const uploaded=(await response.json()).item;assert.equal(uploaded.content,'A preserved text file.');assert.equal(uploaded.hasFile,true);
  assert.equal((await request('/api/items/'+uploaded.id+'/file',{},'owner-b')).status,404);
  response=await request('/api/items/'+uploaded.id+'/file');assert.equal(response.status,200);assert.match(response.headers.get('content-disposition'),/^attachment/);assert.equal(await response.text(),'A preserved text file.');
  response=await request('/api/items/'+uploaded.id+'/file',{headers:{Range:'bytes=2-6'}});assert.equal(response.status,206);assert.equal(await response.text(),'prese');
  assert.equal((await request('/api/items/'+uploaded.id,{method:'DELETE'})).status,200);assert.equal((await request('/api/items/'+uploaded.id+'/file')).status,404);
  assert.equal((await request('/api/items/'+saved.id,{method:'DELETE'},'owner-b')).status,404);
  assert.equal((await request('/api/items/'+saved.id,{method:'DELETE'})).status,200);
  assert.equal((await (await request('/api/items')).json()).items.length,0);
 }finally{await mf.dispose();await rm(out,{force:true});}
});
