"use client";

import { useEffect, useRef, useState } from "react";
import { Link2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { destinations, inferKind, type Item } from "@/lib/archive";

export default function QuickCapture({ onSaved, onDetails }: { onSaved?: (item: Item) => void; onDetails?: (url: string, collection: string) => void }) {
  const [url, setUrl] = useState("");
  const [collection, setCollection] = useState("inbox");
  const [ready, setReady] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const lock = useRef(false);
  useEffect(() => {
    let active = true;
    async function check() {
      try { const r = await fetch("/api/drive", { cache: "no-store" }); const status = await r.json() as {configured?:boolean;connected?:boolean}; if (active) setReady(!!(r.ok && status.configured && status.connected)); }
      catch { if (active) setReady(false); }
    }
    void check(); window.addEventListener("focus", check); window.addEventListener("life-drive-change", check);
    return () => { active = false; window.removeEventListener("focus", check); window.removeEventListener("life-drive-change", check); };
  }, []);
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (lock.current || !ready) return;
    lock.current = true; setBusy(true); setMessage(""); setSavedId(null); setFailed(false);
    try {
      const link = new URL(url.trim());
      if (!["http:", "https:"].includes(link.protocol) || link.username || link.password) throw Error("Enter a complete http or https link.");
      const form = new FormData();
      form.set("details", JSON.stringify({ title: link.hostname.replace(/^www\./, ""), url: link.href, kind: inferKind(link.href), note: "", tags: [], destinations: collection === "inbox" ? [] : [collection] }));
      const response = await fetch("/api/items", { method: "POST", body: form });
      const result = await response.json() as {item:Item;error?:string;duplicateId?:string};
      if (!response.ok) {
        if (result.duplicateId) { setSavedId(result.duplicateId); throw Error("Already saved. Open the existing item to change its details."); }
        throw Error(result.error || "Could not save. Your link is still here.");
      }
      setUrl(""); setSavedId(result.item.id); setMessage(`Saved to ${collection === "inbox" ? "Inbox" : collection}.`); onSaved?.(result.item);
    } catch (error) { setFailed(true); setMessage(error instanceof Error ? error.message : "Could not save. Try again."); }
    finally { lock.current = false; setBusy(false); }
  }
  return <section className="life-quick-capture" aria-label="Save a link">
    <form onSubmit={save}>
      <label className="quick-url"><span><Link2 size={16}/>Save a link</span><Input type="url" required maxLength={4000} placeholder="Paste a link…" value={url} disabled={busy} onChange={e => { setUrl(e.target.value); setSavedId(null); setMessage(""); }}/></label>
      <div className="quick-destination"><span id="quick-collection-label">Collection</span><Select value={collection} onValueChange={setCollection} disabled={busy}><SelectTrigger aria-labelledby="quick-collection-label"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="inbox">Inbox</SelectItem>{destinations.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select></div>
      <Button type="submit" disabled={busy || !ready || !url.trim()}>{busy ? <><Loader2 size={16} className="animate-spin"/>Saving…</> : "Save link"}</Button>
      <Button variant="ghost" type="button" disabled={busy} onClick={() => onDetails ? onDetails(url, collection) : window.location.assign("/vault?url=" + encodeURIComponent(url) + "&new=1&collection=" + encodeURIComponent(collection))}>Add details</Button>
    </form>
    <div className="quick-feedback">
      {message ? <p role={failed ? "alert" : "status"}>{message} {savedId && <a href={"/vault?item=" + encodeURIComponent(savedId)}>Open saved item</a>}</p> : <p>Preserves the link. Add a file to keep a copy of the content.</p>}
      {ready === false && <p>Connect Google Drive to save. <a href="/vault#archive-settings">Storage settings</a></p>}
      {ready === null && <p role="status">Checking saving…</p>}
    </div>
  </section>;
}
