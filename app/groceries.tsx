"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Check, ChevronRight, Clock3, Minus, Package, Plus, RotateCcw, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Toaster, toast } from "sonner";
import AHConnection from "./ah-connection";
import { ahBasketUrl } from "@/lib/groceries/list";
import { PRODUCTS, PRICE_CHECKED_ON } from "@/lib/groceries/catalog";
import { estimate, queueTotal, stateFor, todayInAmsterdam, type Action, type GroceryEvent, type PackState, type Product } from "@/lib/groceries/model";

const euro=(cents:number)=>new Intl.NumberFormat("nl-NL",{style:"currency",currency:"EUR"}).format(cents/100);
const dateLabel=(date:string)=>new Intl.DateTimeFormat("en-GB",{day:"numeric",month:"short",timeZone:"UTC"}).format(new Date(date+"T12:00:00Z"));
const period=(days:number)=>days<1?"Less than a day":`About ${Math.round(days)} days`;
type ApiResult={events?:GroceryEvent[];today?:string;error?:string};
function actionLabel(e:GroceryEvent) {
  switch(e.action.kind) {
    case "opened":return "Opened a fresh pack";
    case "already_open":return "Marked a pack already in use";
    case "finished":return "Finished a pack";
    case "used":return "Used one packet";
    case "stock":return e.action.count===null?"Spare stock set to unknown":`Spare stock: ${e.action.count} packs`;
    case "queue":return `Shopping list: ${e.action.count} packs`;
    case "undo":return "Undid the previous update";
  }
}
function stockLabel(s:PackState) {
  if(s.unopenedPacks===null) return "Spare stock unknown";
  return `${s.unopenedPacks} ${s.unopenedPacks===1?"spare pack":"spare packs"}`;
}
export default function Groceries() {
  const [events,setEvents]=useState<GroceryEvent[]>([]);
  const [today,setToday]=useState(todayInAmsterdam());
  const [loaded,setLoaded]=useState(false);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string|null>(null);
  const [signIn,setSignIn]=useState(false);
  const [saving,setSaving]=useState(false);
  const [selected,setSelected]=useState<Product|null>(null);
  const [date,setDate]=useState(today);
  const [stockInput,setStockInput]=useState("");
  const states=useMemo(()=>Object.fromEntries(PRODUCTS.map(p=>[p.id,stateFor(p.id,events)])),[events]);
  const queue=PRODUCTS.filter(p=>states[p.id].queuePacks>0);
  const observed=PRODUCTS.filter(p=>estimate(p,states[p.id]).daysPerPack!==null).length;
  const total=queueTotal(PRODUCTS,events);
  const basketUrl=ahBasketUrl(queue.map(p=>({productId:p.id,quantity:states[p.id].queuePacks})));
  const disabled=!loaded||saving||loading;

  async function load() {
    setLoading(true);setError(null);
    try {
      const response=await fetch("/api/groceries",{cache:"no-store"});
      const result=await response.json() as ApiResult;
      if(!response.ok) {setSignIn(response.status===401);throw new Error(result.error||"Your groceries couldn't be loaded.");}
      if(!result.events||!result.today)throw new Error("Your groceries couldn't be loaded. Please try again.");
      setEvents(result.events);setToday(result.today);setLoaded(true);setSignIn(false);
    } catch(e) {setError(e instanceof Error?e.message:"Your groceries couldn't be loaded.");}
    finally {setLoading(false);}
  }
  useEffect(()=>{void load();},[]);
  useEffect(()=>{const refresh=()=>{if(!saving&&!loading)void load();};window.addEventListener("focus",refresh);return()=>window.removeEventListener("focus",refresh);},[saving,loading]);

  async function update(product:Product,action:Action,occurredOn=today) {
    if(disabled)return;
    setSaving(true);
    try {
      const response=await fetch("/api/groceries",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:crypto.randomUUID(),productId:product.id,version:states[product.id].version,action,occurredOn})});
      const result=await response.json() as ApiResult;
      if(result.events)setEvents(result.events);
      if(!response.ok)throw new Error(result.error||"Couldn't save your update.");
      if(!result.events||!result.today)throw new Error("The update couldn't be confirmed. Reload before trying again.");
      setToday(result.today);toast.success(action.kind==="undo"?"Update undone":"Saved");
      return true;
    } catch(e) {toast.error(e instanceof Error?e.message:"Couldn't confirm your update. Refreshing your groceries.");await load();return false;}
    finally {setSaving(false);}
  }
  function openProduct(p:Product) {setSelected(p);setDate(today);setStockInput(states[p.id].unopenedPacks===null?"":String(states[p.id].unopenedPacks));}
  async function log(action:Action) {if(selected && await update(selected,action,date))setSelected(null);}
  const detail=selected?states[selected.id]:null;
  const detailEstimate=selected&&detail?estimate(selected,detail):null;

  return <main className="workspace">
    <Toaster position="bottom-center" richColors />
    <nav className="grocery-views" aria-label="Groceries"><a href="/groceries">Shopping list</a><a href="/groceries/stock" aria-current="page">At home</a></nav>
    <div className="page-heading"><div><h1>At home</h1><p className="intro">Log usage or add a pack to your shopping list.</p></div><div className="learning-pill"><Clock3 size={16}/>{observed===13?"Estimates ready":"Learning your routine"}</div></div>
    {error && <div className="error-banner" role="alert"><p>{error}</p>{signIn?<a href="/signin-with-chatgpt?return_to=%2F" target="_top">Sign in with ChatGPT</a>:<Button variant="outline" onClick={()=>void load()} disabled={loading}>Try again</Button>}</div>}

    <div className="content-grid"><section className="essentials" aria-label="Your selected products"><div className="list-heading"><h2>At home</h2><span>{loading?"Loading your stock…":"Track one whole pack at a time"}</span></div>
      {Array.from(new Set(PRODUCTS.map(p=>p.category))).map(category=><section className="product-group" key={category}><h3 className="category-label">{category}</h3><div className="product-list">{PRODUCTS.filter(p=>p.category===category).map(p=>{
        const s=states[p.id];const prediction=estimate(p,s);
        return <article className="product-row" key={p.id}>
          <a href={p.url} target="_blank" rel="noreferrer" className="product-image-link" aria-label={`View ${p.name} at AH`}><img src={p.image} alt={p.name} width={72} height={72} loading="lazy"/></a>
          <div className="product-info"><a href={p.url} target="_blank" rel="noreferrer" className="product-name">{p.shortName}<ArrowUpRight size={13}/></a><p className="product-pack">{p.pack}</p><p className="product-price">{euro(p.priceCents)} <span>per pack</span></p></div>
          <div className="product-status"><span className={s.inUse?"stock-status in-use":"stock-status"}>{!loaded?"Loading…":s.inUse?(s.openedOn?`Opened ${dateLabel(s.openedOn)}`:"Already in use"):s.lastUsageOn?(p.mode==="usage"?`Last used ${dateLabel(s.lastUsageOn)}`:"Next pack not started"):"Not tracking yet"}</span><button className="stock-link" onClick={()=>openProduct(p)} disabled={disabled}>{stockLabel(s)}<ChevronRight size={13}/></button><p className="forecast">{prediction.refillOn?`Refill around ${dateLabel(prediction.refillOn)}`:prediction.daysPerPack!==null?`${period(prediction.daysPerPack)} per pack`:"Refill date still unknown"}</p>{prediction.daysPerPack!==null&&<span className="estimate-confidence">{prediction.tentative?"Early estimate":`${prediction.observations} observations`}</span>}</div>
          <div className="product-actions"><Button className="track-button" variant={s.inUse?"default":"outline"} disabled={disabled} onClick={()=>p.mode==="usage"?void update(p,{kind:"used"}):openProduct(p)}>{p.mode==="usage"?"Used one":s.inUse?"Log finish":"Start tracking"}</Button><Button variant="ghost" size="icon" className="queue-button" disabled={disabled||s.queuePacks>=99} onClick={()=>void update(p,{kind:"queue",count:s.queuePacks+1})} aria-label={`Add one pack of ${p.shortName} to shopping list`} title="Add to shopping list"><Plus size={18}/></Button></div>
        </article>;
      })}</div></section>)}
      <p className="price-note">Displayed prices checked {dateLabel(PRICE_CHECKED_ON)} 2026. AH confirms prices, offers and availability for your delivery.</p>
    </section>
    <aside className="refill-column"><section className="refill-card"><div className="refill-heading"><span className="refill-icon"><ShoppingBag size={21}/></span><h2>Shopping list</h2></div><p className="refill-intro">The same list as your shopping page.</p>
      {queue.length===0?<div className="queue-empty"><Package size={34} strokeWidth={1.3}/><h3>Nothing on the list yet.</h3><p>Use <strong>+</strong> beside an essential to add it to your list.</p></div>:<ul className="queue-items">{queue.map(p=><li key={p.id}><div className="queue-item-name"><a href={p.url} target="_blank" rel="noreferrer">{p.shortName}<ArrowUpRight size={13}/></a><span>{euro(p.priceCents*states[p.id].queuePacks)}</span></div><div className="quantity-control"><Button size="icon" variant="ghost" disabled={disabled} aria-label={`Remove one ${p.shortName} pack from shopping list`} onClick={()=>void update(p,{kind:"queue",count:states[p.id].queuePacks-1})}><Minus size={14}/></Button><span aria-live="polite">{states[p.id].queuePacks}</span><Button size="icon" variant="ghost" disabled={disabled||states[p.id].queuePacks>=99} aria-label={`Add one ${p.shortName} pack to shopping list`} onClick={()=>void update(p,{kind:"queue",count:states[p.id].queuePacks+1})}><Plus size={14}/></Button><small>{p.mode==="usage"?"packets":"packs"}</small></div></li>)}</ul>}
      <div className="subtotal"><span>Estimated products</span><strong>{euro(total)}</strong></div><p className="delivery-cost-note">Delivery charges and deposits are additional.</p><p className="delivery-cost-note">{total<5000?`${euro(5000-total)} to the delivery minimum`:'Delivery minimum reached · estimated'}</p><Button className="shopping-primary" asChild><a href="/groceries">Review shopping list<ChevronRight size={16}/></a></Button>{basketUrl&&!disabled&&<Button variant="outline" className="shopping-primary" asChild><a href={basketUrl}>Add all to AH<ArrowUpRight size={16}/></a></Button>}<details className="legacy-connector"><summary>Desktop connector (optional)</summary><AHConnection lines={queue.map(p=>({productId:p.id,quantity:states[p.id].queuePacks}))} disabled={disabled}/></details>
    </section><details className="how-card"><summary>How usage estimates work</summary><ol><li><span>1</span><p>Open a fresh pack.<small>Or mark one as already in use.</small></p></li><li><span>2</span><p>Log when you finish it.<small>A partly used first pack won't skew the estimate.</small></p></li><li><span>3</span><p>See your refill rhythm.<small>Add spare stock to estimate when you'll need more.</small></p></li></ol></details></aside></div>
    <footer className="page-footer"><span>life-app</span><p>Household essentials · Albert Heijn</p></footer>
    <Dialog open={!!selected} onOpenChange={open=>{if(!open&&!saving)setSelected(null);}}><DialogContent className="product-dialog"><DialogHeader><DialogTitle>{selected?.shortName}</DialogTitle><DialogDescription>{selected?.name} · {selected?.pack}</DialogDescription></DialogHeader>{selected&&detail&&<>
      <section className="dialog-section"><h3>Record usage</h3><Label htmlFor="usage-date">Date</Label><Input id="usage-date" type="date" value={date} max={today} min={detail.lastUsageOn??"2000-01-01"} onChange={e=>setDate(e.target.value)} disabled={saving}/>
        {selected.mode==="usage"?<><p className="field-help">Log each packet you use. We'll estimate your pace from the time between uses.</p><Button onClick={()=>void log({kind:"used"})} disabled={disabled}>Used one packet</Button></>:detail.inUse?<><p className="field-help">{detail.openedOn?`This pack was opened on ${dateLabel(detail.openedOn)}.`:"This pack was already in use, so it won't count as a full-pack measurement."}</p><Button onClick={()=>void log({kind:"finished"})} disabled={disabled}><Check size={16}/>Finished this pack</Button></>:<><div className="start-options"><Button onClick={()=>void log({kind:"opened"})} disabled={disabled}>Opened a fresh pack</Button><Button variant="outline" onClick={()=>void log({kind:"already_open"})} disabled={disabled}>Already in use</Button></div><p className="field-help">Track the whole listed pack: all bottles, rolls or pocket packs inside it. “Already in use” leaves its start date unknown.</p></>}
      </section>
      <section className="dialog-section"><h3>Spare stock</h3><Label htmlFor="spare-packs">Unopened packs at home</Label><div className="stock-form"><Input id="spare-packs" type="number" min="0" max="999" step="1" inputMode="numeric" value={stockInput} placeholder="Unknown" onChange={e=>setStockInput(e.target.value)} disabled={saving}/><Button variant="outline" disabled={disabled} onClick={()=>void update(selected,{kind:"stock",count:stockInput.trim()===""?null:Number(stockInput)})}>Save stock</Button></div><p className="field-help">Exclude the pack already in use. Leave blank if you're not sure.</p></section>
      {detailEstimate?.daysPerPack!==null&&detailEstimate?.daysPerPack!==undefined&&<div className="detail-estimate"><Clock3 size={18}/><p><strong>{period(detailEstimate.daysPerPack)} per pack</strong><br/>{detailEstimate.tentative?"An early estimate. More observations will improve it.":`Based on ${detailEstimate.observations} recent observations.`}</p></div>}
      <section className="dialog-section recent-updates"><div className="recent-heading"><h3>Recent updates</h3>{detail.lastActionId&&<Button variant="ghost" size="sm" disabled={disabled} onClick={()=>void update(selected,{kind:"undo",targetId:detail.lastActionId!})}><RotateCcw size={14}/>Undo latest</Button>}</div>{detail.effectiveEvents.length?<ul>{detail.effectiveEvents.slice(-4).reverse().map(e=><li key={e.id}><span>{actionLabel(e)}</span><time>{dateLabel(e.occurredOn)}</time></li>)}</ul>:<p className="field-help">Your first update will appear here.</p>}</section>
    </>}</DialogContent></Dialog>
  </main>;
}
