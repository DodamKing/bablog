// AI 추정 결과 타입 (06-ai-pipeline 출력 스키마와 일치).
// 각 항목은 기준 양(amount+unit)과 그 양 기준의 매크로를 가짐 → 보정 화면에서 양 조정 시 비례 스케일.

export type MealItem = {
  name: string;
  amount: number; // 기준 양 (예: 400)
  unit: string; // 단위 (g | 개 | ml | 인분 | 그릇 ...)
  kcal: number; // 위 amount 기준 매크로
  protein_g: number;
  carb_g: number;
  fat_g: number;
};

export type MealTotals = {
  kcal: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
};

export type MealEstimate = {
  items: MealItem[];
  total: MealTotals;
  confidence: "low" | "medium" | "high";
  notes: string;
};

// Phase 3 보고서(06-B) 입력: 기간 집계. generateReport()가 이걸 받아 자연어로 푼다.
export type ReportDaySummary = {
  date: string; // YYYY-MM-DD
  kcal: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
  mealCount: number;
};

export type ReportWeightPoint = {
  date: string; // YYYY-MM-DD
  weightKg: number;
};

export type ReportPeriodSummary = {
  periodLabel: "주" | "월";
  days: ReportDaySummary[]; // 기록이 있는 날만
  weightPoints: ReportWeightPoint[];
};

// 기간 평균(비교용) — generateReport 두 번째 인자(trend)의 항목 하나.
export type ReportAverage = {
  avgKcal: number;
  avgProteinG: number;
  avgCarbG: number;
  avgFatG: number;
  recordedDays: number;
};

// 과거 기간 하나의 평균 + 그 기간의 날짜 범위. 오래된 순으로 여러 개 모으면 "최근 N주 추이".
export type ReportTrendPoint = ReportAverage & {
  rangeStart: string; // YYYY-MM-DD
  rangeEnd: string; // YYYY-MM-DD (이 날 미포함)
};
