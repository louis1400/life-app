import { env } from "cloudflare:workers";
import { starterOrganizations, type Organization } from "../lib/organizations/model";
import { INSERT_ORGANIZATION } from "../lib/organizations/sql";
export function organizationDb() { if (!env.DB) throw Error("Watchlist storage unavailable"); return env.DB; }
export async function getOrganizations(user: string): Promise<Organization[]> {
  const db = organizationDb();
  await db.batch(starterOrganizations.map(o => db.prepare(INSERT_ORGANIZATION).bind(user,o.id,o.name,o.url,o.reason,o.notes,o.nextStep,o.status,+o.archived)));
  const {results} = await db.prepare(`SELECT id,name,url,reason,notes,next_step AS nextStep,status,archived,version FROM organization_watchlist WHERE user_id=? ORDER BY name COLLATE NOCASE,id`).bind(user).all<Omit<Organization,"archived"> & {archived:number}>();
  return results.map(o => ({...o,archived:!!o.archived}));
}
