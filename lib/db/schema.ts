import {
  pgTable,
  uuid,
  timestamp,
  text,
  jsonb,
  integer,
  numeric,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

// ── Auth.js (NextAuth v5) 표준 테이블 ──────────────────────────────
// Drizzle 어댑터가 기대하는 스키마. 사용자/카카오 계정 정보를 Neon에 영구 저장.
// (세션은 JWT 전략이라 sessions 테이블은 실제로 안 쓰지만, 어댑터 표준이라 정의해 둠.)

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("email_verified", { withTimezone: true }),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ],
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { withTimezone: true }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })],
);

// ── 도메인 테이블 ─────────────────────────────────────────────────
// 멀티유저(D16): 모든 기록은 user_id로 소유자를 가짐. 쿼리는 항상 user_id로 스코프.

export const meals = pgTable(
  "meals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
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
  (table) => [
    index("meals_user_eaten_at_idx").on(table.userId, table.eatenAt),
  ],
);

export const weightLogs = pgTable(
  "weight_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
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
  (table) => [
    index("weight_logs_user_logged_at_idx").on(table.userId, table.loggedAt),
  ],
);
