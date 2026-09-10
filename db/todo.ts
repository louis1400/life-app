import { env } from "cloudflare:workers";
import type { Task } from "../lib/todo/model";
import { taskInput } from "../lib/todo/model";
import { z } from "zod";

const snapshotSchema = z.object({
  owner: z.string().min(1),
  tasks: z.array(taskInput.extend({
    version: z.number().int().min(1),
    createdAt: z.string().datetime(), updatedAt: z.string().datetime(),
  })).max(25),
});

// Server-only transfer snapshot. Site identities differ; the verified
// destination owner is explicit. Never seed tasks for other visitors.
export async function importTasks(user: string) {
  const raw = (env as unknown as { TODO_IMPORT_SNAPSHOT?: string }).TODO_IMPORT_SNAPSHOT;
  if (!raw) return;
  const snapshot = snapshotSchema.parse(JSON.parse(raw));
  if (snapshot.owner !== user || !snapshot.tasks.length) return;
  await todoDb().batch(snapshot.tasks.map(t => todoDb().prepare(`INSERT OR IGNORE INTO todo_tasks
    (user_id,id,title,notes,done,deleted,version,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)`)
    .bind(user,t.id,t.title,t.notes,+t.done,+t.deleted,t.version,t.createdAt,t.updatedAt)));
}

export async function getTaskSummary(user: string) {
  await importTasks(user);
  const { results: counts } = await todoDb().prepare('SELECT COUNT(*) AS count FROM todo_tasks WHERE user_id=? AND done=0 AND deleted=0').bind(user).all<{ count: number }>();
  const { results: tasks } = await todoDb().prepare('SELECT id,title FROM todo_tasks WHERE user_id=? AND done=0 AND deleted=0 ORDER BY created_at DESC,id LIMIT 3').bind(user).all<{ id: string; title: string }>();
  return { count: counts[0]?.count ?? 0, tasks };
}

export function todoDb() {
  if (!env.DB) throw new Error("Task storage unavailable");
  return env.DB;
}
export async function getTasks(user: string): Promise<Task[]> {
  const { results } = await todoDb().prepare(`SELECT id, title, notes, done, deleted, version,
    created_at AS createdAt, updated_at AS updatedAt FROM todo_tasks
    WHERE user_id = ? ORDER BY created_at DESC, id`).bind(user).all<Omit<Task, "done" | "deleted"> & { done: number; deleted: number }>();
  return results.map(task => ({ ...task, done: !!task.done, deleted: !!task.deleted }));
}
