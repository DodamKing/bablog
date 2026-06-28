import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getUserId } from "@/lib/auth-helpers";
import { searchFoods } from "@/lib/food/foodApi";
import { listFrequentFoods, searchFoodsTable } from "@/lib/food/foodsDb";
import type { FoodHit } from "@/lib/food/types";

export const maxDuration = 15;

const normalize = (s: string) => s.trim().toLowerCase();

// 수동 입력용 음식 검색 (D18, 식약처 DB + Phase 6, foods 테이블). GET ?q=검색어
// q가 비어있으면 즐겨찾기+자주 먹는 음식(이 사용자, foods 테이블) 목록을 대신 반환.
export async function GET(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!q) {
    const foods = await listFrequentFoods(userId);
    return NextResponse.json({ foods });
  }

  try {
    const [govHits, tableHits] = await Promise.all([
      searchFoods(q).catch((err) => {
        console.error("searchFoods(gov) failed:", err);
        return [] as FoodHit[];
      }),
      searchFoodsTable(q, userId),
    ]);

    // 이름 기준 병합 — 같은 이름이면 식약처 결과(더 정확)를 쓰되, foods 쪽 즐겨찾기 표시는 유지.
    const byName = new Map<string, FoodHit>();
    for (const hit of tableHits) byName.set(normalize(hit.name), hit);
    for (const hit of govHits) {
      const key = normalize(hit.name);
      const existing = byName.get(key);
      byName.set(
        key,
        existing ? { ...hit, favorited: existing.favorited } : hit,
      );
    }

    return NextResponse.json({ foods: Array.from(byName.values()) });
  } catch (err) {
    console.error("food search failed:", err);
    return NextResponse.json(
      { error: "검색에 실패했어요. 잠시 후 다시 시도해 주세요." },
      { status: 502 },
    );
  }
}
