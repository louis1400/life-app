"use client";
import { ArrowUpRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PRODUCTS } from "@/lib/groceries/catalog";

export default function Essentials() {
  const euro=(cents:number)=>new Intl.NumberFormat("nl-NL",{style:"currency",currency:"EUR"}).format(cents/100);
  return <main className="workspace shop-workspace">
    <header className="masthead"><a className="wordmark" href="/"><span className="brand-mark">l</span>life-app</a><span className="header-divider"/><span className="section-label">Groceries</span><a className="stock-navigation" href="/stock">Stock tracking</a></header>
    <div className="page-heading"><div><h1>Your AH essentials.</h1><p className="intro">Choose a product to add one pack at AH.</p></div><Button variant="outline" asChild><a href="https://www.ah.nl/mijnlijst">Open AH basket<ArrowUpRight size={16}/></a></Button></div>
    <p className="shop-connection-hint">Opens AH in this tab. If asked, tap “Toevoegen aan winkelmandje”. Use Back to choose another product.</p>
    <div className="shop-groups">{Array.from(new Set(PRODUCTS.map(p=>p.category))).map(category=><section className="product-group" key={category}><h2 className="category-label">{category}</h2><div className="product-list">{PRODUCTS.filter(p=>p.category===category).map(p=><article className="shop-product" key={p.id}>
      <a href={p.url} aria-label={`View ${p.name} at AH`}><img src={p.image} alt="" width={64} height={72}/></a>
      <div className="product-info"><a className="product-name" href={p.url}>{p.shortName}<ArrowUpRight size={13}/></a><p className="product-pack">{p.pack}</p><p className="product-price">{euro(p.priceCents)} <span>estimated per pack</span></p></div>
      <Button asChild>
        <a href={`https://www.ah.nl/mijnlijst/add-multiple?p=${p.id.replace(/^wi/,"")}%3A1`} aria-label={`Add one pack of ${p.shortName} at AH`}><Plus size={16}/>Add to AH</a>
      </Button>
    </article>)}</div></section>)}</div>
    <p className="price-note">Prices last checked 7 September 2026. AH confirms current prices and availability. Choose delivery and finish checkout at AH.</p>
  </main>;
}
