"use client";
import { useEffect, useState } from "react";
import { ArrowRight, BookOpen, ShoppingBasket, Archive, ListTodo, Plus } from "lucide-react";
import QuickCapture from "./quick-capture";
import type { HomeOverview } from "@/lib/home";

export default function Home() {
  const [overview,setOverview]=useState<HomeOverview|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState("");
  async function load(){try{const response=await fetch('/api/home',{cache:'no-store'});if(!response.ok)throw Error('Your overview could not be loaded.');setOverview(await response.json() as HomeOverview);setError('');}catch(e){setError(e instanceof Error?e.message:'Your overview could not be loaded.');}finally{setLoading(false);}}
  useEffect(()=>{void load();const focus=()=>void load();window.addEventListener('focus',focus);return()=>window.removeEventListener('focus',focus);},[]);
  const euro=(cents:number)=>new Intl.NumberFormat('nl-NL',{style:'currency',currency:'EUR'}).format(cents/100);
  return <main className="life-home life-working-home">
    <div className="life-home-heading"><h1>Home</h1></div>
    <QuickCapture onSaved={()=>void load()}/>
    {error&&<p className="home-error" role="alert">{error} <button onClick={()=>void load()}>Try again</button></p>}
    <div className="life-task-list">
      <section className="life-task life-task-todo">
        <div className="life-task-heading"><ListTodo size={22}/><h2>To-do</h2><a href="/todo">All tasks <ArrowRight size={16}/></a></div>
        <p className="life-todo-count">{loading?'Loading your tasks…':overview?.todo?overview.todo.count?`${overview.todo.count} open ${overview.todo.count===1?'task':'tasks'}`:'All clear — nothing to do.':'Tasks are unavailable. Open To-do to retry.'}</p>
        {overview?.todo?.tasks.map(task=><a className="life-todo-preview" key={task.id} href={'/todo?task='+encodeURIComponent(task.id)}><span>{task.title}</span><ArrowRight size={17}/></a>)}
        <a className="life-task-secondary life-todo-add" href="/todo?add=1"><Plus size={17}/> Add a task</a>
      </section>
      <section className="life-task life-task-study">
        <div className="life-task-heading"><BookOpen size={22}/><h2>Study</h2><a href="/study">All coursework <ArrowRight size={16}/></a></div>
        {overview?.study?.resume&&<a className="life-resume" href={overview.study.resume.href}><span className="life-resume-label">Continue studying</span><strong>{overview.study.resume.title}</strong>{overview.study.resume.note&&<span className="life-resume-note">{overview.study.resume.note}</span>}<ArrowRight size={20}/></a>}
        <div className="life-current-courses">{(overview?.study?.courses||[{id:'enlightenment',name:'Enlightenment',week:null,title:null,done:0,total:0},{id:'moral',name:'Moral Philosophy',week:null,title:null,done:0,total:0}]).map(c=><a key={c.id} href={c.week?`/study#study-${c.id}-${c.week}`:'/study#coursework'}><div><strong>{c.name}</strong><span>{loading?'Loading your week…':!overview?.study?'Open Study to load your week':c.week?`Week ${c.week} · ${c.done}/${c.total} readings done`:'Set your teaching week'}</span>{c.title&&<small>{c.title}</small>}</div><ArrowRight size={17}/></a>)}</div>
      </section>
      <section className="life-task life-task-groceries"><div className="life-task-heading"><ShoppingBasket size={22}/><h2>Groceries</h2></div><a className="life-task-action" href="/groceries"><div><strong>Open shopping list</strong><span>{loading?'Loading your list…':overview?.groceries?`${overview.groceries.packs} packs · ${euro(overview.groceries.total)} estimated`:'Open Groceries to load your list'}</span></div><ArrowRight size={20}/></a><a className="life-task-secondary" href="/groceries/stock">At home · log usage and stock</a></section>
      <section className="life-task life-task-vault"><div className="life-task-heading"><Archive size={22}/><h2>Vault</h2></div><a className="life-task-action" href="/vault"><div><strong>Find something saved</strong><span>{loading?'Loading your archive…':overview?.vault?`${overview.vault.count} saved items`:'Open Vault to load your items'}</span></div><ArrowRight size={20}/></a>{overview?.vault?.latest&&<a className="life-task-secondary" href={'/vault?item='+encodeURIComponent(overview.vault.latest.id)}>Last saved: {overview.vault.latest.title}</a>}</section>
    </div>
  </main>;
}
