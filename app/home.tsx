"use client";

import { useEffect, useState } from "react";
import { ArrowRight, BookOpen, ShoppingBasket, Archive, Clock3 } from "lucide-react";
import { PRODUCTS } from "@/lib/groceries/catalog";

type Overview = { coursework: number | null; vault: number | null; progress: number | null };
type CourseworkResponse = { entries: { id: string; data: { progress?: string } }[] };
type VaultResponse = { items: unknown[] };

export default function Home() {
  const [overview, setOverview] = useState<Overview>({ coursework: null, vault: null, progress: null });
  const [packs, setPacks] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    try {
      const selected = JSON.parse(localStorage.getItem("life-app:ah-selection:v1") || "{}");
      setPacks(PRODUCTS.reduce((sum, p) => sum + (Number.isInteger(selected?.[p.id]) ? Math.max(0, Math.min(99, selected[p.id])) : 0), 0));
    } catch { setPacks(0); }
    async function load() {
      const results = await Promise.allSettled([
        fetch("/api/coursework").then(async r => { if (!r.ok) throw Error(); return r.json() as Promise<CourseworkResponse>; }),
        fetch("/api/items").then(async r => { if (!r.ok) throw Error(); return r.json() as Promise<VaultResponse>; }),
      ]);
      if (!alive) return;
      const coursework = results[0].status === "fulfilled" ? results[0].value.entries : null;
      setOverview({ coursework: coursework?.filter(e => e.id.startsWith("session:")).length ?? null, progress: coursework?.filter(e => e.id.startsWith("reading:") && e.data.progress === "done").length ?? null, vault: results[1].status === "fulfilled" ? results[1].value.items.length : null });
    }
    load();
    return () => { alive = false; };
  }, []);
  return <main className="life-home">
    <div className="life-home-heading"><p className="life-kicker">YOUR EVERYDAY SPACE</p><h1>What’s on your mind?</h1><p>Pick up your studies, restock the essentials, or revisit a saved find.</p></div>
    <div className="life-module-grid">
      <section className="life-module-card life-study-card">
        <div className="life-card-heading"><span className="life-module-icon"><BookOpen size={24}/></span><span className="life-card-number">01</span></div>
        <h2>Study</h2><p className="life-card-description">Your coursework, with a place for every reading and thought.</p>
        <div className="life-study-courses"><a href="/study#study-enlightenment-1"><span>Enlightenment</span><span>Weeks 1–8 <ArrowRight size={15}/></span></a><a href="/study#study-moral-1"><span>Moral Philosophy</span><span>Weeks 1–8 <ArrowRight size={15}/></span></a></div>
        <div className="life-card-meta"><Clock3 size={15}/>{overview.progress === null ? "Open Study to load your progress" : `${overview.progress} ${overview.progress === 1 ? "reading" : "readings"} completed · ${overview.coursework} saved ${overview.coursework === 1 ? "session" : "sessions"}`}</div>
        <a className="life-card-action" href="/study">Open Study <ArrowRight size={18}/></a>
      </section>
      <section className="life-module-card life-grocery-card">
        <div className="life-card-heading"><span className="life-module-icon"><ShoppingBasket size={24}/></span><span className="life-card-number">02</span></div>
        <h2>Groceries</h2><p className="life-card-description">Your Albert Heijn essentials, ready for the next refill.</p>
        <div className="life-product-strip" aria-label="Some of your essentials">{PRODUCTS.slice(0, 3).map(p => <img key={p.id} src={p.image} alt={p.shortName} width={62} height={76}/>)}</div>
        <div className="life-card-meta">{PRODUCTS.length} essentials · {packs === null ? "Loading selection…" : `${packs} ${packs === 1 ? "pack" : "packs"} selected`}</div>
        <a className="life-card-action" href="/groceries">Plan groceries <ArrowRight size={18}/></a>
      </section>
      <section className="life-module-card life-vault-card">
        <div className="life-card-heading"><span className="life-module-icon"><Archive size={24}/></span><span className="life-card-number">03</span></div>
        <h2>Vault</h2><p className="life-card-description">The articles, memes, files, and ideas you want to keep.</p>
        <div className="life-collection-list"><span>Reading</span><span>Study</span><span>Reactions</span><span>Watch later</span></div>
        <div className="life-card-meta">{overview.vault === null ? "Open Vault to load your collection" : `${overview.vault} saved ${overview.vault === 1 ? "find" : "finds"}`}</div>
        <a className="life-card-action" href="/vault">Open Vault <ArrowRight size={18}/></a>
      </section>
    </div>
    <div className="life-home-secondary"><span>{process.env.NODE_ENV === "development" ? "Preview data stays on this computer. Your live app data is separate." : "Your personal space, all in one place."}</span><a href="/groceries/stock">Track what’s running low <ArrowRight size={16}/></a></div>
  </main>;
}
