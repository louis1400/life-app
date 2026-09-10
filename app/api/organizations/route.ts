import { getOrganizations, organizationDb } from "../../../db/organizations";
import { organizationInput } from "../../../lib/organizations/model";
import { INSERT_ORGANIZATION, UPDATE_ORGANIZATION } from "../../../lib/organizations/sql";
export const dynamic = "force-dynamic";
const json = (data: unknown, status = 200) => Response.json(data, {status,headers:{"Cache-Control":"private, no-store"}});
export async function GET(request: Request) {
  const user = request.headers.get("oai-authenticated-user-id");
  if (!user) return json({error:"Sign in to view your watchlist."},401);
  try { return json({organizations:await getOrganizations(user)}); }
  catch (error) { console.error("watchlist read failed",error); return json({error:"Couldn’t load your watchlist. Try again."},503); }
}
export async function POST(request: Request) {
  const user = request.headers.get("oai-authenticated-user-id");
  if (!user) return json({error:"Sign in to save your watchlist."},401);
  const origin = request.headers.get("origin");
  if ((origin && origin !== new URL(request.url).origin) || request.headers.get("sec-fetch-site") === "cross-site") return json({error:"Open the app to save."},403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return json({error:"Invalid request."},415);
  try {
    const body = await request.text();
    if (body.length > 16000) return json({error:"Your entry is too long."},413);
    let raw: unknown;
    try { raw = JSON.parse(body); } catch { return json({error:"Invalid entry."},400); }
    const parsed = organizationInput.safeParse(raw);
    if (!parsed.success) return json({error:"Check the name, website link and text lengths."},400);
    const o = parsed.data, db = organizationDb();
    const result = o.version === 0
      ? await db.prepare(INSERT_ORGANIZATION).bind(user,o.id,o.name,o.url,o.reason,o.notes,o.nextStep,o.status,+o.archived).run()
      : await db.prepare(UPDATE_ORGANIZATION).bind(o.name,o.url,o.reason,o.notes,o.nextStep,o.status,+o.archived,user,o.id,o.version).run();
    const organizations = await getOrganizations(user);
    if (!result.meta.changes) {
      const current = organizations.find(item=>item.id===o.id);
      const keys = ["name","url","reason","notes","nextStep","status","archived"] as const;
      if (!current || keys.some(key=>current[key]!==o[key])) return json({error:"This entry changed elsewhere. Your draft is kept; close and reopen the entry to load the latest version."},409);
    }
    return json({organizations});
  } catch (error) { console.error("watchlist save failed",error); return json({error:"Save not confirmed. Your draft is kept; try again."},503); }
}
