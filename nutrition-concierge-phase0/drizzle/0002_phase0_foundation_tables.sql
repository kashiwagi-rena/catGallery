DROP TABLE entries;
--> statement-breakpoint
CREATE TABLE accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  display_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  notification_time TEXT NOT NULL DEFAULT '日曜 19:00',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE children (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nickname TEXT NOT NULL,
  birth_year_month TEXT NOT NULL,
  attends_nursery INTEGER NOT NULL DEFAULT 0,
  nursery_name TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE child_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  allergy_food_ids TEXT NOT NULL DEFAULT '',
  dislikes TEXT NOT NULL DEFAULT '',
  doctor_hours_memo TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT ''
);
--> statement-breakpoint
CREATE TABLE foods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  aliases TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL,
  allergen_class TEXT NOT NULL DEFAULT 'none',
  is_custom INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE child_food_status (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  food_id INTEGER NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX child_food_status_child_food ON child_food_status (child_id, food_id);
