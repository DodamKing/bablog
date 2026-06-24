import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { meals } from "@/lib/db/schema";
import { getUserId } from "@/lib/auth-helpers";

// 끼니 수정. JSON: { items, kcal, protein_g, carb_g, fat_g, mealType, note }
// 사진 교체는 범위 밖(D17 MVP 그대로 — 기존 photo_url 유지).
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const data = await req.json().catch(() => ({}));

  const [row] = await db
    .update(meals)
    .set({
      items: data.items ?? [],
      kcal: Math.round(Number(data.kcal) || 0),
      proteinG: String(Number(data.protein_g) || 0),
      carbG: String(Number(data.carb_g) || 0),
      fatG: String(Number(data.fat_g) || 0),
      mealType: data.mealType ?? null,
      note: data.note ? String(data.note) : null,
    })
    .where(and(eq(meals.id, id), eq(meals.userId, userId)))
    .returning();

  if (!row) {
    return NextResponse.json({ error: "찾을 수 없어요." }, { status: 404 });
  }
  return NextResponse.json({ meal: row });
}

// 끼니 삭제. 사진(R2) 객체는 정리하지 않음 — DB row만 제거(D17 MVP 방침 유지).
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const [row] = await db
    .delete(meals)
    .where(and(eq(meals.id, id), eq(meals.userId, userId)))
    .returning({ id: meals.id });

  if (!row) {
    return NextResponse.json({ error: "찾을 수 없어요." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
