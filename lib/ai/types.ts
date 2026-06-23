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
