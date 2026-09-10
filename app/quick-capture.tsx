"use client";
import { useEffect, useRef, useState } from 'react';
import { Link2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { destinations, inferKind, type Item } from '@/lib/archive';
import { draftStore, type DraftStore } from '@/lib/drafts';
type CaptureDraft={url:string;collection:string;requestId:string};
type ConnectionState='checking'|'ready'|'disconnected'|'setup'|'signin'|'unavailable';
export default function QuickCapture({onSaved,onDetails,initialUrl=''}:{onSaved?:(item:Item)=>void;onDetails?:(url:string,collection:string)=>void;initialUrl?:string}){
 const [url,setUrl]=useState(initialUrl),[collection,setCollection]=useState('inbox'),[connection,setConnection]=useState<ConnectionState>('checking');
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[failed,setFailed]=useState(false),[savedId,setSavedId]=useState<string|null>(null),[draftReady,setDraftReady]=useState(false),[draftWarning,setDraftWarning]=useState('');
 const requestId=useRef(''),lock=useRef(false),store=useRef<DraftStore<CaptureDraft>|null>(null),generation=useRef(0);
 async function check(){const run=++generation.current;setConnection('checking');try{const r=await fetch('/api/drive',{cache:'no-store'});const value=await r.json() as {configured?:boolean;connected?:boolean};if(run!==generation.current)return;setConnection(r.status===401?'signin':!r.ok?'unavailable':!value.configured?'setup':value.connected?'ready':'disconnected');}catch{if(run===generation.current)setConnection('unavailable');}}
 useEffect(()=>{
  let active=true;requestId.current=crypto.randomUUID();
  void draftStore<CaptureDraft>('quick-capture').then(s=>{if(!active)return;store.current=s;const draft=s.read();if(draft&&!initialUrl){setUrl(draft.url);setCollection(draft.collection);requestId.current=draft.requestId;setMessage('Your unfinished link was restored.');}}).catch(()=>{if(active)setDraftWarning('Draft recovery is unavailable. Keep this page open until your link is saved.');}).finally(()=>{if(active)setDraftReady(true);});
  void check();window.addEventListener('focus',check);window.addEventListener('life-drive-change',check);
  return()=>{active=false;generation.current++;window.removeEventListener('focus',check);window.removeEventListener('life-drive-change',check);};
 },[]);
 useEffect(()=>{if(draftReady&&url&&store.current&&!store.current.write({url,collection,requestId:requestId.current}))setDraftWarning('This browser could not keep your draft. Keep the page open until saved.');},[url,collection,draftReady]);
 function changed(value:string){requestId.current=crypto.randomUUID();setUrl(value);setSavedId(null);setMessage('');if(!value)store.current?.clear();}
 async function save(e:React.FormEvent){
  e.preventDefault();if(lock.current||connection!=='ready')return;lock.current=true;setBusy(true);setMessage('');setFailed(false);setSavedId(null);
  try{
   const link=new URL(url.trim());if(!['http:','https:'].includes(link.protocol)||link.username||link.password)throw Error('Enter a complete http or https link.');
   const form=new FormData();form.set('requestId',requestId.current);form.set('details',JSON.stringify({title:link.hostname.replace(/^www\./,''),url:link.href,kind:inferKind(link.href),note:'',tags:[],destinations:collection==='inbox'?[]:[collection]}));
   const r=await fetch('/api/items',{method:'POST',body:form});const result=await r.json() as {item:Item;pending?:boolean;duplicateId?:string;error?:string};
   if(!r.ok){if(result.duplicateId)setSavedId(result.duplicateId);throw Error(result.error||'Could not save. Your link is still here.');}
   store.current?.clear();setUrl('');setSavedId(result.item.id);requestId.current=crypto.randomUUID();setMessage(result.pending?'Saved in Vault. The Drive copy is pending; open the item to retry.':`Saved to ${collection==='inbox'?'Inbox':collection}.`);onSaved?.(result.item);
  }catch(e){setFailed(true);setMessage(e instanceof Error?e.message:'Could not save. Your draft is kept.');}finally{lock.current=false;setBusy(false);}
 }
 return <section className="life-quick-capture" aria-label="Save a link"><form onSubmit={save}>
  <label className="quick-url"><span><Link2 size={16}/>Save a link</span><Input type="url" required maxLength={4000} placeholder="Paste a link…" value={url} disabled={busy||!draftReady} onChange={e=>changed(e.target.value)}/></label>
  <div className="quick-destination"><span id="quick-collection-label">Collection</span><Select value={collection} onValueChange={v=>{requestId.current=crypto.randomUUID();setCollection(v);}} disabled={busy||!draftReady}><SelectTrigger aria-labelledby="quick-collection-label"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="inbox">Inbox</SelectItem>{destinations.map(d=><SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select></div>
  <Button type="submit" disabled={busy||!draftReady||connection!=='ready'||!url.trim()}>{busy?<><Loader2 size={16} className="animate-spin"/>Saving…</>:'Save link'}</Button>
  <Button variant="ghost" type="button" disabled={busy||!draftReady} onClick={()=>onDetails?onDetails(url,collection):window.location.assign('/vault?url='+encodeURIComponent(url)+'&new=1&collection='+encodeURIComponent(collection))}>Add details</Button>
 </form><div className="quick-feedback">
  <p role={failed?'alert':'status'}>{message||'Preserves the link. Add a file to keep a copy of the content.'} {savedId&&<a href={'/vault?item='+encodeURIComponent(savedId)}>Open saved item</a>}</p>
  {draftWarning&&<p role="alert">{draftWarning}</p>}
  {connection==='checking'&&<p role="status">Checking saving…</p>}
  {connection==='unavailable'&&<p role="alert">The storage connection could not be checked. <button type="button" onClick={()=>void check()}>Try again</button></p>}
  {connection==='signin'&&<p><a href={'/signin-with-chatgpt?return_to='+encodeURIComponent('/capture?url='+encodeURIComponent(url))} target="_top">Sign in to save</a>. Your link returns after sign-in.</p>}
  {(connection==='setup'||connection==='disconnected')&&<p>{connection==='setup'?'Google Drive needs setup before new saves.':'Connect Google Drive to save.'} <a href="/vault#archive-settings">Storage settings</a>{url&&!draftWarning&&' Your link is kept while you connect.'}</p>}
 </div></section>;
}
