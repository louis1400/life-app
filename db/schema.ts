import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
export const items = sqliteTable("archive_items", {
 id:text("id").primaryKey(), owner:text("owner").notNull(), title:text("title").notNull(), url:text("url").notNull().default(""), kind:text("kind").notNull(), note:text("note").notNull().default(""), tags:text("tags").notNull().default("[]"), destinations:text("destinations").notNull().default("[]"), fileKey:text("file_key"), fileName:text("file_name"), mime:text("mime"), size:integer("size").notNull().default(0), content:text("content").notNull().default(""), driveFileId:text("drive_file_id"), driveUrl:text("drive_url"), driveAccountId:text("drive_account_id"), createdAt:text("created_at").notNull(), updatedAt:text("updated_at").notNull(),
 sourceFileUrl:text("source_file_url"), sourceFolder:text("source_folder"),
 version:integer("version").notNull().default(1), operationId:text("operation_id"), createHash:text("create_hash"), syncAction:text("sync_action").notNull().default(""), syncError:text("sync_error").notNull().default(""), syncToken:text("sync_token"), syncUntil:integer("sync_until").notNull().default(0), deleted:integer("deleted").notNull().default(0),
},table=>[index("archive_owner_created").on(table.owner,table.createdAt),index("archive_owner_url").on(table.owner,table.url),index("archive_owner_pending").on(table.owner,table.syncAction)]);

export const driveConnections = sqliteTable("drive_connections", {
 owner: text("owner").primaryKey(), accountId: text("account_id").notNull(), email: text("email").notNull(),
 refreshToken: text("refresh_token"), folderId: text("folder_id").notNull(), folderUrl: text("folder_url").notNull(), updatedAt: text("updated_at").notNull(),
});
export const driveOAuthStates = sqliteTable("drive_oauth_states", {
 hash: text("hash").primaryKey(), owner: text("owner").notNull(), expiresAt: integer("expires_at").notNull(),
}, table => [index("drive_state_expiry").on(table.expiresAt)]);

export * from "./groceries-schema";
export * from "./todo-schema";

export * from "../modules/study/db/schema";
