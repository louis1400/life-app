import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const bundle=await build({entryPoints:['lib/groceries/list.ts'],bundle:true,write:false,format:'esm',platform:'node'});
const {saveQuantity,ahBasketUrl}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));

test('shopping updates preserve queue versions, reject conflicts without replay, and hand off exact packs',async()=>{
  const original=globalThis.fetch;const calls=[];
  const snapshot={today:'2026-09-09',events:[{seq:8,id:'old',productId:'wi505041',action:{kind:'queue',count:2},occurredOn:'2026-09-09'}]};
  try{
    globalThis.fetch=async(path,options)=>{calls.push({path,body:JSON.parse(options.body)});return Response.json({error:'Changed on another device'},{status:409});};
    await assert.rejects(saveQuantity(snapshot,'wi505041',5),/Changed on another device/);
    assert.equal(calls.length,1);assert.equal(calls[0].path,'/api/groceries');assert.equal(calls[0].body.version,8);assert.deepEqual(calls[0].body.action,{kind:'queue',count:5});assert.equal(snapshot.events[0].action.count,2);
    const url=new URL(ahBasketUrl([{productId:'wi505041',quantity:5},{productId:'wi82822',quantity:2}]));
    assert.deepEqual(url.searchParams.getAll('p'),['505041:5','82822:2']);
    assert.equal(ahBasketUrl([]),null);assert.equal(ahBasketUrl([{productId:'wi505041',quantity:100}]),null);
  }finally{globalThis.fetch=original;}
});
