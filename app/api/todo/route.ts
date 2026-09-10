import { getTasks, todoDb, importTasks } from "../../../db/todo";
import { taskInput } from "../../../lib/todo/model";
import { INSERT_TASK_SQL, UPDATE_TASK_SQL } from "../../../lib/todo/sql";

export const dynamic = "force-dynamic";
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "private, no-store" } });

export async function GET(request: Request) {
  try {
    const user = request.headers.get("oai-authenticated-user-id");
    if (!user) return json({ error: "Sign in to view tasks." }, 401);
    await importTasks(user);
    return json({ tasks: await getTasks(user) });
  } catch (error) {
    console.error("todo read failed", error);
    return json({ error: "Couldn't load tasks." }, 503);
  }
}

export async function POST(request: Request) {
  try {
    const user = request.headers.get("oai-authenticated-user-id");
    if (!user) return json({ error: "Sign in to save tasks." }, 401);
    const origin = request.headers.get("origin");
    if ((origin && origin !== new URL(request.url).origin) || request.headers.get("sec-fetch-site") === "cross-site") return json({ error: "Open the app to save." }, 403);
    if (!request.headers.get("content-type")?.startsWith("application/json")) return json({ error: "Invalid request." }, 415);
    const body = await request.text();
    if (body.length > 12000) return json({ error: "Task is too long." }, 413);
    let raw: unknown;
    try { raw = JSON.parse(body); } catch { return json({ error: "Invalid task." }, 400); }
    const parsed = taskInput.safeParse(raw);
    if (!parsed.success) return json({ error: "Check the title and notes." }, 400);
    const t = parsed.data;
    await importTasks(user);
    const now = new Date().toISOString();
    const result = t.version === 0
      ? await todoDb().prepare(INSERT_TASK_SQL).bind(user, t.id, t.title, t.notes, +t.done, +t.deleted, now, now).run()
      : await todoDb().prepare(UPDATE_TASK_SQL).bind(t.title, t.notes, +t.done, +t.deleted, now, user, t.id, t.version).run();
    const tasks = await getTasks(user);
    if (!result.meta.changes) {
      const current = tasks.find(task => task.id === t.id);
      // Retry after a lost response is successful if the intended state was saved.
      if (!current || current.title !== t.title || current.notes !== t.notes || current.done !== t.done || current.deleted !== t.deleted)
        return json({ error: "Changed elsewhere. Close and reopen this task.", tasks }, 409);
    }
    return json({ tasks });
  } catch (error) {
    console.error("todo save failed", error);
    return json({ error: "Save not confirmed. Try again." }, 503);
  }
}
