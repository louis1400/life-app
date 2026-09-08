export type Product = {
  id: string; name: string; shortName: string; pack: string; category: string;
  priceCents: number; url: string; image: string; mode: "cycle" | "usage";
};
export type Action = { kind: "opened" | "already_open" | "finished" | "used" | "stock" | "queue" | "undo"; count?: number | null; targetId?: string };
export type GroceryEvent = { seq: number; id: string; productId: string; action: Action; occurredOn: string; recordedAt: string };
export type PackState = {
  productId: string; version: number; unopenedPacks: number | null; inUse: boolean;
  openedOn: string | null; queuePacks: number; samples: number[]; finishDates: string[];
  lastUsageOn: string | null; lastActionId: string | null; effectiveEvents: GroceryEvent[];
};
const DAY = 86_400_000;
export function todayInAmsterdam(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {timeZone:"Europe/Amsterdam",year:"numeric",month:"2-digit",day:"2-digit"}).format(now);
}
export function isDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const time = Date.parse(value + "T12:00:00Z");
  return Number.isFinite(time) && new Date(time).toISOString().slice(0,10) === value;
}
export function daysBetween(a: string, b: string) { return (Date.parse(b+"T12:00:00Z") - Date.parse(a+"T12:00:00Z"))/DAY; }
export function addDays(date: string, days: number) { return new Date(Date.parse(date+"T12:00:00Z")+Math.round(days)*DAY).toISOString().slice(0,10); }
export function stateFor(productId: string, events: GroceryEvent[]): PackState {
  const rows = events.filter(e=>e.productId===productId).sort((a,b)=>a.seq-b.seq);
  const effective: GroceryEvent[] = [];
  for (const event of rows) {
    if (event.action.kind === "undo") {
      if (effective.at(-1)?.id === event.action.targetId) effective.pop();
    } else effective.push(event);
  }
  const s: PackState = {productId,version:rows.at(-1)?.seq??0,unopenedPacks:null,inUse:false,openedOn:null,queuePacks:0,samples:[],finishDates:[],lastUsageOn:null,lastActionId:effective.at(-1)?.id??null,effectiveEvents:effective};
  for (const e of effective) {
    switch(e.action.kind) {
      case "stock": s.unopenedPacks=e.action.count??null; break;
      case "queue": s.queuePacks=e.action.count??0; break;
      case "opened":
        s.inUse=true; s.openedOn=e.occurredOn;
        if(s.unopenedPacks!==null) s.unopenedPacks=Math.max(0,s.unopenedPacks-1);
        s.lastUsageOn=e.occurredOn; break;
      case "already_open": s.inUse=true; s.openedOn=null; s.lastUsageOn=e.occurredOn; break;
      case "finished":
        if(s.openedOn) { const days=daysBetween(s.openedOn,e.occurredOn); if(days>0) s.samples.push(days); }
        s.inUse=false;s.openedOn=null;s.finishDates.push(e.occurredOn);s.lastUsageOn=e.occurredOn;break;
      case "used":
        s.finishDates.push(e.occurredOn);s.lastUsageOn=e.occurredOn;
        if(s.unopenedPacks!==null) s.unopenedPacks=Math.max(0,s.unopenedPacks-1);
        break;
    }
  }
  return s;
}
export function estimate(product: Product, state: PackState) {
  let daysPerPack: number | null = null;
  let observations = 0;
  if(product.mode==="usage") {
    const dates=state.finishDates.slice(-8);
    const span=dates.length>1 ? daysBetween(dates[0],dates.at(-1)!) : 0;
    if(span>0) { daysPerPack=span/(dates.length-1); observations=dates.length-1; }
  } else {
    const samples=state.samples.slice(-5).sort((a,b)=>a-b);
    observations=samples.length;
    if(observations) { const mid=Math.floor(observations/2);daysPerPack=observations%2?samples[mid]:(samples[mid-1]+samples[mid])/2; }
  }
  let refillOn: string | null = null;
  if(daysPerPack!==null && state.unopenedPacks!==null) {
    if(product.mode==="usage" && state.lastUsageOn) refillOn=addDays(state.lastUsageOn,daysPerPack*(state.unopenedPacks+1));
    else if(state.openedOn) refillOn=addDays(state.openedOn,daysPerPack*(state.unopenedPacks+1));
  }
  return {daysPerPack,observations,refillOn,tentative:observations<3};
}
export function validateAction(product: Product, state: PackState, action: Action, occurredOn: string, today: string): string | null {
  if(!isDate(occurredOn)||occurredOn>today||occurredOn<"2000-01-01") return "Choose a valid date on or before today.";
  if(!["opened","already_open","finished","used","stock","queue","undo"].includes(action.kind)) return "That update is not supported.";
  if(action.kind==="stock" || action.kind==="queue") {
    if(action.kind==="stock" && action.count===null) return null;
    if(typeof action.count!=="number" || !Number.isInteger(action.count) || action.count<0 || action.count>999) return "Use a whole number from 0 to 999.";
    return null;
  }
  if(action.kind==="undo") return action.targetId===state.lastActionId && !!state.lastActionId ? null : "Only the latest update for this product can be undone.";
  if(state.lastUsageOn && occurredOn<state.lastUsageOn) return "Choose a date after the last usage update, or undo that update first.";
  if(action.kind==="used") return product.mode==="usage" ? null : "Track this product by opening and finishing a pack.";
  if(product.mode==="usage") return "Use the Used one pack action for this product.";
  if((action.kind==="opened"||action.kind==="already_open") && state.inUse) return "Finish the current pack before starting another.";
  if(action.kind==="finished" && !state.inUse) return "Mark the current pack as open first.";
  return null;
}
export function queueTotal(products: Product[], events: GroceryEvent[]) {
  return products.reduce((sum,p)=>sum+p.priceCents*stateFor(p.id,events).queuePacks,0);
}
