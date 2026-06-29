// Phase 7(D20): BMR/TDEE 기반 목표 kcal·매크로 계산. 결정적 코드 계산, LLM 아님.

export type Gender = "male" | "female";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type GoalType = "감량" | "유지" | "증량";

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: "거의 안 움직임",
  light: "가벼운 활동 (주 1~3일 운동)",
  moderate: "보통 활동 (주 3~5일 운동)",
  active: "활동적 (주 6~7일 운동)",
  very_active: "매우 활동적 (매일 강도 높은 운동/육체노동)",
};

const KCAL_PER_KG = 7700;
// D20: 매크로 비율 고정값(탄/단/지). 조절 UI는 Phase 8+ 백로그.
const MACRO_RATIO = { carb: 0.5, protein: 0.2, fat: 0.3 };

export type UserProfileInput = {
  birthYear: number | null;
  heightCm: number | null;
  gender: Gender | null;
  activityLevel: ActivityLevel | null;
  goalType: GoalType | null;
  weeklyRateKg: number | null;
};

export type DailyGoals = {
  bmr: number;
  tdee: number;
  targetKcal: number;
  targetProteinG: number;
  targetCarbG: number;
  targetFatG: number;
  bmi: number;
};

// Mifflin-St Jeor.
function calcBmr(weightKg: number, heightCm: number, age: number, gender: Gender): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return gender === "male" ? base + 5 : base - 161;
}

function calcTargetKcal(tdee: number, goalType: GoalType | null, weeklyRateKg: number | null): number {
  if (!goalType || goalType === "유지" || !weeklyRateKg) return tdee;
  const dailyDelta = (weeklyRateKg * KCAL_PER_KG) / 7;
  return goalType === "감량" ? tdee - dailyDelta : tdee + dailyDelta;
}

// 신체정보 + 최신 체중이 모두 있어야 계산 가능. 하나라도 없으면 null(표시는 호출부가 안내문으로 대체).
export function computeDailyGoals(
  profile: UserProfileInput,
  currentWeightKg: number | null,
): DailyGoals | null {
  const { birthYear, heightCm, gender, activityLevel, goalType, weeklyRateKg } = profile;
  if (!birthYear || !heightCm || !gender || !activityLevel || !currentWeightKg) {
    return null;
  }

  const age = new Date().getFullYear() - birthYear;
  const bmr = calcBmr(currentWeightKg, heightCm, age, gender);
  const tdee = bmr * ACTIVITY_FACTORS[activityLevel];
  const targetKcal = calcTargetKcal(tdee, goalType, weeklyRateKg);
  const heightM = heightCm / 100;
  const bmi = currentWeightKg / (heightM * heightM);

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    targetKcal: Math.round(targetKcal),
    targetProteinG: Math.round((targetKcal * MACRO_RATIO.protein) / 4),
    targetCarbG: Math.round((targetKcal * MACRO_RATIO.carb) / 4),
    targetFatG: Math.round((targetKcal * MACRO_RATIO.fat) / 9),
    bmi: Math.round(bmi * 10) / 10,
  };
}
