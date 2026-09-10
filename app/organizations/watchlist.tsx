"use client";
import { useEffect, useState, type FormEvent } from "react";
import { Building2, ExternalLink, Plus } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "../../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { organizationInput, statuses, type Organization } from "../../lib/organizations/model";
import styles from "./watchlist.module.css";

type WatchlistResponse = { organizations: Organization[]; error?: string };

export default function Watchlist() {
  const [items,setItems] = useState<Organization[]>([]), [loading,setLoading] = useState(true);
  const [error,setError] = useState(""), [saveError,setSaveError] = useState(""), [notice,setNotice] = useState("");
  const [draft,setDraft] = useState<Organization|null>(null), [saving,setSaving] = useState(false);
  const [tab,setTab] = useState("following");
  async function load() {
    setLoading(true); setError("");
    try { const response=await fetch("/api/organizations",{cache:"no-store"}); const data=await response.json() as WatchlistResponse; if(!response.ok) throw Error(data.error || "Couldn’t load your watchlist."); setItems(data.organizations); }
    catch(e) { setError(e instanceof Error ? e.message : "Couldn’t load your watchlist."); }
    finally { setLoading(false); }
  }
  useEffect(()=>{void load();},[]);
  const dirty = !!draft && JSON.stringify(draft)!==JSON.stringify(items.find(o=>o.id===draft.id));
  useEffect(()=>{
    if(!dirty) return;
    const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();};
    window.addEventListener("beforeunload",warn); return ()=>window.removeEventListener("beforeunload",warn);
  },[dirty]);
  function edit(item:Organization) { setSaveError(""); setDraft({...item}); }
  function close() { if(!saving && (!dirty || window.confirm("Discard your unsaved changes?"))) {setDraft(null);setSaveError("");} }
  async function save(event:FormEvent) {
    event.preventDefault(); if(!draft || saving) return;
    const parsed=organizationInput.safeParse(draft);
    if(!parsed.success) {setSaveError(parsed.error.issues[0]?.message || "Check your entry.");return;}
    setSaving(true);setSaveError("");
    try {
      const response=await fetch("/api/organizations",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(parsed.data)});
      const data=await response.json() as WatchlistResponse;
      if(!response.ok) { if(response.status===409) void load(); throw Error(data.error); }
      setItems(data.organizations);setNotice("Organization saved.");setDraft(null);
    } catch(e) {setSaveError(e instanceof Error?e.message:"Save not confirmed. Your draft is kept; try again.");}
    finally {setSaving(false);}
  }
  const shown=items.filter(o=>o.archived===(tab==="archived"));
  return <main className={styles.workspace}>
    <div className={styles.heading}><div><p className={styles.eyebrow}>WORK</p><h1>Organization watchlist</h1><p>Places I would like to work.</p></div>
    <Button disabled={loading||!!error} onClick={()=>edit({id:crypto.randomUUID(),name:"",url:"",reason:"",notes:"",nextStep:"",status:"Watching",archived:false,version:0})}><Plus size={18}/>Add organization</Button></div>
    <aside className={styles.profile} aria-label="Work preferences"><strong>What fits my life now</strong><div><span>16–32 hours / week</span><span>Currently a student</span><span>Bachelor’s expected in 2027</span></div><p>Check hours, required experience and whether a completed degree is needed before applying.</p></aside>
    <div className={styles.toolbar}><Tabs value={tab} onValueChange={setTab}><TabsList><TabsTrigger value="following">Following ({items.filter(o=>!o.archived).length})</TabsTrigger><TabsTrigger value="archived">Archived ({items.filter(o=>o.archived).length})</TabsTrigger></TabsList></Tabs><span>Manual watchlist · no automatic vacancy alerts</span></div>
    <p role="status" className={styles.notice}>{notice}</p>
    {error && <div role="alert" className={styles.error}>{error} <Button variant="outline" onClick={()=>void load()}>Try again</Button></div>}
    {loading?<p role="status">Loading your organizations…</p>:!error && <div className={styles.grid}>
      {shown.map(o=><article className={styles.card} key={o.id}>
        <div className={styles.cardTop}><span className={styles.icon}><Building2 size={24}/></span><span className={styles.status}>{o.status}</span></div>
        <h2>{o.name}</h2><p className={styles.reason}>{o.reason || "Add what draws you to this organization."}</p>
        <div className={styles.next}><strong>Next step</strong><p>{o.nextStep || "Choose a first step."}</p></div>
        {o.notes && <p className={styles.notes}>{o.notes}</p>}
        <div className={styles.actions}><a href={o.url} target="_blank" rel="noopener noreferrer">Visit careers page <ExternalLink size={16}/></a><Button variant="outline" onClick={()=>edit(o)}>Edit</Button></div>
      </article>)}
      {!shown.length && <p className={styles.empty}>{tab==="archived"?"No archived organizations.":"Your watchlist is empty. Add a place you would like to work."}</p>}
    </div>}
    <Dialog open={!!draft} onOpenChange={open=>{if(!open)close();}}><DialogContent className={styles.dialog} showCloseButton={!saving}>
      <DialogTitle>{draft?.version===0?"Add organization":"Edit organization"}</DialogTitle><DialogDescription>Keep your connection, notes and next step together.</DialogDescription>
      {draft && <form onSubmit={save} className={styles.form}><fieldset disabled={saving}>
        <label>Organization name<Input required maxLength={200} value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></label>
        <label>Careers page or website<Input required type="url" maxLength={2000} placeholder="https://…" value={draft.url} onChange={e=>setDraft({...draft,url:e.target.value})}/></label>
        <label>Why I’m interested<Textarea maxLength={2000} value={draft.reason} onChange={e=>setDraft({...draft,reason:e.target.value})}/></label>
        <label>Next step<Input maxLength={1000} value={draft.nextStep} onChange={e=>setDraft({...draft,nextStep:e.target.value})}/></label>
        <label>Notes<Textarea rows={4} maxLength={6000} value={draft.notes} onChange={e=>setDraft({...draft,notes:e.target.value})}/></label>
        <div className={styles.formRow}><div><label id="watch-status-label">Status</label><Select value={draft.status} onValueChange={status=>setDraft({...draft,status:status as Organization["status"]})}><SelectTrigger aria-labelledby="watch-status-label"><SelectValue/></SelectTrigger><SelectContent>{statuses.map(status=><SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent></Select></div>
        <div><label id="watch-location-label">List</label><Select value={draft.archived?"archived":"following"} onValueChange={value=>setDraft({...draft,archived:value==="archived"})}><SelectTrigger aria-labelledby="watch-location-label"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="following">Following</SelectItem><SelectItem value="archived">Archived</SelectItem></SelectContent></Select></div></div>
      </fieldset>
      {saveError&&<p role="alert" className={styles.error}>{saveError}</p>}
      <div className={styles.formActions}><Button type="button" variant="outline" disabled={saving} onClick={close}>Cancel</Button><Button type="submit" disabled={saving}>{saving?"Saving…":"Save organization"}</Button></div></form>}
    </DialogContent></Dialog>
  </main>;
}
