import {
  pgTable,
  uuid,
  timestamp,
  text,
  jsonb,
  integer,
  numeric,
  boolean,
  primaryKey,
  index,
  uniqueIndex,
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
    // 끼니 분류(D18): 아침 | 점심 | 저녁 | 간식. 시간 자동추정 + 사용자 변경. 기존 행 호환 위해 nullable.
    mealType: text("meal_type").$type<"아침" | "점심" | "저녁" | "간식">(),
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

// Phase 3: 기간(주/월)당 "마지막 생성 결과" 1개만 보관 — 탭 이동해도 안 사라지게.
// summaryFingerprint로 그때 집계와 지금 집계가 같은지 비교해 변경 여부(stale)만 알려줌(자동 재호출 없음).
export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    periodLabel: text("period_label").$type<"주" | "월">().notNull(),
    reportText: text("report_text").notNull(),
    summaryFingerprint: text("summary_fingerprint").notNull(),
    generatedAt: timestamp("generated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("reports_user_period_idx").on(table.userId, table.periodLabel),
  ],
);

// Phase 6: 전역 공유 음식 DB. 영양정보는 객관적 사실이라 전역(D16 멀티유저 격리와 무관, `03` 참고).
// 수동 검색으로 끼니에 추가된 음식은 출처(식약처/AI/직접등록) 안 가리고 끼니 저장 시점에 upsert(D19).
export const foods = pgTable("foods", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  source: text("source").$type<"gov" | "ai" | "user">().notNull(),
  basisAmount: numeric("basis_amount").notNull(),
  unit: text("unit").notNull(),
  kcal: numeric("kcal").notNull(),
  proteinG: numeric("protein_g").notNull(),
  carbG: numeric("carb_g").notNull(),
  fatG: numeric("fat_g").notNull(),
  sodiumMg: numeric("sodium_mg"),
  sugarG: numeric("sugar_g"),
  fiberG: numeric("fiber_g"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// 사용자별 사용횟수 + 즐겨찾기. `foods.usage_count`를 전역으로 뒀다가 멀티유저에서
// 다른 사용자 사용량이 섞이는 문제를 발견해 사용자별 테이블로 분리(D19, 2026-06-28).
export const userFoods = pgTable(
  "user_foods",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    foodId: uuid("food_id")
      .notNull()
      .references(() => foods.id, { onDelete: "cascade" }),
    usageCount: integer("usage_count").notNull().default(0),
    isFavorite: boolean("is_favorite").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.foodId] })],
);

// Phase 7(D20): BMR/TDEE 계산용 1회성 신체정보 + 목표. 체중은 weight_logs 최신값을 그대로 쓰고 중복 저장 안 함.
export const userProfiles = pgTable("user_profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  birthYear: integer("birth_year"),
  heightCm: numeric("height_cm"),
  gender: text("gender").$type<"male" | "female">(),
  activityLevel: text("activity_level").$type<
    "sedentary" | "light" | "moderate" | "active" | "very_active"
  >(),
  goalType: text("goal_type").$type<"감량" | "유지" | "증량">(),
  targetWeightKg: numeric("target_weight_kg"),
  weeklyRateKg: numeric("weekly_rate_kg"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Phase 4: 푸시 구독. endpoint가 기기/브라우저 단위 식별자라 unique.
// 03 문서 초안엔 user_id가 없었으나(D16 멀티유저 전환 전 작성) 발송 시 사용자별 스코프가 필요해 추가.
export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull().unique(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("push_subscriptions_user_idx").on(table.userId)],
);
