import { env } from "cloudflare:workers";
import type { GroceryEvent } from "../lib/groceries/model";
export function groceryDb() { if(!env.DB) throw new Error("Grocery storage unavailable"); return env.DB; }
type EventRow={seq:number;id:string;product_id:string;action_json:string;occurred_on:string;recorded_at:string};
export async function getEvents(userId:string):Promise<GroceryEvent[]> {
  const {results}=await groceryDb().prepare("SELECT seq,id,product_id,action_json,occurred_on,recorded_at FROM grocery_events WHERE user_id=? ORDER BY seq").bind(userId).all<EventRow>();
  return results.map(r=>({seq:r.seq,id:r.id,productId:r.product_id,action:JSON.parse(r.action_json),occurredOn:r.occurred_on,recordedAt:r.recorded_at}));
}
