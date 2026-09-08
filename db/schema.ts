import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';

export const courseworkEntries = sqliteTable('coursework_entries', {
  ownerId: text('owner_id').notNull(),
  entryId: text('entry_id').notNull(),
  data: text('data').notNull(),
  version: integer('version').notNull().default(1),
  updatedAt: text('updated_at').notNull(),
}, (table) => [primaryKey({columns: [table.ownerId, table.entryId]})]);
