import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";

const sqlite=new DatabaseSync(":memory:");
sqlite.exec(readFileSync(new URL("../drizzle/0000_round_apocalypse.sql",import.meta.url),"utf8"));
globalThis.__groceryTestEnv={DB:{prepare(sql){let args=[];return {bind(...values){args=values;return this;},async all(){return {results:sqlite.prepare(sql).all(...args)};},async run(){const result=sqlite.prepare(sql).run(...args);return {meta:{changes:Number(result.changes)}};}};}}};
registerHooks({resolve(specifier,context,nextResolve){if(specifier==="cloudflare:workers")return {url:"data:text/javascript,export const env = globalThis.__groceryTestEnv;",shortCircuit:true};return nextResolve(specifier,context);}});
const worker= (await import(new URL("../dist/server/index.js",import.meta.url))).default;
const runtimeEnv={ASSETS:{fetch:async()=>new Response("Not found",{status:404})}};
const executionContext={waitUntil(){},passThroughOnException(){}};
const call=(path,options={})=>worker.fetch(new Request("https://life.test"+path,options),runtimeEnv,executionContext);

test("the production Worker serves the grocery app", async () => {
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
  assert.ok((await response.text()).length > 0);
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
