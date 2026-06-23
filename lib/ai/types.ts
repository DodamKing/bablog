// AI 추정 결과 타입 (06-ai-pipeline 출력 스키마와 일치).

export type MealItem = {
  name: string;
  qty: string;
  kcal: number;
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
