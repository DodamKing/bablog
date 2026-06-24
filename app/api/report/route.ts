import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { and, eq, gte, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { meals, reports, weightLogs } from "@/lib/db/schema";
import { getUserId } from "@/lib/auth-helpers";
import { generateReport } from "@/lib/ai/gemini";
import { averageOf, dayKey, summarizePeriod, summaryFingerprint } from "@/lib/report/summarize";
import type { ReportPeriodSummary, ReportTrendPoint } from "@/lib/ai/types";

export const maxDuration = 30;

type Period = "주" | "월";

// "최근 추이"로 보여줄 과거 기간 개수(이번 기간 제외, 오래된 순으로 N개).
const TREND_BUCKETS = 4;

function periodDays(period: Period): number {
  return period === "월" ? 30 : 7;
}

function parsePeriod(v: unknown): Period {
  return v === "월" ? "월" : "주";
}

async function loadSummary(userId: string, period: Period): Promise<ReportPeriodSummary> {
  const days = periodDays(period);
  const since = new Date();
  since.setDate(since.getDate() - days);

  const [mealRows, weightRows] = await Promise.all([
    db
      .select()
      .from(meals)
      .where(and(eq(meals.userId, userId), gte(meals.eatenAt, since))),
    db
      .select()
      .from(weightLogs)
      .where(and(eq(weightLogs.userId, userId), gte(weightLogs.loggedAt, since))),
  ]);

  return summarizePeriod(
    period,
    mealRows.map((m) => ({
      eatenAt: m.eatenAt,
      kcal: m.kcal,
      proteinG: Number(m.proteinG),
      carbG: Number(m.carbG),
      fatG: Number(m.fatG),
    })),
    weightRows.map((w) => ({ loggedAt: w.loggedAt, weightKg: Number(w.weightKg) })),
  );
}

// "최근 추이": 이번 기간 이전의 N개 과거 기간 평균(오래된 순). meals는 영구 보관되니
// 새 저장소 없이 그냥 더 넓게 조회해서 끼니별로 버킷에 나눠 담는다 — AI "학습" 대신 원본 재사용.
async function loadTrend(userId: string, period: Period): Promise<ReportTrendPoint[]> {
  const days = periodDays(period);
  const rangeUntil = new Date(); // 이번 기간 시작 시점(이번 기간은 summary가 이미 다룸)
  rangeUntil.setDate(rangeUntil.getDate() - days);
  const rangeSince = new Date();
  rangeSince.setDate(rangeSince.getDate() - days * (TREND_BUCKETS + 1));

  const mealRows = await db
    .select()
    .from(meals)
    .where(
      and(eq(meals.userId, userId), gte(meals.eatenAt, rangeSince), lt(meals.eatenAt, rangeUntil)),
    );

  const points: ReportTrendPoint[] = [];
  for (let k = TREND_BUCKETS; k >= 1; k--) {
    const bucketUntil = new Date();
    bucketUntil.setDate(bucketUntil.getDate() - days * k);
    const bucketSince = new Date();
    bucketSince.setDate(bucketSince.getDate() - days * (k + 1));

    const bucketMeals = mealRows.filter(
      (m) => m.eatenAt >= bucketSince && m.eatenAt < bucketUntil,
    );
    const bucketSummary = summarizePeriod(
      period,
      bucketMeals.map((m) => ({
        eatenAt: m.eatenAt,
        kcal: m.kcal,
        proteinG: Number(m.proteinG),
        carbG: Number(m.carbG),
        fatG: Number(m.fatG),
      })),
      [],
    );
    const avg = averageOf(bucketSummary.days);
    if (avg) {
      points.push({ ...avg, rangeStart: dayKey(bucketSince), rangeEnd: dayKey(bucketUntil) });
    }
  }

  return points;
}

// 현재 집계 + 저장된 "마지막 생성 결과" 조회. AI 호출 없음 — 탭 재방문 시 안 사라지게.
// 저장된 게 있으면 그때 집계와 지금 집계를 비교해서 stale(변경 여부)만 알려준다.
export async function GET(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const period = parsePeriod(req.nextUrl.searchParams.get("period"));
  const summary = await loadSummary(userId, period);

  const [stored] = await db
    .select()
    .from(reports)
    .where(and(eq(reports.userId, userId), eq(reports.periodLabel, period)));

  if (!stored) {
    return NextResponse.json({ summary, report: null, generatedAt: null, stale: false });
  }

  const stale = summaryFingerprint(summary) !== stored.summaryFingerprint;
  return NextResponse.json({
    summary,
    report: stored.reportText,
    generatedAt: stored.generatedAt,
    stale,
  });
}

// 새로 생성. 항상 AI 호출 — "보고서 생성"/"다시 생성" 명시적 클릭에서만 일어난다(캐싱 안 함, 09 결정).
export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { period?: unknown };
  const period = parsePeriod(body.period);

  const summary = await loadSummary(userId, period);

  if (summary.days.length === 0) {
    // 기록이 없으면 AI 호출도, 저장도 안 함 — 빈 슬롯을 의미 없는 응답으로 덮어쓰지 않는다.
    return NextResponse.json({
      summary,
      report: "아직 이 기간엔 기록이 없어요. 몇 끼 더 쌓이면 다시 와서 봐요!",
      generatedAt: null,
      stale: false,
    });
  }

  const trend = await loadTrend(userId, period);
  const report = await generateReport(summary, trend);
  const fingerprint = summaryFingerprint(summary);

  const [row] = await db
    .insert(reports)
    .values({
      userId,
      periodLabel: period,
      reportText: report,
      summaryFingerprint: fingerprint,
    })
    .onConflictDoUpdate({
      target: [reports.userId, reports.periodLabel],
      set: { reportText: report, summaryFingerprint: fingerprint, generatedAt: new Date() },
    })
    .returning();

  return NextResponse.json({
    summary,
    report: row.reportText,
    generatedAt: row.generatedAt,
    stale: false,
  });
}
