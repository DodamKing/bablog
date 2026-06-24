import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { gte, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { meals, pushSubscriptions } from "@/lib/db/schema";
import { sendPush } from "@/lib/push/send";
import { dayKey } from "@/lib/report/summarize";
import type { MealType } from "@/lib/meal";

export const maxDuration = 30;

// Vercel Cron이 정시에 호출(08 문서). slot당 "기대 끼니"를 이미 기록한 사용자는 스킵.
// 시간대 윈도우(11~15시 등) 대신 meals.meal_type을 그대로 쓴다 — 사용자가 보정 화면에서
// 고친 최종 분류라 시간 재추정보다 정확하고, 별도 로직도 필요 없다.
const SLOTS: Record<string, { mealType: MealType; title: string; body: string }> = {
  lunch: { mealType: "점심", title: "밥로그", body: "점심 기록하셨어요? 📸" },
  dinner: { mealType: "저녁", title: "밥로그", body: "저녁 기록하셨어요? 📸" },
};

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const slot = SLOTS[req.nextUrl.searchParams.get("slot") ?? ""];
  if (!slot) {
    return NextResponse.json({ error: "알 수 없는 slot이에요." }, { status: 400 });
  }

  const subs = await db.select().from(pushSubscriptions);
  if (subs.length === 0) {
    return NextResponse.json({ sent: 0, skipped: 0 });
  }

  // 오늘치만 필요하지만 타임존 경계 SQL 계산 대신 1일 여유를 두고 가져와 JS에서 dayKey로 거른다
  // (lib/report/summarize.ts와 동일 패턴 — 서버 로컬 타임존 기준, 앱 전체가 같은 가정).
  const since = new Date();
  since.setDate(since.getDate() - 1);
  const recentMeals = await db
    .select({ userId: meals.userId, eatenAt: meals.eatenAt, mealType: meals.mealType })
    .from(meals)
    .where(gte(meals.eatenAt, since));

  const today = dayKey(new Date());
  const recordedToday = new Set(
    recentMeals
      .filter((m) => m.mealType === slot.mealType && dayKey(m.eatenAt) === today)
      .map((m) => m.userId),
  );

  const userIds = [...new Set(subs.map((s) => s.userId))];
  let sent = 0;
  let skipped = 0;
  const deadEndpoints: string[] = [];

  for (const userId of userIds) {
    if (recordedToday.has(userId)) {
      skipped++;
      continue;
    }
    for (const sub of subs.filter((s) => s.userId === userId)) {
      const ok = await sendPush(sub, { title: slot.title, body: slot.body, url: "/" });
      if (ok) sent++;
      else deadEndpoints.push(sub.endpoint);
    }
  }

  if (deadEndpoints.length > 0) {
    await db
      .delete(pushSubscriptions)
      .where(inArray(pushSubscriptions.endpoint, deadEndpoints));
  }

  return NextResponse.json({ sent, skipped });
}
