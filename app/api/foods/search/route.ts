import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getUserId } from "@/lib/auth-helpers";
import { searchFoods } from "@/lib/food/foodApi";

export const maxDuration = 15;

// 수동 입력용 음식 검색 (D18, 식약처 DB). GET ?q=검색어
export async function GET(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!q) return NextResponse.json({ foods: [] });

  try {
    const foods = await searchFoods(q);
    return NextResponse.json({ foods });
  } catch (err) {
    console.error("searchFoods failed:", err);
    return NextResponse.json(
      { error: "검색에 실패했어요. 잠시 후 다시 시도해 주세요." },
      { status: 502 },
    );
  }
}
