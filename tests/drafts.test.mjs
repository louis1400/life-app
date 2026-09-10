import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const bundle=await build({entryPoints:['lib/drafts.ts'],bundle:true,write:false,format:'esm',platform:'node'});
const {draftStore}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
test('draft recovery preserves interrupted input, isolates accounts and never clears another tab’s newer edit',async()=>{
 const oldFetch=globalThis.fetch,oldStorage=globalThis.localStorage,oldNow=Date.now;let owner='owner-a',clock=1000;const values=new Map();
 globalThis.localStorage={get length(){return values.size;},key:n=>[...values.keys()][n],getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
 globalThis.fetch=async()=>Response.json({draftScope:owner});Date.now=()=>++clock;
 try{
  const first=await draftStore('vault:new');first.write({note:'My unfinished note',fileKey:'draft-file'});
  const restored=await draftStore('vault:new');assert.deepEqual(restored.read(),{note:'My unfinished note',fileKey:'draft-file'});
  first.write({note:'A newer edit from the first tab'});restored.write({note:'An independent second-tab edit'});restored.clear();
  assert.deepEqual((await draftStore('vault:new')).read(),{note:'A newer edit from the first tab'});
  owner='owner-b';assert.equal((await draftStore('vault:new')).read(),null);
  owner='owner-a';const resumed=await draftStore('vault:new');assert.deepEqual(resumed.read(),{note:'A newer edit from the first tab'});resumed.write({note:'Finished'});resumed.clear();assert.equal((await draftStore('vault:new')).read(),null);
  globalThis.fetch=async()=>new Response(null,{status:401});await assert.rejects(draftStore('vault:new'),/Sign in/);
 }finally{globalThis.fetch=oldFetch;globalThis.localStorage=oldStorage;Date.now=oldNow;}
});
