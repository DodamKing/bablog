import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getUserId } from "@/lib/auth-helpers";
import { setFavorite } from "@/lib/food/foodsDb";
import { hitToBasis, type FoodHit } from "@/lib/food/types";

// 즐겨찾기 토글 (Phase 6). body: { foodId } 또는 { hit: FoodHit }(아직 foods에 없는
// 식약처 라이브 결과 — 서버가 upsert 후 즐겨찾기 처리, D19).
function resolveTarget(body: { foodId?: unknown; hit?: unknown }) {
  if (typeof body.foodId === "string") return { foodId: body.foodId } as const;
  if (body.hit && typeof body.hit === "object") {
    // 클라이언트는 이미 foods에 있는 항목(fromFoodsTable)이면 foodId를 보내므로,
    // 여기 도달하는 hit은 항상 식약처 라이브(아직 저장 안 된) 결과.
    return { input: hitToBasis(body.hit as FoodHit), source: "gov" as const };
  }
  return null;
}

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const target = resolveTarget(body);
  if (!target) {
    return NextResponse.json({ error: "foodId 또는 hit이 필요해요." }, { status: 400 });
  }
  const result = await setFavorite(userId, target, true);
  return NextResponse.json(result);
}

export async function DELETE(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const target = resolveTarget(body);
  if (!target) {
    return NextResponse.json({ error: "foodId 또는 hit이 필요해요." }, { status: 400 });
  }
  const result = await setFavorite(userId, target, false);
  return NextResponse.json(result);
}
