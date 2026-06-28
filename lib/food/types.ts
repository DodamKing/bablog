// 식약처 식품영양성분 검색 결과 (클라이언트/서버 공용 타입 — server-only 아님).
// 영양 값은 모두 basisAmount(보통 100) + unit 기준. 보정 화면에서 양 조정 시 비례 스케일.

export type FoodHit = {
  code: string; // FOOD_CD(식약처) 또는 foods.id(uuid, Phase 6 — fromFoodsTable일 때)
  name: string; // FOOD_NM_KR
  maker: string | null; // MAKER_NM (상용제품일 때)
  basisAmount: number; // 영양값 기준 양 (SERVING_SIZE, 보통 100)
  unit: string; // "g" | "ml"
  kcal: number; // basisAmount 기준
  protein_g: number;
  carb_g: number;
  fat_g: number;
  servingWeight: number | null; // Z10500 1회 제공 중량 (기본 양으로 사용)
  // Phase 6: `foods` 테이블 출신이면 true(이때 code가 foods.id) — 즐겨찾기 토글 시
  // 식약처 라이브 결과(false)는 먼저 upsert해서 id를 만들어야 함(D19).
  fromFoodsTable?: boolean;
  favorited?: boolean; // 이 사용자가 즐겨찾기했는지 (fromFoodsTable일 때만 의미 있음)
  source?: "gov" | "ai" | "user"; // fromFoodsTable일 때만 있음
  mine?: boolean; // 이 사용자가 직접 등록한 것인지(source: "user" && 본인) — 수정/삭제 노출용
};

export type FoodBasis = {
  name: string;
  amount: number;
  unit: string;
  kcal: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
};

// FoodHit(기준 양 기준 매크로) → 실제 쓰는 양(1회 제공량) 기준 매크로.
// 보정 화면 항목 추가(`MealItem`)와 `foods` upsert(`FoodBasis`) 양쪽에서 공용.
export function hitToBasis(h: FoodHit): FoodBasis {
  const amount =
    h.servingWeight && h.servingWeight > 0 ? h.servingWeight : h.basisAmount;
  const f = h.basisAmount ? amount / h.basisAmount : 1;
  return {
    name: h.name,
    amount: Math.round(amount * 10) / 10,
    unit: h.unit,
    kcal: h.kcal * f,
    protein_g: h.protein_g * f,
    carb_g: h.carb_g * f,
    fat_g: h.fat_g * f,
  };
}
