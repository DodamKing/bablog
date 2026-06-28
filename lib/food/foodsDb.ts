import "server-only";
import { and, desc, eq, ilike, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { foods, userFoods } from "@/lib/db/schema";
import type { FoodBasis, FoodHit } from "./types";

// Phase 6: `foods`(전역 영양정보) + `userFoods`(사용자별 사용횟수/즐겨찾기) 조회·갱신.
// D19: foods는 식약처/AI/직접등록 가리지 않고 끼니 저장 시점에 upsert, 사용횟수는 사용자별로 분리.

type FoodRow = typeof foods.$inferSelect;

function rowToHit(row: FoodRow, userId: string, favorited: boolean): FoodHit {
  return {
    code: row.id,
    name: row.name,
    maker: null,
    basisAmount: Number(row.basisAmount),
    unit: row.unit,
    kcal: Number(row.kcal),
    protein_g: Number(row.proteinG),
    carb_g: Number(row.carbG),
    fat_g: Number(row.fatG),
    servingWeight: null,
    fromFoodsTable: true,
    favorited,
    source: row.source,
    mine: row.source === "user" && row.createdBy === userId,
  };
}

// 검색어로 foods 테이블 매칭(식약처 결과와 병합용). 이 사용자의 즐겨찾기 여부 포함.
export async function searchFoodsTable(
  query: string,
  userId: string,
  limit = 20,
): Promise<FoodHit[]> {
  const rows = await db
    .select({ food: foods, isFavorite: userFoods.isFavorite })
    .from(foods)
    .leftJoin(
      userFoods,
      and(eq(userFoods.foodId, foods.id), eq(userFoods.userId, userId)),
    )
    .where(ilike(foods.name, `%${query}%`))
    .limit(limit);

  return rows.map((r) => rowToHit(r.food, userId, r.isFavorite ?? false));
}

// 검색창이 비어있을 때 — 이 사용자의 즐겨찾기 우선 + 사용횟수 내림차순 "자주 먹는 음식".
export async function listFrequentFoods(
  userId: string,
  limit = 15,
): Promise<FoodHit[]> {
  const rows = await db
    .select({ food: foods, isFavorite: userFoods.isFavorite })
    .from(userFoods)
    .innerJoin(foods, eq(foods.id, userFoods.foodId))
    .where(eq(userFoods.userId, userId))
    .orderBy(desc(userFoods.isFavorite), desc(userFoods.usageCount))
    .limit(limit);

  return rows.map((r) => rowToHit(r.food, userId, r.isFavorite ?? false));
}

// name 기준 upsert(이미 있으면 영양정보 안 바꾸고 기존 행 그대로 반환) → foods.id 확보.
async function upsertFood(
  input: FoodBasis,
  source: "gov" | "ai" | "user",
  userId: string,
): Promise<string> {
  const [row] = await db
    .insert(foods)
    .values({
      name: input.name,
      source,
      basisAmount: String(input.amount),
      unit: input.unit,
      kcal: String(input.kcal),
      proteinG: String(input.protein_g),
      carbG: String(input.carb_g),
      fatG: String(input.fat_g),
      createdBy: userId,
    })
    .onConflictDoUpdate({
      target: foods.name,
      set: { name: sql`excluded.name` }, // no-op — 기존 행 id를 RETURNING으로 받기 위한 트릭
    })
    .returning({ id: foods.id });
  return row.id;
}

// 이 사용자의 사용횟수 +1(없으면 새로 생성).
async function bumpUsage(userId: string, foodId: string): Promise<void> {
  await db
    .insert(userFoods)
    .values({ userId, foodId, usageCount: 1 })
    .onConflictDoUpdate({
      target: [userFoods.userId, userFoods.foodId],
      set: { usageCount: sql`${userFoods.usageCount} + 1` },
    });
}

// 끼니 저장 시점에 호출 — 출처 안 가리고 upsert + 사용횟수 +1(D19).
export async function recordFoodUsage(
  userId: string,
  input: FoodBasis,
  source: "gov" | "ai" | "user",
): Promise<void> {
  const foodId = await upsertFood(input, source, userId);
  await bumpUsage(userId, foodId);
}

// 직접 등록(검색 결과 없을 때) — 사용횟수는 안 올림, 실제로 끼니에 추가돼 저장될 때 recordFoodUsage가 처리.
export async function registerFood(
  userId: string,
  input: FoodBasis,
): Promise<FoodHit> {
  const foodId = await upsertFood(input, "user", userId);
  const [row] = await db.select().from(foods).where(eq(foods.id, foodId));
  return rowToHit(row, userId, false);
}

// 직접 등록한 음식 삭제 — 본인이 등록한 것만(source: "user" && created_by 일치).
// 이미 끼니에 저장된 기록은 영양정보를 그 시점 스냅샷으로 보관해서(meals.items, jsonb) 영향 없음.
export async function deleteOwnFood(
  userId: string,
  foodId: string,
): Promise<boolean> {
  const [row] = await db
    .delete(foods)
    .where(
      and(
        eq(foods.id, foodId),
        eq(foods.source, "user"),
        eq(foods.createdBy, userId),
      ),
    )
    .returning({ id: foods.id });
  return !!row;
}

// 즐겨찾기 토글. foodId가 이미 있으면 그대로, 없으면(식약처 라이브 결과) input으로 upsert 후 토글.
export async function setFavorite(
  userId: string,
  target: { foodId: string } | { input: FoodBasis; source: "gov" | "ai" | "user" },
  favorite: boolean,
): Promise<{ foodId: string }> {
  const foodId =
    "foodId" in target
      ? target.foodId
      : await upsertFood(target.input, target.source, userId);

  await db
    .insert(userFoods)
    .values({ userId, foodId, isFavorite: favorite })
    .onConflictDoUpdate({
      target: [userFoods.userId, userFoods.foodId],
      set: { isFavorite: favorite },
    });

  return { foodId };
}
