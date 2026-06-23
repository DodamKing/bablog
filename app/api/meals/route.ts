import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { and, desc, eq, gte } from "drizzle-orm";
import { db } from "@/lib/db";
import { meals } from "@/lib/db/schema";
import { getUserId } from "@/lib/auth-helpers";
import { uploadMealPhoto } from "@/lib/storage/r2";

export const maxDuration = 30;

// 현재 사용자의 끼니 목록 (최근순).
// ?days=N → 최근 N일치(개수 상한 의존 X, 히스토리 월간 차트용). 없으면 최근 100건.
export async function GET(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const daysRaw = req.nextUrl.searchParams.get("days");
  const days = daysRaw ? Math.min(400, Math.max(1, parseInt(daysRaw, 10))) : null;

  let where = eq(meals.userId, userId);
  if (days) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    where = and(eq(meals.userId, userId), gte(meals.eatenAt, since))!;
  }

  const rows = await db
    .select()
    .from(meals)
    .where(where)
    .orderBy(desc(meals.eatenAt))
    .limit(days ? 2000 : 100);

  return NextResponse.json({ meals: rows });
}

// 끼니 저장. multipart: data(JSON 문자열) + image(선택 파일).
export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const dataRaw = form.get("data");
  if (typeof dataRaw !== "string") {
    return NextResponse.json({ error: "데이터가 없어요." }, { status: 400 });
  }
  const data = JSON.parse(dataRaw);

  // 사진이 있으면 R2 업로드 (미설정 시 null).
  let photoUrl: string | null = null;
  const image = form.get("image");
  if (image instanceof File && image.size > 0) {
    const buf = Buffer.from(await image.arrayBuffer());
    photoUrl = await uploadMealPhoto(buf, image.type || "image/jpeg");
  }

  const [row] = await db
    .insert(meals)
    .values({
      userId,
      ...(data.eatenAt ? { eatenAt: new Date(data.eatenAt) } : {}),
      mealType: data.mealType ?? null,
      photoUrl,
      items: data.items ?? [],
      kcal: Math.round(Number(data.kcal) || 0),
      proteinG: String(Number(data.protein_g) || 0),
      carbG: String(Number(data.carb_g) || 0),
      fatG: String(Number(data.fat_g) || 0),
      note: data.note ? String(data.note) : null,
      aiRaw: data.aiRaw ?? null,
    })
    .returning();

  return NextResponse.json({ meal: row });
}
