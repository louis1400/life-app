import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";

const sqlite=new DatabaseSync(":memory:");
for (const migration of readdirSync(new URL("../drizzle/",import.meta.url)).filter(name=>name.endsWith(".sql")).sort()) sqlite.exec(readFileSync(new URL("../drizzle/"+migration,import.meta.url),"utf8"));
globalThis.__groceryTestEnv={DB:{async batch(statements){sqlite.exec("BEGIN");try{const results=[];for(const statement of statements)results.push(await statement.run());sqlite.exec("COMMIT");return results;}catch(error){sqlite.exec("ROLLBACK");throw error;}},prepare(sql){let args=[];return {bind(...values){args=values;return this;},async all(){return {results:sqlite.prepare(sql).all(...args)};},async run(){const result=sqlite.prepare(sql).run(...args);return {meta:{changes:Number(result.changes)}};}};}}};
registerHooks({resolve(specifier,context,nextResolve){if(specifier==="cloudflare:workers")return {url:"data:text/javascript,export const env = globalThis.__groceryTestEnv;",shortCircuit:true};return nextResolve(specifier,context);}});
const worker= (await import(new URL("../dist/server/index.js",import.meta.url))).default;
const runtimeEnv={ASSETS:{fetch:async()=>new Response("Not found",{status:404})}};
const executionContext={waitUntil(){},passThroughOnException(){}};
const call=(path,options={})=>worker.fetch(new Request("https://life.test"+path,options),runtimeEnv,executionContext);

test('To-do persists notes, completes, reopens, deletes and undoes with isolated, versioned writes', async()=>{
  const headers={'oai-authenticated-user-id':'todo-owner','Content-Type':'application/json',origin:'https://life.test'};
  const post=(task,extra={})=>call('/api/todo',{method:'POST',headers:{...headers,...extra},body:JSON.stringify(task)});
  const read=async()=> (await (await call('/api/todo',{headers})).json()).tasks;
  const input={id:crypto.randomUUID(),title:'A real task',notes:'Private notes\nwith details',done:false,deleted:false,version:0};
  assert.equal((await call('/api/todo')).status,401);
  assert.equal((await call('/api/todo',{method:'POST',body:JSON.stringify(input)})).status,401);
  assert.equal((await post(input,{origin:'https://other.test'})).status,403);
  assert.equal((await post(input,{'sec-fetch-site':'cross-site'})).status,403);
  assert.equal((await post({...input,title:' '})).status,400);
  assert.equal((await post({...input,user_id:'spoofed-owner'})).status,400);
  assert.deepEqual(await read(),[],'new accounts do not receive another person’s seed task');
  assert.equal((await post(input)).status,200);
  assert.equal((await post(input)).status,200,'retry after a lost create response');
  let tasks=await read();assert.equal(tasks.length,1);assert.equal(tasks[0].version,1);assert.equal(tasks[0].notes,input.notes);
  const payload=t=>({id:t.id,title:t.title,notes:t.notes,done:t.done,deleted:t.deleted,version:t.version});
  let task=payload(tasks[0]);
  const otherHeaders={...headers,'oai-authenticated-user-id':'todo-other'};
  assert.deepEqual((await (await call('/api/todo',{headers:otherHeaders})).json()).tasks,[]);
  assert.equal((await post({...task,title:'Other owner edit'},otherHeaders)).status,409);
  let home=await (await call('/api/home',{headers})).json();
  assert.equal(home.todo.count,1);assert.equal(home.todo.tasks[0].id,input.id);
  assert.ok(!JSON.stringify(home).includes(input.notes),'Home does not expose task notes');
  const updated={...task,title:'Updated task'};
  assert.equal((await post(updated)).status,200);
  assert.equal((await post({...task,notes:'stale edit'})).status,409);
  assert.equal((await post(updated)).status,200,'lost update response is safe to retry');
  task=payload((await read())[0]);assert.equal(task.version,2);
  assert.equal((await post({...task,done:true})).status,200);
  assert.equal((await (await call('/api/home',{headers})).json()).todo.count,0);
  task=payload((await read())[0]);assert.equal((await post({...task,done:false})).status,200);
  task=payload((await read())[0]);assert.equal((await post({...task,deleted:true})).status,200);
  task=payload((await read())[0]);assert.equal(task.deleted,true);
  assert.equal((await (await call('/api/home',{headers})).json()).todo.count,0);
  assert.equal((await post({...task,deleted:false})).status,200,'undo retains title and notes');
  assert.equal((await read())[0].notes,input.notes);
  assert.equal((await (await call('/api/home',{headers:otherHeaders})).json()).todo.count,0);
});

test('To-do transfer preserves dates and state only for its verified owner, and cannot resurrect or overwrite tasks',async()=>{
  const owner='transfer-owner',headers={'oai-authenticated-user-id':owner,'Content-Type':'application/json',origin:'https://life.test'};
  const task={id:crypto.randomUUID(),title:'Existing task',notes:'Original notes',done:false,deleted:false,version:5,createdAt:'2026-09-08T14:23:55.492Z',updatedAt:'2026-09-08T14:24:09.010Z'};
  const completed={...task,id:crypto.randomUUID(),title:'Already done',done:true};
  const deleted={...task,id:crypto.randomUUID(),title:'Already deleted',deleted:true};
  globalThis.__groceryTestEnv.TODO_IMPORT_SNAPSHOT=JSON.stringify({owner,tasks:[task,completed,deleted]});
  try {
    const outsider={'oai-authenticated-user-id':'transfer-outsider'};
    assert.deepEqual((await (await call('/api/todo',{headers:outsider})).json()).tasks,[]);
    const home=await (await call('/api/home',{headers})).json();assert.equal(home.todo.count,1);
    const read=async()=> (await (await call('/api/todo',{headers})).json()).tasks;
    let rows=await read();assert.equal(rows.length,3);assert.deepEqual(rows.find(t=>t.id===task.id),task);
    const {createdAt,updatedAt,...input}=task;
    assert.equal((await call('/api/todo',{method:'POST',headers,body:JSON.stringify({...input,title:'Edited after transfer',deleted:true})})).status,200);
    rows=await read();const saved=rows.find(t=>t.id===task.id);
    assert.equal(saved.deleted,true);assert.equal(saved.title,'Edited after transfer');assert.equal(saved.version,6);assert.equal(saved.createdAt,createdAt);
    assert.equal((await (await call('/api/home',{headers})).json()).todo.count,0);
    assert.equal((await read()).length,3,'repeated transfer is idempotent');
  } finally { delete globalThis.__groceryTestEnv.TODO_IMPORT_SNAPSHOT; }
});

test('To-do returns a recoverable error when persistence fails and keeps other Home modules available',async()=>{
  const headers={'oai-authenticated-user-id':'todo-failure','Content-Type':'application/json',origin:'https://life.test'};
  sqlite.exec("CREATE TRIGGER todo_fail BEFORE INSERT ON todo_tasks WHEN NEW.user_id='todo-failure' BEGIN SELECT RAISE(FAIL,'test failure'); END;");
  const input={id:crypto.randomUUID(),title:'Keep this draft',notes:'',done:false,deleted:false,version:0};
  try {assert.equal((await call('/api/todo',{method:'POST',headers,body:JSON.stringify(input)})).status,503);}
  finally {sqlite.exec('DROP TRIGGER todo_fail');}
  assert.equal((await call('/api/todo',{method:'POST',headers,body:JSON.stringify(input)})).status,200);
  const original=globalThis.__groceryTestEnv.DB.prepare;
  globalThis.__groceryTestEnv.DB.prepare=function(sql){if(sql.includes('todo_tasks'))throw Error('test storage unavailable');return original.call(this,sql);};
  try {
    assert.equal((await call('/api/todo',{headers})).status,503);
    const home=await (await call('/api/home',{headers})).json();assert.equal(home.todo,null);assert.ok(home.study);assert.ok(home.groceries);assert.ok(home.vault);
  } finally {globalThis.__groceryTestEnv.DB.prepare=original;}
});

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
  for (const destination of ["/todo", "/study", "/groceries", "/vault"]) assert.ok(html.includes(destination));
});

test("all modules share one Worker without losing coursework authorization or storage",async()=>{
  const headers={"oai-authenticated-user-id":"integration-user",origin:"https://life.test","Content-Type":"application/json"};
  for(const path of ["/todo","/study","/groceries","/groceries/stock","/vault","/study/content"]){
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

test('Home summarizes saved weeks and the shared shopping list without leaking another owner or full notes',async()=>{
  assert.equal((await call('/api/home')).status,401);
  const headers={'oai-authenticated-user-id':'ux-owner','Content-Type':'application/json',origin:'https://life.test'};
  const save=async(id,data,version=0)=>call('/api/coursework/'+encodeURIComponent(id),{method:'PUT',headers,body:JSON.stringify({version,data})});
  assert.equal((await save('plan:enlightenment',{week:3,chatUrl:''})).status,200);
  assert.equal((await save('reading:enlightenment-1-0',{progress:'in-progress',notes:'PRIVATE FULL NOTE',resume:'Paragraph four',chatUrl:''})).status,200);
  const quantity={id:crypto.randomUUID(),productId:'wi505041',version:0,action:{kind:'queue',count:2},occurredOn:'2026-09-09'};
  const stockSave=await call('/api/groceries',{method:'POST',headers,body:JSON.stringify(quantity)});assert.equal(stockSave.status,200);
  const stock=(await stockSave.json()).events;
  let home=await (await call('/api/home',{headers})).json();
  assert.equal(home.study.courses.find(c=>c.id==='enlightenment').week,3);
  assert.equal(home.study.resume.href,'/study#session-enlightenment-1-0');
  assert.equal(home.study.resume.note,'Paragraph four');assert.equal(home.groceries.packs,2);
  assert.ok(!JSON.stringify(home).includes('PRIVATE FULL NOTE'));
  // A shopping-page quantity update uses the version produced by stock tracking.
  assert.equal((await call('/api/groceries',{method:'POST',headers,body:JSON.stringify({...quantity,id:crypto.randomUUID(),version:stock.at(-1).seq,action:{kind:'queue',count:5}})})).status,200);
  home=await (await call('/api/home',{headers})).json();assert.equal(home.groceries.packs,5);
  const other=await (await call('/api/home',{headers:{...headers,'oai-authenticated-user-id':'ux-other'}})).json();assert.equal(other.groceries.packs,0);assert.equal(other.study.resume,null);assert.equal(other.vault.count,0);assert.ok(other.study.courses.every(c=>c.week===null));
});
