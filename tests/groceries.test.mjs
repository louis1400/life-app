import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { stateFor,estimate,validateAction,queueTotal,todayInAmsterdam } from "../lib/groceries/model.ts";
import { APPEND_EVENT_SQL } from "../lib/groceries/sql.ts";

const product={id:"wi505041",mode:"cycle",priceCents:159};
const event=(seq,kind,occurredOn,extra={})=>({seq,id:`event-${seq}`,productId:product.id,action:{kind,...extra},occurredOn,recordedAt:occurredOn+"T12:00:00Z"});
test("unknown stock and consumption stay unknown, including a partial first pack",()=>{
  let state=stateFor(product.id,[]);
  assert.equal(state.unopenedPacks,null);assert.equal(estimate(product,state).daysPerPack,null);
  state=stateFor(product.id,[event(1,"already_open","2026-08-01"),event(2,"finished","2026-08-05")]);
  assert.equal(estimate(product,state).daysPerPack,null);assert.equal(state.unopenedPacks,null);assert.equal(state.inUse,false);
});
test("complete cycles produce tentative estimates and known stock extends coverage",()=>{
  const events=[event(1,"opened","2026-08-01"),event(2,"finished","2026-08-11"),event(3,"stock","2026-08-11",{count:3}),event(4,"opened","2026-08-11")];
  const state=stateFor(product.id,events);const prediction=estimate(product,state);
  assert.equal(state.unopenedPacks,2);assert.equal(prediction.daysPerPack,10);assert.equal(prediction.refillOn,"2026-09-10");assert.equal(prediction.tentative,true);
  const unknown=stateFor(product.id,[...events,event(5,"stock","2026-08-12",{count:null})]);
  assert.equal(estimate(product,unknown).refillOn,null);
});
test("undo removes a mistaken measurement and restores open-pack and spare state",()=>{
  const events=[event(1,"stock","2026-08-01",{count:2}),event(2,"opened","2026-08-01"),event(3,"finished","2026-08-11"),event(4,"undo","2026-08-11",{targetId:"event-3"})];
  const state=stateFor(product.id,events);assert.equal(state.inUse,true);assert.equal(state.openedOn,"2026-08-01");assert.equal(state.unopenedPacks,1);assert.equal(state.samples.length,0);assert.equal(state.version,4);
  assert.equal(validateAction(product,state,{kind:"undo",targetId:"event-2"},"2026-08-11","2026-08-11"),null);
});
test("single-use packets learn the gap between consumption, including multiple packets per day",()=>{
  const soup={...product,mode:"usage"};
  const first=stateFor(product.id,[event(1,"used","2026-08-01")]);assert.equal(estimate(soup,first).daysPerPack,null);
  const state=stateFor(product.id,[event(1,"used","2026-08-01"),event(2,"used","2026-08-01"),event(3,"used","2026-08-03")]);
  assert.equal(estimate(soup,state).daysPerPack,1);assert.equal(estimate(soup,state).refillOn,null);
});
test("invalid dates, negative stock, duplicate openings, and out-of-order usage are rejected",()=>{
  const state=stateFor(product.id,[event(1,"opened","2026-08-05")]);
  for(const [action,date] of [[{kind:"opened"},"2026-08-06"],[{kind:"finished"},"2026-08-04"],[{kind:"finished"},"2026-02-30"],[{kind:"stock",count:-1},"2026-08-06"],[{kind:"queue",count:1.5},"2026-08-06"],[{kind:"finished"},"2026-09-08"]])assert.ok(validateAction(product,state,action,date,"2026-09-07"));
  assert.equal(validateAction(product,state,{kind:"finished"},"2026-08-06","2026-09-07"),null);
});
test("refill quantities are explicit and totals use integer cents",()=>{
  assert.equal(queueTotal([product],[]),0);
  assert.equal(queueTotal([product],[event(1,"queue","2026-08-01",{count:3})]),477);
});
test("dates follow the Amsterdam calendar at UTC midnight boundaries",()=>{
  assert.equal(todayInAmsterdam(new Date("2026-09-07T22:30:00Z")),"2026-09-08");
});
test("D1-compatible insert is idempotent, rejects stale updates, and isolates households",()=>{
  const db=new DatabaseSync(":memory:");db.exec(readFileSync(new URL("../drizzle/0000_round_apocalypse.sql",import.meta.url),"utf8"));
  const statement=db.prepare(APPEND_EVENT_SQL);
  const insert=(id,user,version)=>statement.run(id,user,"wi505041",'{"kind":"used"}',"2026-09-07","2026-09-07T12:00:00Z",user,"wi505041",version);
  assert.equal(insert("a","user-a",0).changes,1);
  assert.equal(insert("a","user-a",1).changes,0);
  assert.equal(insert("b","user-a",0).changes,0);
  assert.equal(insert("c","user-b",0).changes,1);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM grocery_events WHERE user_id=?").get("user-a").n,1);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM grocery_events WHERE user_id=?").get("user-b").n,1);
  db.close();
});
