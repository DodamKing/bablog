import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getUserId } from "@/lib/auth-helpers";
import { analyzeMeal } from "@/lib/ai/gemini";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const image = form.get("image");
  if (!(image instanceof File) || image.size === 0) {
    return NextResponse.json({ error: "이미지가 필요해요." }, { status: 400 });
  }

  const buf = Buffer.from(await image.arrayBuffer());
  const base64 = buf.toString("base64");

  try {
    const estimate = await analyzeMeal(base64, image.type || "image/jpeg");
    return NextResponse.json({ estimate });
  } catch (err) {
    console.error("analyzeMeal failed:", err);
    return NextResponse.json(
      { error: "분석에 실패했어요. 다시 시도해 주세요." },
      { status: 502 },
    );
  }
}
