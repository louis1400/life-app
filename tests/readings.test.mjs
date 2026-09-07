import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readingApi} from '../worker/readings.mjs';

function bucket() {
  const objects=new Map();
  return {objects, async head(key){return objects.get(key)||null;}, async get(key){return objects.get(key)||null;},async put(key,bytes){objects.set(key,{body:bytes,uploaded:new Date()});}};
}
function request(path, method='GET', user='alice', body) {
  const headers={'Origin':'https://reading.example','Content-Type':'application/pdf'};
  if(user)headers['oai-authenticated-user-id']=user;
  return new Request(`https://reading.example${path}`,{method,headers,body});
}
test('saved chapters round-trip without exposing them to another account',async()=>{
  const env={BUCKET:bucket()};const pdf='%PDF-1.7\nfixture\n%%EOF';
  assert.equal((await readingApi(request('/api/readings/18','PUT','alice',pdf),env)).status,200);
  const list=await (await readingApi(request('/api/readings'),env)).json();
  assert.equal(list.readings.find(r=>r.chapter===18).saved,true);
  const own=await readingApi(request('/api/readings/18/pdf'),env);
  assert.equal(await own.text(),pdf);assert.match(own.headers.get('cache-control'),/no-store/);
  assert.equal((await readingApi(request('/api/readings/18/pdf','GET','bob'),env)).status,404);
  assert.equal((await readingApi(request('/api/readings/18/pdf','GET',null),env)).status,401);
});
test('rejects foreign-origin writes, unsupported chapters, and disguised files',async()=>{
  const env={BUCKET:bucket()};
  const foreign=request('/api/readings/12','PUT','alice','%PDF-1.7');foreign.headers.set('Origin','https://other.example');
  assert.equal((await readingApi(foreign,env)).status,403);
  assert.equal((await readingApi(request('/api/readings/99','PUT','alice','%PDF-1.7'),env)).status,404);
  assert.equal((await readingApi(request('/api/readings/12','PUT','alice','<script>bad</script>'),env)).status,415);
  assert.equal(env.BUCKET.objects.size,0);
});
test('enforces upload limit and handles unavailable storage',async()=>{
  const env={BUCKET:bucket()};
  const large=request('/api/readings/21','PUT','alice','%PDF-1.7');large.headers.set('Content-Length',String(13*1024*1024));
  assert.equal((await readingApi(large,env)).status,413);
  assert.equal((await readingApi(request('/api/readings'),{})).status,503);
});
