import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {courseworkApi,validChatUrl} from '../worker/coursework.mjs';
const ids=new Set(['enlightenment-1-0','moral-7-0']);
function environment() {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../drizzle/0000_coursework.sql', import.meta.url), 'utf8'));
  return { DB: { prepare(sql) {
    return { bind(...args) {
      return {
        async all() { return {results: db.prepare(sql).all(...args)}; },
        async run() { return {meta: {changes: Number(db.prepare(sql).run(...args).changes)}}; }
      };
    }};
  }}};
}

function request(user='alice',id=null,data=null,version=0,origin='https://coursework.test') {return new Request('https://coursework.test/api/coursework'+(id?'/'+encodeURIComponent(id):''),{method:id?'PUT':'GET',headers:{...(user?{'oai-authenticated-user-id':user}:{}),'Content-Type':'application/json',Origin:origin},...(id?{body:JSON.stringify({version,data})}:{})});}
const note={progress:'in-progress',notes:'Reason and passion',resume:'Return to the final paragraph',chatUrl:'https://chatgpt.com/c/abc-123'};
test('real migration supports notes, progress, plans, sessions and private cross-device retrieval',async()=>{const env=environment();for(const [id,data]of [['reading:enlightenment-1-0',note],['plan:enlightenment',{week:2,chatUrl:''}],['week:enlightenment:1',{notes:'Week connections'}],['session:12345678-1234-1234-1234-123456789abc',{readingId:'enlightenment-1-0',summary:'Arguments covered',questions:'What grounds the analogy?',resume:'Part 2'}]]){assert.equal((await courseworkApi(request('alice',id,data),env,ids)).status,200);}const result=await (await courseworkApi(request(),env,ids)).json();assert.equal(result.entries.length,4);assert.equal(result.entries.find(e=>e.id.startsWith('reading:')).data.notes,note.notes);assert.equal((await (await courseworkApi(request('bob'),env,ids)).json()).entries.length,0);assert.equal((await courseworkApi(request(null),env,ids)).status,401);});
test('stale edits and duplicate creates cannot overwrite notes from another device',async()=>{const env=environment(),id='reading:enlightenment-1-0';assert.equal((await courseworkApi(request('alice',id,note),env,ids)).status,200);assert.equal((await courseworkApi(request('alice',id,{...note,notes:'Newer note'},1),env,ids)).status,200);assert.equal((await courseworkApi(request('alice',id,{...note,notes:'Stale note'},1),env,ids)).status,409);assert.equal((await courseworkApi(request('alice',id,{...note,notes:'Duplicate'},0),env,ids)).status,409);assert.equal((await courseworkApi(request('bob',id,note,2),env,ids)).status,409);const saved=await (await courseworkApi(request(),env,ids)).json();assert.equal(saved.entries[0].data.notes,'Newer note');assert.equal(saved.entries[0].version,2);});
test('rejects forged origins, unknown readings and unsafe chat URLs',async()=>{const env=environment();assert.equal((await courseworkApi(request('alice','reading:enlightenment-1-0',note,0,'https://evil.test'),env,ids)).status,403);assert.equal((await courseworkApi(request('alice','reading:fake',note),env,ids)).status,400);for(const url of ['javascript:alert(1)','https://chatgpt.com.evil.test/c/abc','https://evil.test/','https://chatgpt.com/c/abc?token=secret','https://user:pass@chatgpt.com/c/abc'])assert.equal(validChatUrl(url),false);assert(validChatUrl('https://chatgpt.com/g/g-p-abc/project'));assert.equal((await courseworkApi(request('alice','reading:enlightenment-1-0',{...note,chatUrl:'https://evil.test'}),env,ids)).status,400);assert.equal((await courseworkApi(request('alice','plan:moral',{week:9,chatUrl:''}),env,ids)).status,400);});
test('missing storage and oversized notes fail explicitly without writing',async()=>{assert.equal((await courseworkApi(request(),{},ids)).status,503);const env=environment();assert.equal((await courseworkApi(request('alice','reading:enlightenment-1-0',{...note,notes:'x'.repeat(90000)}),env,ids)).status,413);assert.equal((await courseworkApi(request('alice','reading:enlightenment-1-0',{...note,notes:'x'.repeat(24001)}),env,ids)).status,400);assert.equal((await (await courseworkApi(request(),env,ids)).json()).entries.length,0);});
