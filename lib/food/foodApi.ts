import "server-only";
import type { FoodHit } from "./types";

// 식약처 식품영양성분 DB API (D18, 방식 A: 라이브 호출).
// 한식 커버리지 충분(김치찌개 356·비빔밥 718건 등), 부분 매칭 지원, 전체 30만 건.
// 일 10,000 호출 한도지만 소규모 사용이라 여유. 필드 매핑은 실호출로 확정:
//   AMT_NUM1=에너지(kcal) · AMT_NUM3=단백질 · AMT_NUM4=지방 · AMT_NUM6=탄수 (모두 SERVING_SIZE 기준)
//   SERVING_SIZE="100g"/"100mL" · Z10500=1회 제공 중량
const ENDPOINT =
  "https://apis.data.go.kr/1471000/FoodNtrCpntDbInfo02/getFoodNtrCpntDbInq02";

// 구어체 → 식약처 공식 표제어. API가 표제어 부분 매칭이라 "공기밥" 같은
// 일상어는 0건이 나옴. 흔한 것만 매핑하고, 나머지는 검색 0건 → AI 폴백으로 처리.
const ALIASES: Record<string, string> = {
  공기밥: "쌀밥",
  맨밥: "쌀밥",
  흰쌀밥: "쌀밥",
  흰밥: "쌀밥",
  밥: "쌀밥",
};

export async function searchFoods(
  query: string,
  limit = 20,
): Promise<FoodHit[]> {
  const key = process.env.FOOD_API_KEY;
  if (!key) throw new Error("FOOD_API_KEY 미설정");

  const raw = query.trim();
  if (!raw) return [];
  const q = ALIASES[raw] ?? raw;

  const url =
    `${ENDPOINT}?serviceKey=${encodeURIComponent(key)}&type=json` +
    `&numOfRows=${limit}&pageNo=1&FOOD_NM_KR=${encodeURIComponent(q)}`;

  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`식약처 API ${res.status}`);

  const json = await res.json();
  const items = json?.body?.items;
  if (!Array.isArray(items)) return []; // totalCount 0 → items 없음

  return items
    .map(mapHit)
    .filter((h): h is FoodHit => h !== null);
}

type RawItem = Record<string, unknown>;

function mapHit(raw: RawItem): FoodHit | null {
  const name = raw?.FOOD_NM_KR;
  if (typeof name !== "string" || !name) return null;

  const basis = parseAmount(raw?.SERVING_SIZE) ?? { amount: 100, unit: "g" };
  const serving = parseAmount(raw?.Z10500);

  return {
    code: String(raw?.FOOD_CD ?? name),
    name,
    maker: raw?.MAKER_NM ? String(raw.MAKER_NM) : null,
    basisAmount: basis.amount,
    unit: basis.unit,
    kcal: num(raw?.AMT_NUM1),
    protein_g: num(raw?.AMT_NUM3),
    carb_g: num(raw?.AMT_NUM6),
    fat_g: num(raw?.AMT_NUM4),
    servingWeight: serving?.amount ?? null,
  };
}

// "100g" / "100mL" / "270.000g" → { amount, unit }
function parseAmount(s: unknown): { amount: number; unit: string } | null {
  if (typeof s !== "string") return null;
  const m = s.match(/([\d.,]+)\s*(mL|ml|ML|g|G)?/);
  if (!m) return null;
  const amount = num(m[1]);
  if (!amount) return null;
  const unit = (m[2] ?? "g").toLowerCase() === "ml" ? "ml" : "g";
  return { amount, unit };
}

function num(v: unknown): number {
  const n =
    typeof v === "string" ? parseFloat(v.replace(/,/g, "")) : (v as number);
  return Number.isFinite(n) ? n : 0;
}
