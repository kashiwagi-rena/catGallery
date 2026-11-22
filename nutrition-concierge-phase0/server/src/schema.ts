// Phase 0 schema for 栄養士コンシェルジュ.
// Mirrors the architecture document's data model (2026-11-21):
// users -> accounts, children, child_profiles, foods, child_food_status.
// Later phases add menus / trial_records / threads / review_requests /
// notifications on top of these tables.

import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const accounts = sqliteTable("accounts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  displayName: text("display_name").notNull().default(""),
  email: text("email").notNull().default(""),
  // 先回り通知の送信タイミング (decided 2026-11-22: 日曜19時ごろ)
  notificationTime: text("notification_time").notNull().default("日曜 19:00"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const children = sqliteTable("children", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nickname: text("nickname").notNull(),
  // "YYYY-MM" — 月齢はここから算出する (architecture doc: 生年月)
  birthYearMonth: text("birth_year_month").notNull(),
  attendsNursery: integer("attends_nursery", { mode: "boolean" })
    .notNull()
    .default(false),
  nurseryName: text("nursery_name").notNull().default(""),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const childProfiles = sqliteTable("child_profiles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  childId: integer("child_id")
    .notNull()
    .references(() => children.id, { onDelete: "cascade" }),
  // アレルギーは foods.id のカンマ区切りで保持 (対象は表示枠組み29品目から選択)
  allergyFoodIds: text("allergy_food_ids").notNull().default(""),
  dislikes: text("dislikes").notNull().default(""),
  doctorHoursMemo: text("doctor_hours_memo").notNull().default(""),
  notes: text("notes").notNull().default(""),
});

export const foods = sqliteTable("foods", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  // 表記ゆれ・別名 (カンマ区切り)。照合の漏れを防ぐためマスタ側で吸収する。
  aliases: text("aliases").notNull().default(""),
  category: text("category").notNull(),
  // 消費者庁の表示枠組み: mandatory=特定原材料(義務) / recommended=準ずるもの(推奨) / none
  allergenClass: text("allergen_class", {
    enum: ["none", "mandatory", "recommended"],
  })
    .notNull()
    .default("none"),
  isCustom: integer("is_custom", { mode: "boolean" }).notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const childFoodStatus = sqliteTable(
  "child_food_status",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    childId: integer("child_id")
      .notNull()
      .references(() => children.id, { onDelete: "cascade" }),
    foodId: integer("food_id")
      .notNull()
      .references(() => foods.id, { onDelete: "cascade" }),
    // 未食リストは status を持たない食材 + 明示記録のビューとして出す
    status: text("status", {
      enum: ["tried_ok", "watch", "eaten"],
    }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [uniqueIndex("child_food_status_child_food").on(t.childId, t.foodId)],
);
