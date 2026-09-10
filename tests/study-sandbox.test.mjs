import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {get} from 'node:http';
import {sandboxHtml, startSandbox} from '../scripts/study-sandbox.mjs';
import {courseworkApi} from '../modules/study/worker/coursework.mjs';

const adapter = await readFile(new URL('../scripts/study-sandbox-client.js', import.meta.url), 'utf8');
function sandbox(storage = new Map()) {
  const status = {}, resets = [];
  const document = {
    getElementById: () => status,
    addEventListener() {},
    querySelectorAll: () => ['blank','catch-up'].map(scenario => ({dataset:{sandboxReset:scenario},addEventListener(_, handler){resets.push(handler);}}))
  };
  const window = {STUDY_CURRICULUM:{courses:[{weeks:[{readings:[{id:'moral-1-0'}]}]}]}};
  const localStorage = {getItem:key=>storage.get(key), setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)};
  const location = {hash:'',reload(){}};
  vm.runInNewContext(adapter, {window,document,localStorage,location,confirm:()=>true,courseworkApi,Request,Response,Headers,URL,crypto,TextEncoder});
  return {window,storage,resets};
}
test('portable preview embeds executable current Study scripts, with no private Drive links or external assets', async () => {
  const html = await sandboxHtml();
  assert.match(html, /Week 2 · nothing done/);
  assert.match(html, /connect-src 'none'/);
  assert.doesNotMatch(html, /drive\.google\.com\/file\/d\//);
  assert.doesNotMatch(html, /<script src=|<link rel="stylesheet"/);
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length, 6);
  for (const [,source] of scripts) new vm.Script(source);
});
test('catch-up scenario starts at week two with no completed readings, and blank resets plans', async () => {
  const s = sandbox();
  let result = await (await s.window.fetch('/api/coursework')).json();
  assert.equal(result.entries.length, 2);
  assert(result.entries.every(entry => entry.id.startsWith('plan:') && entry.data.week === 2));
  await s.resets[0]();
  result = await (await s.window.fetch('/api/coursework')).json();
  assert.deepEqual(result.entries, []);
});
test('sandbox uses actual coursework validation and versions, persists reloads, and blocks external fetches', async () => {
  const s = sandbox();
  const data = {progress:'in-progress',notes:'Test note',resume:'First argument',chatUrl:''};
  const save = (version, value=data) => s.window.fetch('/api/coursework/reading%3Amoral-1-0', {method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({version,data:value})});
  assert.equal((await save(0)).status, 200);
  assert.equal((await save(0)).status, 409);
  assert.equal((await save(1,{...data,chatUrl:'https://evil.test/'})).status,400);
  const reopened = sandbox(s.storage);
  const result = await (await reopened.window.fetch('/api/coursework')).json();
  assert.equal(result.entries.find(e => e.id==='reading:moral-1-0').data.notes,'Test note');
  assert.equal((await s.window.fetch('https://chatgpt.com')).status,501);
  assert.equal((await s.window.fetch('/api/readings/18',{method:'PUT'})).status,501);
});
test('standalone app starts without dependencies, serves Study, and refuses unrelated routes and writes', async () => {
  const server = await startSandbox({port:0});
  try {
    const origin = 'http://127.0.0.1:' + server.address().port;
    const response = await fetch(origin + '/study');
    assert.equal(response.status,200);
    assert.match(await response.text(),/Study test sandbox/);
    assert.equal((await fetch(origin + '/api/coursework')).status,404);
    assert.equal((await fetch(origin + '/study',{method:'POST'})).status,405);
    const rejected = await new Promise((resolve,reject) => get(origin + '/study',{headers:{host:'evil.test'}}, response => {response.resume();resolve(response.statusCode);}).on('error',reject));
    assert.equal(rejected,403);
  } finally {await new Promise(resolve => server.close(resolve));}
});
