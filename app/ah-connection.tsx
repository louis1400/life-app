"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Check, Download, Link2, LoaderCircle, Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { requestAH, type AHConnectionState, type AHLine } from "@/lib/ah-connector";
import { PRODUCTS } from "@/lib/groceries/catalog";

type ReviewLine = AHLine & { name: string };
export default function AHConnection({lines=[], disabled=false, single=false, onReady}:{lines?:AHLine[]; disabled?:boolean; single?:boolean; onReady?:(ready:boolean)=>void}) {
  const [state, setState] = useState<AHConnectionState|null>(null);
  const [installed, setInstalled] = useState(false);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [setup, setSetup] = useState(false);
  const [review, setReview] = useState<ReviewLine[]|null>(null);
  const [error, setError] = useState<string|null>(null);
  const busyRef = useRef(false);
  const operationRef = useRef(0);
  const connected = state?.status === "connected";
  const needsUpdate = single && installed && !state?.capabilities?.includes("add_one");
  useEffect(()=>{onReady?.(connected && !needsUpdate);},[connected,needsUpdate,onReady]);

  async function check() {
    if (busyRef.current) return;
    const operation = operationRef.current;
    setChecking(true);
    try {
      const result = await requestAH("status");
      if (operation !== operationRef.current) return;
      setInstalled(true); setState(result);
    } catch { if(operation === operationRef.current){setInstalled(false); setState(null);} }
    finally { setChecking(false); }
  }
  useEffect(() => {
    void check();
    const focus = () => { void check(); };
    window.addEventListener("focus", focus);
    return () => window.removeEventListener("focus", focus);
  }, []);

  async function act(command:"connect"|"disconnect"|"transfer", selected?:AHLine[]) {
    if (busyRef.current && command !== "disconnect") return;
    const operation = ++operationRef.current;
    busyRef.current = true; setBusy(true); setError(null);
    try {
      const result = await requestAH(command, selected);
      if (operation !== operationRef.current) return;
      setInstalled(true); setState(result);
      if (result.status === "error" || result.status === "busy") setError(result.message || "Check AH and try again.");
      if (command === "connect" && result.status === "connected") setSetup(false);
      if (command === "transfer") setReview(null);
      if (command === "disconnect") setReview(null);
    } catch (e) { if(operation === operationRef.current)setError(e instanceof Error ? e.message : "The connection could not be checked."); }
    finally { if(operation === operationRef.current){busyRef.current = false; setBusy(false);} }
  }
  function prepareReview() {
    setError(null);
    if (lines.some(l => !Number.isSafeInteger(l.quantity) || l.quantity < 1 || l.quantity > 99)) {
      setError("AH accepts 1–99 packs per product. Adjust your refill list first."); return;
    }
    setReview(lines.map(l => ({...l, name:PRODUCTS.find(p=>p.id===l.productId)?.name || l.productId})));
  }

  const statusText = checking ? "Checking this browser…" : !installed ? "Connect your AH basket" :
    connected ? "AH connected in this browser" : state?.status === "needs_login" ? "Finish signing in at AH" :
    state?.status === "closed" ? "Reopen your AH connection" : "AH is disconnected";
  const transfer = state?.transfer;

  return <div className="ah-connection">
    <div className="ah-connection-status"><Link2 size={17}/><p>{statusText}</p></div>
    {needsUpdate ? <><Button className="ah-button" onClick={()=>setSetup(true)}>Update connector</Button><p className="ah-help">Install version 0.2.0 to use Add to AH.</p></> : single && connected ? <p className="ah-help">Each Add to AH click adds one extra pack. Keep the AH tab open.</p> : connected ? <>
      <Button className="ah-button" disabled={disabled || busy || lines.length===0} onClick={prepareReview}>
        {busy ? <><LoaderCircle size={16} className="ah-spinner"/>Preparing AH basket…</> : <>Review refill transfer<ArrowUpRight size={16}/></>}
      </Button>
      <p className="ah-help">Top up your AH basket to the quantities on your list, then choose delivery at AH.</p>
    </> : <>
      <Button className="ah-button" disabled={busy || checking} onClick={()=>installed ? void act("connect") : setSetup(true)}>
        {busy ? <><LoaderCircle size={16} className="ah-spinner"/>Checking AH…</> : <>Connect Albert Heijn<Link2 size={16}/></>}
      </Button>
      <p className="ah-help">Use your AH sign-in in desktop Chrome or Edge. One-time connector setup.</p>
    </>}
    {error && <p className="ah-error" role="alert">{error}</p>}
    {state?.status === "needs_login" && <p className="ah-help">Sign in on the AH tab that opened, then return here and click Connect Albert Heijn.</p>}
    {!single && transfer && transfer.status !== "running" && <div className={`ah-transfer-result ${transfer.status==="complete"?"success":"partial"}`} role="status">
      <strong>{transfer.status==="complete" ? "Quantities checked at AH" : "Transfer needs attention"}</strong>
      <p>{transfer.lines.filter(l=>l.verified).length} of {transfer.lines.length} products verified. {transfer.message}</p>
    </div>}
    <div className="ah-small-actions">
      <a href="https://www.ah.nl/mijnlijst" target="_blank" rel="noreferrer">Open AH basket<ArrowUpRight size={13}/></a>
      {installed ? <Button variant="ghost" size="sm" onClick={()=>void act("disconnect")} disabled={!connected&&!busy}><Unplug size={13}/>{busy?"Stop transfer":"Disconnect"}</Button> :
        <Button variant="ghost" size="sm" onClick={()=>setSetup(true)}>Set up</Button>}
    </div>

    <Dialog open={setup} onOpenChange={setSetup}><DialogContent className="product-dialog ah-setup-dialog">
      <DialogHeader><DialogTitle>Connect Albert Heijn</DialogTitle><DialogDescription>Install the life-app connector once in desktop Chrome or Edge, using the browser where you shop at AH.</DialogDescription></DialogHeader>
      <ol className="ah-setup-steps">
        <li><strong>Download and unzip the connector.</strong><p>Keep the extracted folder on your computer.</p><Button variant="outline" asChild><a href="/downloads/life-app-ah-connector.zip" download><Download size={16}/>Download connector</a></Button></li>
        <li><strong>Add it to your browser.</strong><p>Open your browser’s Extensions → Manage extensions. Turn on Developer mode, choose <b>Load unpacked</b>, and select the extracted folder containing <code>manifest.json</code>.</p></li>
        <li><strong>Reload life-app and connect.</strong><p>Click Connect Albert Heijn. Sign in directly on AH if asked, then return here to check the connection.</p><Button variant="outline" onClick={()=>window.location.reload()}>Reload life-app</Button></li>
      </ol>
      <p className="ah-help">The connector can read and use controls on ah.nl and this life-app site. Your password and session cookies stay in your browser. This connection uses the AH account signed in there.</p>
      <p className="ah-help">Already installed? Replace the files in your extracted connector folder with this download, click Reload for the extension in Manage extensions, then reload life-app.</p><p className="ah-help">Keep the AH tab open. Delivery and final order confirmation happen at AH.</p>
      <Button disabled={busy} onClick={()=>void act("connect")}>{busy ? "Checking…" : "Check AH connection"}</Button>
    </DialogContent></Dialog>

    <Dialog open={!!review} onOpenChange={open=>{if(!open&&!busy)setReview(null);}}><DialogContent className="product-dialog">
      <DialogHeader><DialogTitle>Prepare your AH basket</DialogTitle><DialogDescription>Make sure the basket has at least these quantities. Packs already there count toward the total. Other products stay as they are.</DialogDescription></DialogHeader>
      <ul className="ah-review-lines">{review?.map(l=><li key={l.productId}><span>{l.name}</span><strong>{l.quantity} ×</strong></li>)}</ul>
      <p className="ah-help">AH opens each exact product and adds any missing packs. Review the complete basket, delivery time and final price at AH before placing an order.</p>
      {busy && <p className="ah-help" role="status">Checking quantities at AH. Keep both tabs open; this may take a few minutes.</p>}
      {error && <p className="ah-error" role="alert">{error}</p>}
      <Button disabled={busy || !review?.length} onClick={()=>review&&void act("transfer", review.map(({productId,quantity})=>({productId,quantity})))}>
        {busy ? <><LoaderCircle size={16} className="ah-spinner"/>Preparing basket…</> : <><Check size={16}/>Prepare AH basket</>}
      </Button>
      {busy && <Button variant="outline" onClick={()=>void act("disconnect")}>Stop transfer</Button>}
    </DialogContent></Dialog>
  </div>;
}
