import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";

const sqlite=new DatabaseSync(":memory:");
for (const migration of readdirSync(new URL("../drizzle/",import.meta.url)).filter(name=>name.endsWith(".sql")).sort()) sqlite.exec(readFileSync(new URL("../drizzle/"+migration,import.meta.url),"utf8"));
globalThis.__groceryTestEnv={DB:{prepare(sql){let args=[];return {bind(...values){args=values;return this;},async all(){return {results:sqlite.prepare(sql).all(...args)};},async run(){const result=sqlite.prepare(sql).run(...args);return {meta:{changes:Number(result.changes)}};}};}}};
registerHooks({resolve(specifier,context,nextResolve){if(specifier==="cloudflare:workers")return {url:"data:text/javascript,export const env = globalThis.__groceryTestEnv;",shortCircuit:true};return nextResolve(specifier,context);}});
const worker= (await import(new URL("../dist/server/index.js",import.meta.url))).default;
const runtimeEnv={ASSETS:{fetch:async()=>new Response("Not found",{status:404})}};
const executionContext={waitUntil(){},passThroughOnException(){}};
const call=(path,options={})=>worker.fetch(new Request("https://life.test"+path,options),runtimeEnv,executionContext);

test("the production Worker serves the Life shell", async () => {
  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  const html = await response.text();
  for (const destination of ["/study", "/groceries", "/vault"]) assert.ok(html.includes(destination));
});

test("all modules share one Worker without losing coursework authorization or storage",async()=>{
  const headers={"oai-authenticated-user-id":"integration-user",origin:"https://life.test","Content-Type":"application/json"};
  for(const path of ["/study","/groceries","/groceries/stock","/vault","/study/content"]){
    const response=await call(path,{headers});assert.equal(response.status,200,path);
  }
  const study=await (await call('/study/content')).text();
  assert.ok(study.includes('/study/content/study.js'));
  assert.ok(!study.includes('<base'),'hash navigation must not reload the embedded Study document');
  assert.equal((await call('/api/coursework')).status,401);
  const body=JSON.stringify({version:0,data:{week:2,chatUrl:''}});
  assert.equal((await call('/api/coursework/plan%3Aenlightenment',{method:'PUT',headers,body})).status,200);
  const saved=await (await call('/api/coursework',{headers})).json();
  assert.equal(saved.entries[0].data.week,2);
  assert.equal((await call('/api/coursework/plan%3Aenlightenment',{method:'PUT',headers,body})).status,409);
  assert.equal((await call('/api/coursework/plan%3Amoral',{method:'PUT',headers:{...headers,origin:'https://elsewhere.test'},body})).status,403);
  const other=await (await call('/api/coursework',{headers:{...headers,'oai-authenticated-user-id':'another-user'}})).json();
  assert.deepEqual(other.entries,[]);
  assert.deepEqual((await (await call('/api/items',{headers})).json()).items,[]);
});

test("API persists an observation and rejects anonymous, cross-site and stale writes",async()=>{
  assert.equal((await call("/api/groceries")).status,401);
  const headers={"oai-authenticated-user-id":"user-one","oai-authenticated-user-email":"test@example.invalid","Content-Type":"application/json",origin:"https://life.test"};
  const first=await call("/api/groceries",{headers});assert.equal(first.status,200);assert.deepEqual((await first.json()).events,[]);
  const body={id:"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",productId:"wi505041",version:0,action:{kind:"already_open"},occurredOn:"2026-09-07"};
  const write=await call("/api/groceries",{method:"POST",headers,body:JSON.stringify(body)});assert.equal(write.status,200);assert.equal((await write.json()).events.length,1);
  const duplicate=await call("/api/groceries",{method:"POST",headers,body:JSON.stringify(body)});assert.equal(duplicate.status,200);assert.equal((await duplicate.json()).events.length,1);
  const conflict=await call("/api/groceries",{method:"POST",headers,body:JSON.stringify({...body,id:"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"})});assert.equal(conflict.status,409);
  const crossSite=await call("/api/groceries",{method:"POST",headers:{...headers,origin:"https://elsewhere.test"},body:JSON.stringify(body)});assert.equal(crossSite.status,403);
  const other=await call("/api/groceries",{headers:{...headers,"oai-authenticated-user-id":"user-two"}});assert.deepEqual((await other.json()).events,[]);
});
