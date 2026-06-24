import type { ReportAverage, ReportDaySummary, ReportPeriodSummary } from "@/lib/ai/types";

type MealLite = {
  eatenAt: Date;
  kcal: number;
  proteinG: number;
  carbG: number;
  fatG: number;
};

type WeightLite = {
  loggedAt: Date;
  weightKg: number;
};

// 끼니/체중 원본 행을 일별 집계(보고서 06-B 입력 형태)로 변환.
export function summarizePeriod(
  periodLabel: "주" | "월",
  meals: MealLite[],
  weightLogs: WeightLite[],
): ReportPeriodSummary {
  const dayMap = new Map<
    string,
    { kcal: number; protein_g: number; carb_g: number; fat_g: number; mealCount: number }
  >();

  for (const m of meals) {
    const key = dayKey(m.eatenAt);
    const cur = dayMap.get(key) ?? {
      kcal: 0,
      protein_g: 0,
      carb_g: 0,
      fat_g: 0,
      mealCount: 0,
    };
    cur.kcal += m.kcal;
    cur.protein_g += m.proteinG;
    cur.carb_g += m.carbG;
    cur.fat_g += m.fatG;
    cur.mealCount += 1;
    dayMap.set(key, cur);
  }

  const days = [...dayMap.entries()]
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const weightPoints = weightLogs
    .map((w) => ({ date: dayKey(w.loggedAt), weightKg: w.weightKg }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return { periodLabel, days, weightPoints };
}

export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

// 일별 집계의 평균(이전 기간 비교, 통계 카드 등에 재사용).
export function averageOf(days: ReportDaySummary[]): ReportAverage | null {
  if (days.length === 0) return null;

  const sum = days.reduce(
    (acc, d) => ({
      kcal: acc.kcal + d.kcal,
      protein: acc.protein + d.protein_g,
      carb: acc.carb + d.carb_g,
      fat: acc.fat + d.fat_g,
    }),
    { kcal: 0, protein: 0, carb: 0, fat: 0 },
  );
  const n = days.length;

  return {
    avgKcal: Math.round(sum.kcal / n),
    avgProteinG: Math.round(sum.protein / n),
    avgCarbG: Math.round(sum.carb / n),
    avgFatG: Math.round(sum.fat / n),
    recordedDays: n,
  };
}

// 집계 내용을 비교 가능한 문자열로 — DB jsonb의 키 순서 보장 불확실성을 피하려고
// 객체 그대로 비교하지 않고 직접 만든 평문 키로 비교한다(변경 여부 = stale 판단용).
export function summaryFingerprint(s: ReportPeriodSummary): string {
  const daysPart = s.days
    .map((d) => `${d.date}:${d.kcal}:${d.protein_g}:${d.carb_g}:${d.fat_g}:${d.mealCount}`)
    .join("|");
  const weightPart = s.weightPoints.map((w) => `${w.date}:${w.weightKg}`).join("|");
  return `${daysPart}__${weightPart}`;
}
