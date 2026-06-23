import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getUserId } from "@/lib/auth-helpers";
import { estimateMealFromText } from "@/lib/ai/gemini";

export const maxDuration = 30;

// DB 검색에 없는 음식의 AI 폴백 추정 (D18). POST { text }
export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { text } = (await req.json().catch(() => ({}))) as { text?: unknown };
  if (typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "음식 이름이 필요해요." }, { status: 400 });
  }

  try {
    const estimate = await estimateMealFromText(text.trim());
    return NextResponse.json({ estimate });
  } catch (err) {
    console.error("estimateMealFromText failed:", err);
    return NextResponse.json(
      { error: "추정에 실패했어요. 다시 시도해 주세요." },
      { status: 502 },
    );
  }
}
