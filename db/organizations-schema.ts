import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";
export const organizations = sqliteTable("organization_watchlist", {
  userId: text("user_id").notNull(), id: text("id").notNull(), name: text("name").notNull(),
  url: text("url").notNull(), reason: text("reason").notNull(), notes: text("notes").notNull(),
  nextStep: text("next_step").notNull(), status: text("status").notNull(),
  archived: integer("archived", {mode:"boolean"}).notNull().default(false),
  version: integer("version").notNull().default(1),
}, table => [primaryKey({columns:[table.userId,table.id]})]);
