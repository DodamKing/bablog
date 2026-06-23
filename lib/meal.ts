// 끼니 분류 (D18). meals.meal_type 에 저장.

export type MealType = "아침" | "점심" | "저녁" | "간식";

export const MEAL_TYPES: MealType[] = ["아침", "점심", "저녁", "간식"];

// 먹은 시간으로 끼니 자동 추정 (사용자가 보정 화면에서 바꿀 수 있음).
export function inferMealType(d: Date = new Date()): MealType {
  const h = d.getHours();
  if (h >= 5 && h < 11) return "아침";
  if (h >= 11 && h < 16) return "점심";
  if (h >= 16 && h < 21) return "저녁";
  return "간식";
}
