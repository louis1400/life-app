"use client";
import { useEffect, useState } from "react";
import { ArrowUpRight, Minus, Plus, ShoppingBasket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PRODUCTS } from "@/lib/groceries/catalog";

export default function Essentials() {
  const [quantities,setQuantities]=useState<Record<string,number>>({});
  const [loaded,setLoaded]=useState(false);
  useEffect(()=>{
    try {
      const saved=JSON.parse(localStorage.getItem("life-app:ah-selection:v1")||"{}");
      if(saved&&typeof saved==="object")setQuantities(Object.fromEntries(PRODUCTS.map(p=>[p.id,Number.isInteger(saved[p.id])?Math.max(0,Math.min(99,saved[p.id])):0])));
    } catch { /* The selection still works when browser storage is unavailable. */ }
    setLoaded(true);
  },[]);
  useEffect(()=>{
    if(loaded)try {localStorage.setItem("life-app:ah-selection:v1",JSON.stringify(quantities));} catch { /* Optional persistence. */ }
  },[quantities,loaded]);
  function quantity(id:string,value:number) {
    setQuantities(previous=>({...previous,[id]:Number.isFinite(value)?Math.max(0,Math.min(99,Math.trunc(value))):0}));
  }
  const selected=PRODUCTS.filter(p=>(quantities[p.id]||0)>0);
  const packs=selected.reduce((sum,p)=>sum+quantities[p.id],0);
  const subtotal=selected.reduce((sum,p)=>sum+p.priceCents*quantities[p.id],0);
  const basketUrl="https://www.ah.nl/mijnlijst/add-multiple?"+new URLSearchParams(selected.map(p=>["p",`${p.id.replace(/^wi/,"")}:${quantities[p.id]}`])).toString();
  const euro=(cents:number)=>new Intl.NumberFormat("nl-NL",{style:"currency",currency:"EUR"}).format(cents/100);
  return <main className="workspace shop-workspace">
    <header className="masthead"><a className="wordmark" href="/"><span className="brand-mark">l</span>life-app</a><span className="header-divider"/><span className="section-label">Groceries</span><a className="stock-navigation" href="/stock">Stock tracking</a></header>
    <div className="page-heading"><div><h1>Your AH essentials.</h1><p className="intro">Choose your quantities, then add everything to AH.</p></div><Button variant="outline" asChild><a href="https://www.ah.nl/mijnlijst">Open AH basket<ArrowUpRight size={16}/></a></Button></div>
    <p className="shop-connection-hint">Amounts are packs. AH opens in this tab and may ask you to tap “Toevoegen aan winkelmandje”.</p>
    <div className="shop-groups">{Array.from(new Set(PRODUCTS.map(p=>p.category))).map(category=><section className="product-group" key={category}><h2 className="category-label">{category}</h2><div className="product-list">{PRODUCTS.filter(p=>p.category===category).map(p=><article className="shop-product" key={p.id}>
      <a href={p.url} aria-label={`View ${p.name} at AH`}><img src={p.image} alt="" width={64} height={72}/></a>
      <div className="product-info"><a className="product-name" href={p.url}>{p.shortName}<ArrowUpRight size={13}/></a><p className="product-pack">{p.pack}</p><p className="product-price">{euro(p.priceCents)} <span>estimated per pack</span></p></div>
      <div className="shop-quantity" role="group" aria-label={`Quantity of ${p.shortName}`}>
        <Button variant="outline" size="icon" disabled={!loaded||!quantities[p.id]} onClick={()=>quantity(p.id,(quantities[p.id]||0)-1)} aria-label={`One fewer pack of ${p.shortName}`}><Minus size={16}/></Button>
        <Input type="number" min={0} max={99} step={1} inputMode="numeric" value={quantities[p.id]||0} disabled={!loaded} onChange={event=>quantity(p.id,event.target.valueAsNumber)} aria-label={`Packs of ${p.shortName}`}/>
        <Button variant="outline" size="icon" disabled={!loaded||(quantities[p.id]||0)>=99} onClick={()=>quantity(p.id,(quantities[p.id]||0)+1)} aria-label={`One more pack of ${p.shortName}`}><Plus size={16}/></Button>
      </div>
    </article>)}</div></section>)}</div>
    <p className="price-note">Prices last checked 7 September 2026. AH confirms current prices and availability. Choose delivery and finish checkout at AH.</p>
    <section className="shop-selection" aria-label="Selected products">
      <div aria-live="polite"><strong>{packs?`${packs} ${packs===1?"pack":"packs"} · ${selected.length} ${selected.length===1?"product":"products"}`:"Choose quantities above"}</strong>{packs>0&&<p>{euro(subtotal)} estimated</p>}</div>
      <div className="shop-selection-actions">{packs>0&&<Button variant="ghost" onClick={()=>setQuantities({})}>Clear</Button>}
      {packs>0?<Button asChild><a href={basketUrl}><ShoppingBasket size={18}/>Add all to AH</a></Button>:<Button disabled><ShoppingBasket size={18}/>Add all to AH</Button>}</div>
    </section>
  </main>;
}
