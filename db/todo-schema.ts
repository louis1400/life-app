import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";

export const todoTasks = sqliteTable("todo_tasks", {
  userId: text("user_id").notNull(),
  id: text("id").notNull(),
  title: text("title").notNull(),
  notes: text("notes").notNull().default(""),
  done: integer("done", { mode: "boolean" }).notNull().default(false),
  deleted: integer("deleted", { mode: "boolean" }).notNull().default(false),
  version: integer("version").notNull().default(1),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, table => [primaryKey({ columns: [table.userId, table.id] })]);
