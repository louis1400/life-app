import { z } from "zod";

export const taskInput = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(240),
  notes: z.string().max(8000),
  done: z.boolean(),
  deleted: z.boolean(),
  version: z.number().int().min(0),
}).strict();
export type TaskInput = z.infer<typeof taskInput>;
export type Task = TaskInput & { createdAt: string; updatedAt: string };
