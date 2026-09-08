import { SITE_ORIGIN, AH_BASKET, CHANNEL, COMMANDS, allowedSender, normalizeLines, remainingQuantity } from "./protocol.js";
import { CATALOG } from "./catalog.js";
import { inspectConnection, inspectBasket, inspectProduct } from "./ah-page.js";
import { navigate } from "./navigation.js";

const instance = crypto.randomUUID();
let transferring = false;
let generation = 0;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const interrupted = "The transfer stopped. Check your AH basket; already added packs may still be there. A new transfer checks quantities again.";

async function execute(tabId, func, args = []) {
  const result = await chrome.scripting.executeScript({target:{tabId}, world:"ISOLATED", func, args});
  if (result.length !== 1 || !result[0].result) throw new Error("AH could not be checked. Finish any sign-in or prompt in its tab, then try again.");
  return result[0].result;
}

async function waitFor(tabId, func, args, accept, assertActive = () => {}) {
  for (let attempt = 0; attempt < 30; attempt++) {
    assertActive();
    try {
      const result = await execute(tabId, func, args);
      if (accept(result)) return result;
    } catch (error) {
      if (attempt === 29) throw error;
    }
    await pause(400);
  }
  throw new Error("AH hasn't shown the expected controls. Check its tab for a prompt or an unavailable product, then try again.");
}

async function ownedTab() {
  const { tabId } = await chrome.storage.session.get("tabId");
  if (!Number.isInteger(tabId)) return null;
  try { return await chrome.tabs.get(tabId); } catch { return null; }
}

async function previousTransfer() {
  const { transfer } = await chrome.storage.session.get("transfer");
  if (transfer?.status === "running" && transfer.instance !== instance) {
    const stopped = {...transfer, status:"interrupted", message:interrupted};
    await chrome.storage.session.set({transfer:stopped});
    return stopped;
  }
  return transfer || null;
}

async function connectionStatus() {
  const { enabled } = await chrome.storage.local.get("enabled");
  const transfer = await previousTransfer();
  if (!enabled) return {status:"disconnected", transfer};
  const tab = await ownedTab();
  if (!tab) return {status:"closed", transfer};
  try { return {...await execute(tab.id, inspectConnection), transfer}; }
  catch { return {status:"needs_login", transfer}; }
}

async function connect() {
  if (transferring) return {status:"busy", message:"Wait for the current transfer, or disconnect to stop it."};
  let tab = await ownedTab();
  if (!tab) {
    tab = await chrome.tabs.create({url:AH_BASKET, active:true});
    await chrome.storage.session.set({tabId:tab.id});
  } else {
    await chrome.tabs.update(tab.id, {active:true});
    // Keep an in-progress sign-in intact. Navigation is only needed when this
    // tab is still an AH page; unknown origins are left for the user to finish.
    if (tab.url?.startsWith("https://www.ah.nl/")) await navigate(tab.id, {url:AH_BASKET});
  }
  let result;
  try {
    result = await waitFor(tab.id, inspectConnection, [], r => r.status === "connected" || r.status === "needs_login");
  } catch { result = {status:"needs_login"}; }
  if (result.status === "connected") await chrome.storage.local.set({enabled:true});
  return {...result, transfer:await previousTransfer()};
}

async function transfer(input, addOne = false) {
  const lines = normalizeLines(input, CATALOG);
  const { enabled } = await chrome.storage.local.get("enabled");
  const tab = await ownedTab();
  if (!enabled || !tab) throw new Error("Connect to AH in this browser first.");
  const ownGeneration = generation;
  const deadline = Date.now() + 240_000;
  const assertActive = () => {
    if (ownGeneration !== generation || Date.now() > deadline) throw new Error(interrupted);
  };
  const result = {id:crypto.randomUUID(), instance, status:"running", lines:lines.map(line=>({productId:line.productId, requested:line.quantity, verified:false})), startedAt:new Date().toISOString()};
  try {
    await chrome.storage.session.set({transfer:result});
    await navigate(tab.id, {url:AH_BASKET, ...(addOne ? {} : {active:true})});
    await waitFor(tab.id, inspectConnection, [], r=>r.status==="connected", assertActive);
    await waitFor(tab.id, inspectBasket, [], r=>r.ready, assertActive);
    for (const line of lines) {
      assertActive();
      const progress = result.lines.find(p=>p.productId===line.productId);
      await navigate(tab.id, {url:line.url});
      let state = await waitFor(tab.id, inspectProduct, [line.productId], r=>r.status==="ready", assertActive);
      progress.before = state.quantity;
      if (addOne) {
        if (state.quantity >= 99) throw new Error("AH already has the maximum quantity for this product.");
        line.quantity = state.quantity + 1;
        progress.requested = line.quantity;
      }
      // Each click is sent once. If acknowledgement is lost, stop and reconcile
      // on the user's next transfer; never repeat an ambiguous click.
      while (remainingQuantity(state.quantity, line.quantity) > 0) {
        assertActive();
        const before = state.quantity;
        const clicked = await execute(tab.id, inspectProduct, [line.productId, true, before]);
        if (clicked.status !== "clicked" || clicked.quantity !== before) throw new Error(interrupted);
        state = await waitFor(tab.id, inspectProduct, [line.productId], r=>r.status==="ready" && r.quantity>before, assertActive);
        if (state.quantity !== before + 1) throw new Error("The AH quantity changed unexpectedly. Check the basket before continuing.");
      }
      // A fresh navigation must show the quantity again, rather than trusting
      // the optimistic update rendered immediately after a click.
      await navigate(tab.id);
      state = await waitFor(tab.id, inspectProduct, [line.productId], r=>r.status==="ready" && r.quantity>=line.quantity, assertActive);
      progress.after = state.quantity;
      progress.verified = true;
      await chrome.storage.session.set({transfer:result});
    }
    assertActive();
    await navigate(tab.id, {url:AH_BASKET, ...(addOne ? {} : {active:true})});
    result.status = "complete";
    result.message = addOne ? "One pack added to your AH basket." : "Requested quantities were checked at AH. Review your basket and choose delivery there.";
  } catch (error) {
    result.status = "interrupted";
    result.message = error instanceof Error ? error.message : interrupted;
  } finally {
    result.finishedAt = new Date().toISOString();
    await chrome.storage.session.set({transfer:result});
  }
  return connectionStatus();
}

async function addOne(message) {
  if (!/^[a-f0-9-]{36}$/i.test(message.id || "")) throw new Error("Invalid addition request.");
  const lines = normalizeLines(message.lines, CATALOG);
  if (lines.length !== 1 || lines[0].quantity !== 1) throw new Error("Choose one pack of one product.");
  const { additions = {} } = await chrome.storage.session.get("additions");
  const previous = additions[message.id];
  if (previous) {
    if (previous.productId !== lines[0].productId) throw new Error("This request was already used.");
    return previous.result || {status:"error", message:"This addition could not be confirmed. Check your AH basket before adding again."};
  }
  // Record before any click. Re-delivery, including after a worker restart,
  // must never replay an addition whose outcome is uncertain.
  additions[message.id] = {productId:lines[0].productId};
  await chrome.storage.session.set({additions});
  const result = await transfer(lines, true);
  additions[message.id].result = result;
  await chrome.storage.session.set({additions});
  return result;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!allowedSender(sender) || message?.channel !== CHANNEL || !COMMANDS.has(message?.command)) return;
  const writes = message.command === "transfer" || message.command === "add_one";
  const respond = result => sendResponse({...result, capabilities:["add_one"], version:"0.2.0"});
  if (writes && transferring) { respond({status:"busy", message:"Wait for the current addition to finish."}); return; }
  if (writes) transferring = true;
  const run = async () => {
    switch (message.command) {
      case "status": return connectionStatus();
      case "connect": return connect();
      case "disconnect":
        generation++;
        await chrome.storage.local.set({enabled:false});
        return {status:"disconnected", message:"life-app disconnected in this browser. Your AH sign-in is unchanged."};
      case "transfer": return transfer(message.lines);
      case "add_one": return addOne(message);
    }
  };
  run().then(result => { if (writes) transferring = false; respond(result); }).catch(() => {
    if (writes) transferring = false;
    respond({status:"error", message:"The AH connection could not complete this action. Check the AH tab before trying again."});
  });
  return true;
});

chrome.action.onClicked.addListener(() => chrome.tabs.create({url:SITE_ORIGIN}));
