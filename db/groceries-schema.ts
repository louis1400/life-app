import { sqliteTable, integer, text, uniqueIndex, index } from "drizzle-orm/sqlite-core";
export const groceryEvents=sqliteTable("grocery_events",{
  seq:integer("seq").primaryKey({autoIncrement:true}),
  id:text("id").notNull(),
  userId:text("user_id").notNull(),
  productId:text("product_id").notNull(),
  actionJson:text("action_json").notNull(),
  occurredOn:text("occurred_on").notNull(),
  recordedAt:text("recorded_at").notNull(),
},table=>[
  uniqueIndex("idx_grocery_events_id").on(table.id),
  index("idx_grocery_events_user_product_seq").on(table.userId,table.productId,table.seq),
]);
