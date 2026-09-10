"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Minus, Plus, ShoppingBasket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PRODUCTS } from "@/lib/groceries/catalog";
import { stateFor } from "@/lib/groceries/model";
import { ahBasketUrl, loadGroceries, saveQuantity, type GrocerySnapshot } from "@/lib/groceries/list";
const euro=(cents:number)=>new Intl.NumberFormat("nl-NL",{style:"currency",currency:"EUR"}).format(cents/100);
const LEGACY_KEY="life-app:ah-selection:v1";

function Quantity({value,disabled,name,onSave}:{value:number;disabled:boolean;name:string;onSave:(value:number)=>void}) {
  const [draft,setDraft]=useState(String(value));
  useEffect(()=>{if(!disabled)setDraft(String(value));},[value,disabled]);
  function commit(){const count=Number(draft);if(!Number.isInteger(count)||count<0||count>999){setDraft(String(value));return;}if(count!==value)onSave(count);}
  return <Input type="number" min={0} max={999} step={1} inputMode="numeric" value={draft} disabled={disabled} onChange={e=>setDraft(e.target.value)} onBlur={commit} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();if(e.key==='Escape')setDraft(String(value));}} aria-label={`Packs of ${name}`}/>;
}
export default function Essentials() {
  const [snapshot,setSnapshot]=useState<GrocerySnapshot|null>(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[status,setStatus]=useState("");
  const [legacy,setLegacy]=useState<Record<string,number>|null>(null);
  const lock=useRef(false),legacyRaw=useRef<string|null>(null);
  async function reload(){if(lock.current)return;lock.current=true;setBusy(true);try{setSnapshot(await loadGroceries());setError("");}catch(e){setError(e instanceof Error?e.message:"Could not load the shopping list.");}finally{lock.current=false;setBusy(false);}}
  useEffect(()=>{
    void reload();
    try{const raw=localStorage.getItem(LEGACY_KEY);const saved=JSON.parse(raw||"{}");const lines=Object.fromEntries(PRODUCTS.filter(p=>Number.isInteger(saved?.[p.id])&&saved[p.id]>0).map(p=>[p.id,Math.min(99,saved[p.id])]));if(Object.keys(lines).length){legacyRaw.current=raw;setLegacy(lines);}}catch{}
    const focus=()=>void reload();window.addEventListener("focus",focus);return()=>window.removeEventListener("focus",focus);
  },[]);
  async function change(counts:Record<string,number>,importing=false){
    if(lock.current||!snapshot)return;lock.current=true;setBusy(true);setError("");setStatus("Saving…");let current=snapshot;
    try{
      for(const [id,count] of Object.entries(counts)){if(stateFor(id,current.events).queuePacks===count)continue;current=await saveQuantity(current,id,count);setSnapshot(current);}
      setStatus("Shopping list saved.");
      if(importing){try{if(localStorage.getItem(LEGACY_KEY)===legacyRaw.current)localStorage.removeItem(LEGACY_KEY);}catch{}setLegacy(null);}
    }catch(e){setError(e instanceof Error?e.message:"Could not save your change.");setStatus("");try{setSnapshot(await loadGroceries());}catch{setSnapshot(null);}}
    finally{lock.current=false;setBusy(false);}
  }
  const quantities=Object.fromEntries(PRODUCTS.map(p=>[p.id,snapshot?stateFor(p.id,snapshot.events).queuePacks:0]));
  const selected=PRODUCTS.filter(p=>quantities[p.id]>0),packs=selected.reduce((sum,p)=>sum+quantities[p.id],0);
  const subtotal=selected.reduce((sum,p)=>sum+p.priceCents*quantities[p.id],0),remaining=Math.max(0,5000-subtotal);
  const basketUrl=ahBasketUrl(selected.map(p=>({productId:p.id,quantity:quantities[p.id]}))),disabled=busy||!snapshot;
  return <main className="workspace shop-workspace">
    <nav className="grocery-views" aria-label="Groceries"><a href="/groceries" aria-current="page">Shopping list</a><a href="/groceries/stock">At home</a></nav>
    <div className="page-heading"><div><h1>Shopping list</h1><p className="intro">{snapshot?`${packs} ${packs===1?'pack':'packs'} selected`:'Loading your list…'}</p></div><Button variant="outline" asChild><a href="https://www.ah.nl/mijnlijst">Open AH basket<ArrowUpRight size={16}/></a></Button></div>
    {error&&<div className="error-banner" role="alert"><p>{error}</p><Button variant="outline" disabled={busy} onClick={()=>void reload()}>Reload list</Button></div>}
    <p className="shopping-save-status" role="status">{status||"Shared with At home and your other devices."}</p>
    {legacy&&<details className="legacy-selection"><summary>Bring in your previous selection from this browser</summary><p>The shared list is now used on every device. Import keeps the larger quantity for each product.</p><ul>{PRODUCTS.filter(p=>legacy[p.id]).map(p=><li key={p.id}>{p.shortName}: {legacy[p.id]} packs</li>)}</ul><Button disabled={disabled} onClick={()=>void change(Object.fromEntries(Object.entries(legacy).map(([id,count])=>[id,Math.max(count,quantities[id])])),true)}>Import previous selection</Button></details>}
    <div className="shop-groups">{Array.from(new Set(PRODUCTS.map(p=>p.category))).map(category=><section className="product-group" key={category}><h2 className="category-label">{category}</h2><div className="product-list">{PRODUCTS.filter(p=>p.category===category).map(p=><article className="shop-product" key={p.id}>
      <a href={p.url} aria-label={`View ${p.name} at AH`}><img src={p.image} alt="" width={64} height={72}/></a>
      <div className="product-info"><a className="product-name" href={p.url}>{p.shortName}<ArrowUpRight size={13}/></a><p className="product-pack">{p.pack}</p><p className="product-price">{euro(p.priceCents)} <span>estimated per pack</span></p></div>
      <div className="shop-quantity" role="group" aria-label={`Quantity of ${p.shortName}`}>
        <Button variant="outline" size="icon" disabled={disabled||!quantities[p.id]} onClick={()=>void change({[p.id]:quantities[p.id]-1})} aria-label={`One fewer pack of ${p.shortName}`}><Minus size={16}/></Button>
        <Quantity value={quantities[p.id]} disabled={disabled} name={p.shortName} onSave={count=>void change({[p.id]:count})}/>
        <Button variant="outline" size="icon" disabled={disabled||quantities[p.id]>=99} onClick={()=>void change({[p.id]:quantities[p.id]+1})} aria-label={`One more pack of ${p.shortName}`}><Plus size={16}/></Button>
      </div>
    </article>)}</div></section>)}</div>
    {selected.length>0&&!basketUrl&&<p className="error-banner" role="alert">AH accepts up to 99 packs per product. Reduce larger quantities before sending the list.</p>}
    <section className="shop-selection compact-selection" aria-label="Selected products">
      <div className="shop-total" aria-live="polite"><span>Estimated total</span><strong>{snapshot?euro(subtotal):'—'}</strong><p>{snapshot?(remaining>0?`${euro(remaining)} to the delivery minimum`:'Delivery minimum reached · estimated'):'Loading…'}</p></div>
      {basketUrl&&!disabled?<Button asChild><a href={basketUrl}><ShoppingBasket size={18}/>Add all to AH</a></Button>:<Button disabled><ShoppingBasket size={18}/>Add all to AH</Button>}
      <details className="shopping-details"><summary>Details</summary><p>AH opens in this tab. Confirm “Toevoegen aan winkelmandje” there. Sending again may add more packs; check your AH basket first.</p><p>Prices checked 7 September 2026. <a href="https://www.ah.nl/klantenservice/online-bestellen/bezorging?size=50">€50 delivery minimum</a> checked 8 September 2026. Discounts, delivery, deposits and items already in AH are excluded. AH confirms the final amount.</p>{packs>0&&<Button variant="ghost" disabled={disabled} onClick={()=>void change(Object.fromEntries(selected.map(p=>[p.id,0])))}>Clear shopping list</Button>}</details>
    </section>
  </main>;
}
