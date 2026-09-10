import { stateFor, type GroceryEvent } from "./model";
export type GrocerySnapshot = { events: GroceryEvent[]; today: string };
export async function loadGroceries(): Promise<GrocerySnapshot> {
  const response = await fetch("/api/groceries", { cache: "no-store" });
  const data = await response.json() as GrocerySnapshot & {error?:string};
  if (!response.ok) throw Error(data.error || "Your shopping list couldn't be loaded.");
  if (!Array.isArray(data.events) || typeof data.today !== "string") throw Error("Your shopping list couldn't be loaded.");
  return data;
}
// Both grocery views use queue events. Never retry a conflict with a newer version automatically.
export async function saveQuantity(snapshot: GrocerySnapshot, productId: string, count: number): Promise<GrocerySnapshot> {
  const response = await fetch("/api/groceries", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: crypto.randomUUID(), productId, version: stateFor(productId, snapshot.events).version, action: { kind: "queue", count }, occurredOn: snapshot.today }),
  });
  const data = await response.json() as GrocerySnapshot & {error?:string};
  if (!response.ok) throw Error(data.error || "Your change couldn't be confirmed. Reload the list before trying again.");
  if (!Array.isArray(data.events) || typeof data.today !== "string") throw Error("Your change couldn't be confirmed. Reload the list before trying again.");
  return data;
}
export function ahBasketUrl(lines: { productId: string; quantity: number }[]) {
  if (!lines.length || lines.some(line => !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 99)) return null;
  return "https://www.ah.nl/mijnlijst/add-multiple?" + new URLSearchParams(lines.map(line => ["p", `${line.productId.replace(/^wi/, "")}:${line.quantity}`])).toString();
}
