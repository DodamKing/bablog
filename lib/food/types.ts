// 식약처 식품영양성분 검색 결과 (클라이언트/서버 공용 타입 — server-only 아님).
// 영양 값은 모두 basisAmount(보통 100) + unit 기준. 보정 화면에서 양 조정 시 비례 스케일.

export type FoodHit = {
  code: string; // FOOD_CD
  name: string; // FOOD_NM_KR
  maker: string | null; // MAKER_NM (상용제품일 때)
  basisAmount: number; // 영양값 기준 양 (SERVING_SIZE, 보통 100)
  unit: string; // "g" | "ml"
  kcal: number; // basisAmount 기준
  protein_g: number;
  carb_g: number;
  fat_g: number;
  servingWeight: number | null; // Z10500 1회 제공 중량 (기본 양으로 사용)
};
