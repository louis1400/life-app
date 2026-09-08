"use client";
import { useRef, useState } from "react";
import { ArrowUpRight, LoaderCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toaster, toast } from "sonner";
import AHConnection from "./ah-connection";
import { PRODUCTS } from "@/lib/groceries/catalog";
import { requestAH } from "@/lib/ah-connector";

export default function Essentials() {
  const [ready,setReady]=useState(false);
  const [adding,setAdding]=useState<string|null>(null);
  const lock=useRef(false);
  const euro=(cents:number)=>new Intl.NumberFormat("nl-NL",{style:"currency",currency:"EUR"}).format(cents/100);
  async function add(productId:string) {
    if(!ready || lock.current)return;
    lock.current=true;setAdding(productId);
    try {
      const result=await requestAH("add_one",[{productId,quantity:1}]);
      if(result.transfer?.status!=="complete" || result.status!=="connected") {
        throw new Error(result.message || result.transfer?.message || "The addition wasn't confirmed. Check AH before adding again.");
      }
      toast.success(`One pack of ${PRODUCTS.find(p=>p.id===productId)?.shortName} added to AH`);
    } catch(error) {toast.error(error instanceof Error?error.message:"Check your AH basket before trying again.");}
    finally {lock.current=false;setAdding(null);}
  }
  return <main className="workspace shop-workspace">
    <Toaster position="bottom-center" richColors/>
    <header className="masthead"><a className="wordmark" href="/"><span className="brand-mark">l</span>life-app</a><span className="header-divider"/><span className="section-label">Groceries</span><a className="stock-navigation" href="/stock">Stock tracking</a></header>
    <div className="page-heading"><div><h1>Your AH essentials.</h1><p className="intro">One click adds one pack to your AH basket.</p></div><Button variant="outline" asChild><a href="https://www.ah.nl/mijnlijst" target="_blank" rel="noreferrer">Open AH basket<ArrowUpRight size={16}/></a></Button></div>
    <section className="shop-connection" aria-label="Albert Heijn connection"><AHConnection single onReady={setReady}/></section>
    {!ready&&<p className="shop-connection-hint">Connect AH above to enable the product buttons.</p>}
    {adding&&<p className="shop-connection-hint" role="status">Adding one pack at AH and checking the result. This can take a few seconds.</p>}
    <div className="shop-groups">{Array.from(new Set(PRODUCTS.map(p=>p.category))).map(category=><section className="product-group" key={category}><h2 className="category-label">{category}</h2><div className="product-list">{PRODUCTS.filter(p=>p.category===category).map(p=><article className="shop-product" key={p.id}>
      <a href={p.url} target="_blank" rel="noreferrer" aria-label={`View ${p.name} at AH`}><img src={p.image} alt="" width={64} height={72}/></a>
      <div className="product-info"><a className="product-name" href={p.url} target="_blank" rel="noreferrer">{p.shortName}<ArrowUpRight size={13}/></a><p className="product-pack">{p.pack}</p><p className="product-price">{euro(p.priceCents)} <span>estimated per pack</span></p></div>
      <Button disabled={!ready||!!adding} onClick={()=>void add(p.id)} aria-label={`Add one pack of ${p.shortName} to AH basket`}>
        {adding===p.id?<><LoaderCircle size={16} className="ah-spinner"/>Adding…</>:<><Plus size={16}/>Add to AH</>}
      </Button>
    </article>)}</div></section>)}</div>
    <p className="price-note">Prices last checked 7 September 2026. AH confirms current prices and availability. Choose delivery and finish checkout at AH.</p>
  </main>;
}
