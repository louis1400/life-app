import { headers } from "next/headers";
import { getEvents, groceryDb } from "../../../db/groceries";
import { PRODUCTS } from "../../../lib/groceries/catalog";
import { stateFor,todayInAmsterdam,validateAction,type Action } from "../../../lib/groceries/model";
import { APPEND_EVENT_SQL } from "../../../lib/groceries/sql";
export const dynamic="force-dynamic";
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{"Cache-Control":"private, no-store"}});
async function userId() { return (await headers()).get("oai-authenticated-user-id"); }
export async function GET() {
  try {
    const user=await userId();
    if(!user) return json({error:"Sign in to save and view your groceries."},401);
    return json({events:await getEvents(user),today:todayInAmsterdam()});
  } catch(error) {console.error("groceries read failed",error);return json({error:"Your groceries couldn't be loaded. Please try again."},503);}
}
export async function POST(request:Request) {
  try {
    const user=await userId();
    if(!user) return json({error:"Sign in to update your groceries."},401);
    const origin=request.headers.get("origin");
    if((origin && origin!==new URL(request.url).origin) || request.headers.get("sec-fetch-site")==="cross-site") return json({error:"Open life-app to make this update."},403);
    if(!request.headers.get("content-type")?.startsWith("application/json")) return json({error:"Send a JSON update."},415);
    const raw=await request.text();
    if(raw.length>4096) return json({error:"That update is too large."},413);
    let input;
    try {input=JSON.parse(raw);}catch{return json({error:"That update couldn't be read."},400);}
    if(!input || typeof input!=="object") return json({error:"That update couldn't be read."},400);
    const {id,productId,version,action,occurredOn}=input;
    const product=PRODUCTS.find(p=>p.id===productId);
    if(!product || typeof id!=="string" || !/^[0-9a-f-]{36}$/i.test(id) || !Number.isSafeInteger(version) || version<0 || !action || typeof action!=="object") return json({error:"Please reload and try your update again."},400);
    const normalized:Action={kind:action.kind};
    if(action.kind==="stock"||action.kind==="queue") normalized.count=action.count;
    if(action.kind==="undo") normalized.targetId=action.targetId;
    const events=await getEvents(user);
    const duplicate=events.find(e=>e.id===id);
    if(duplicate) {
      if(duplicate.productId!==productId || JSON.stringify(duplicate.action)!==JSON.stringify(normalized) || duplicate.occurredOn!==occurredOn) return json({error:"This update ID has already been used."},409);
      return json({events,today:todayInAmsterdam()});
    }
    const state=stateFor(productId,events);
    if(state.version!==version) return json({error:"This product changed in another tab. Reload before updating it.",events},409);
    const validation=validateAction(product,state,normalized,occurredOn,todayInAmsterdam());
    if(validation) return json({error:validation},400);
    const result=await groceryDb().prepare(APPEND_EVENT_SQL).bind(id,user,productId,JSON.stringify(normalized),occurredOn,new Date().toISOString(),user,productId,version).run();
    const refreshed=await getEvents(user);
    if(!result.meta.changes && !refreshed.some(e=>e.id===id)) return json({error:"This product changed while saving. Please try again.",events:refreshed},409);
    return json({events:refreshed,today:todayInAmsterdam()});
  } catch(error) {console.error("groceries update failed",error);return json({error:"The update couldn't be confirmed. Reload before trying again."},503);}
}
