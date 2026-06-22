import {
  pgTable,
  uuid,
  timestamp,
  text,
  jsonb,
  integer,
  numeric,
  index,
} from "drizzle-orm/pg-core";

export const meals = pgTable(
  "meals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eatenAt: timestamp("eaten_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    photoUrl: text("photo_url"),
    items: jsonb("items").notNull(),
    kcal: integer("kcal").notNull(),
    proteinG: numeric("protein_g").notNull(),
    carbG: numeric("carb_g").notNull(),
    fatG: numeric("fat_g").notNull(),
    note: text("note"),
    aiRaw: jsonb("ai_raw"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("meals_eaten_at_idx").on(table.eatenAt)],
);

export const weightLogs = pgTable(
  "weight_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    loggedAt: timestamp("logged_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    weightKg: numeric("weight_kg").notNull(),
    bodyFatPct: numeric("body_fat_pct"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("weight_logs_logged_at_idx").on(table.loggedAt)],
);
