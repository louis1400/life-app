import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { CATALOG } from "../extensions/ah-connector/catalog.js";
import { CHANNEL, SITE_ORIGIN, normalizeLines, allowedSender } from "../extensions/ah-connector/protocol.js";
import { PRODUCTS } from "../lib/groceries/catalog.ts";

const sender = {frameId:0, url:SITE_ORIGIN+"/", tab:{id:1}};
const tissue = "wi505041";
const pockets = "wi82822";

function storage(initial={}) {
  let values=structuredClone(initial);
  return {
    async get(key){return {[key]:structuredClone(values[key])};},
    async set(update){values={...values,...structuredClone(update)};},
  };
}

async function harness(options={}) {
  let listener;
  const counts = new Map([[tissue,1],[pockets,0],["unrelated-product",7]]);
  let tabUrl="https://www.ah.nl/mijnlijst";
  const actions=[];
  let loseAcknowledgement=options.loseAcknowledgement || false;
  let disconnectAfterClick=options.disconnectAfterClick || false;
  const tabId=9;
  const updates=new Set();
  const removals=new Set();
  let navigating=false;
  function startNavigation(){
    navigating=true;
    for(const fn of updates)fn(tabId,{status:"loading"});
    setImmediate(()=>{navigating=false;for(const fn of updates)fn(tabId,{status:"complete"});});
  }
  const chrome={
    storage:{local:storage({enabled:true}),session:storage({tabId})},
    tabs:{
      onUpdated:{addListener:fn=>updates.add(fn),removeListener:fn=>updates.delete(fn)},
      onRemoved:{addListener:fn=>removals.add(fn),removeListener:fn=>removals.delete(fn)},
      async get(id){assert.equal(id,tabId);return {id,url:tabUrl};},
      async update(id,update){assert.equal(id,tabId);if(update.url){tabUrl=update.url;startNavigation();}actions.push({type:"navigate",url:tabUrl});return {id,url:tabUrl};},
      async reload(id){assert.equal(id,tabId);actions.push({type:"reload"});startNavigation();},
      async create(){throw new Error("This test must use the connected tab.");},
    },
    scripting:{async executeScript({target,func,args}){
      assert.equal(target.tabId,tabId);
      assert.equal(navigating,false,"never inspect the stale page before navigation completes");
      let result;
      if(func.name==="inspectConnection") result={status:"connected"};
      else if(func.name==="inspectBasket") result={ready:true};
      else if(func.name==="inspectProduct") {
        const [id,increment,expected]=args;
        assert.equal(new URL(tabUrl).pathname.match(/\/(wi\d+)\//)?.[1],id);
        const quantity=counts.get(id) || 0;
        if(increment){
          assert.equal(expected,quantity,"a click must be conditional on the last observed quantity");
          actions.push({type:"click",id});counts.set(id,quantity+1);
          if(disconnectAfterClick){disconnectAfterClick=false;await command("disconnect");}
          if(loseAcknowledgement){loseAcknowledgement=false;throw new Error("Transport lost after click");}
          result={status:"clicked",quantity};
        } else result={status:"ready",quantity};
      } else throw new Error("Unexpected browser action");
      return [{result}];
    }},
    runtime:{onMessage:{addListener(fn){listener=fn;}}},
    action:{onClicked:{addListener(){}}},
  };
  globalThis.chrome=chrome;
  await import(`../extensions/ah-connector/background.js?test=${crypto.randomUUID()}`);
  function command(command,lines){return new Promise(resolve=>listener({channel:CHANNEL,command,lines},sender,resolve));}
  return {counts,actions,command,listener};
}

test("connector is limited to the exact app origin and selected catalog",()=>{
  const manifest=JSON.parse(readFileSync(new URL("../extensions/ah-connector/manifest.json",import.meta.url),"utf8"));
  assert.deepEqual(manifest.host_permissions,["https://www.ah.nl/*",SITE_ORIGIN+"/*"]);
  assert.deepEqual(manifest.permissions,["storage","scripting"]);
  assert.deepEqual(CATALOG,PRODUCTS.map(({id,name,url})=>({id,name,url})));
  assert.ok(allowedSender(sender));
  for(const forged of [{...sender,frameId:1},{...sender,url:"https://evil.invalid/"},{...sender,url:SITE_ORIGIN+".evil.invalid/"},{...sender,tab:null}]) assert.equal(allowedSender(forged),false);
  for(const lines of [[],[{productId:"unknown",quantity:1}],[{productId:tissue,quantity:0}],[{productId:tissue,quantity:100}],[{productId:tissue,quantity:1.5}],[{productId:tissue,quantity:1},{productId:tissue,quantity:1}]]) assert.throws(()=>normalizeLines(lines,CATALOG));
});

test("transfer tops up exact products, preserves existing items, and repeats without adding duplicates",async()=>{
  const h=await harness();
  const lines=[{productId:tissue,quantity:3,url:"https://evil.invalid/"},{productId:pockets,quantity:1}];
  const first=await h.command("transfer",lines);
  assert.equal(first.transfer.status,"complete");
  assert.equal(first.transfer.lines.filter(l=>l.verified).length,2);
  assert.deepEqual([...h.counts],[[tissue,3],[pockets,1],["unrelated-product",7]]);
  assert.equal(h.actions.filter(a=>a.type==="click").length,3);
  assert.equal(h.actions.filter(a=>a.type==="reload").length,2,"read quantities again after fresh navigation");
  assert.ok(h.actions.filter(a=>a.url).every(a=>a.url.startsWith("https://www.ah.nl/")));
  const second=await h.command("transfer",lines);
  assert.equal(second.transfer.status,"complete");
  assert.equal(h.actions.filter(a=>a.type==="click").length,3);
});

test("a lost acknowledgement stops immediately and the next manual transfer reconciles existing quantity",async()=>{
  const h=await harness({loseAcknowledgement:true});
  const lines=[{productId:tissue,quantity:2},{productId:pockets,quantity:1}];
  const first=await h.command("transfer",lines);
  assert.equal(first.transfer.status,"interrupted");
  assert.equal(first.transfer.lines.length,2,"retain the full planned total on interruption");
  assert.equal(h.counts.get(tissue),2);
  assert.equal(h.counts.get(pockets),0);
  assert.equal(h.actions.filter(a=>a.type==="click").length,1,"never retry the ambiguous click");
  const resumed=await h.command("transfer",lines);
  assert.equal(resumed.transfer.status,"complete");
  assert.equal(h.counts.get(tissue),2);
  assert.equal(h.counts.get(pockets),1);
});

test("disconnect during a transfer stops further additions and requires reconnecting",async()=>{
  const h=await harness({disconnectAfterClick:true});
  const stopped=await h.command("transfer",[{productId:tissue,quantity:3},{productId:pockets,quantity:1}]);
  assert.equal(stopped.status,"disconnected");
  assert.equal(stopped.transfer.status,"interrupted");
  assert.equal(h.counts.get(tissue),2);
  assert.equal(h.counts.get(pockets),0);
  assert.equal((await h.command("transfer",[{productId:tissue,quantity:3}])).status,"error");
  assert.equal(h.actions.filter(a=>a.type==="click").length,1);
});

test("requests from another origin and unsupported order operations have no effects",async()=>{
  const h=await harness();
  let responded=false;
  assert.equal(h.listener({channel:CHANNEL,command:"transfer",lines:[{productId:tissue,quantity:9}]},{...sender,url:"https://evil.invalid/"},()=>{responded=true;}),undefined);
  assert.equal(h.listener({channel:CHANNEL,command:"checkout"},sender,()=>{responded=true;}),undefined);
  assert.equal(responded,false);
  assert.deepEqual(h.actions,[]);
});
