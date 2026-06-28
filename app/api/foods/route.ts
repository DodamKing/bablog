import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getUserId } from "@/lib/auth-helpers";
import { deleteOwnFood, registerFood } from "@/lib/food/foodsDb";

// kcal/단백질/탄수/지방은 전역 공유 데이터(`foods`)라 빈 값을 0으로 묵인하면
// 다른 사용자에게도 잘못된 영양정보가 노출됨 — 전부 필수(나트륨/당류 등 확장 필드는 Phase 7+, 안 받음).
function parseRequired(v: unknown): number | null {
  if (typeof v !== "number" && typeof v !== "string") return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

// 음식 직접 등록 (Phase 6) — 검색 결과 없을 때 AI 추정 대신 사용자가 직접 입력.
// POST { name, amount, unit, kcal, protein_g, carb_g, fat_g } — 전부 필수.
export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const amount = Number(body.amount);
  const unit = typeof body.unit === "string" ? body.unit.trim() : "";
  const kcal = parseRequired(body.kcal);
  const protein_g = parseRequired(body.protein_g);
  const carb_g = parseRequired(body.carb_g);
  const fat_g = parseRequired(body.fat_g);

  if (
    !name ||
    !unit ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    kcal === null ||
    protein_g === null ||
    carb_g === null ||
    fat_g === null
  ) {
    return NextResponse.json(
      { error: "이름·양·단위·kcal·단백질·탄수·지방을 모두 채워주세요." },
      { status: 400 },
    );
  }

  const food = await registerFood(userId, {
    name,
    amount,
    unit,
    kcal,
    protein_g,
    carb_g,
    fat_g,
  });

  return NextResponse.json({ food });
}

// 직접 등록한 음식 삭제. body: { foodId } — 본인이 등록한 것만 지울 수 있음.
export async function DELETE(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const foodId = typeof body.foodId === "string" ? body.foodId : "";
  if (!foodId) {
    return NextResponse.json({ error: "foodId가 필요해요." }, { status: 400 });
  }
  const ok = await deleteOwnFood(userId, foodId);
  if (!ok) {
    return NextResponse.json(
      { error: "삭제할 수 없어요(본인이 등록한 음식만 지울 수 있어요)." },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true });
}
