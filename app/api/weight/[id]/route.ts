import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { weightLogs } from "@/lib/db/schema";
import { getUserId } from "@/lib/auth-helpers";

// 체중 기록 수정. JSON: { weightKg, bodyFatPct?, note? }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const data = (await req.json().catch(() => ({}))) as {
    weightKg?: unknown;
    bodyFatPct?: unknown;
    note?: unknown;
  };

  const weight = Number(data.weightKg);
  if (!Number.isFinite(weight) || weight <= 0) {
    return NextResponse.json({ error: "체중을 입력해 주세요." }, { status: 400 });
  }
  const fat = Number(data.bodyFatPct);

  const [row] = await db
    .update(weightLogs)
    .set({
      weightKg: String(weight),
      bodyFatPct: Number.isFinite(fat) && fat > 0 ? String(fat) : null,
      note: typeof data.note === "string" && data.note ? data.note : null,
    })
    .where(and(eq(weightLogs.id, id), eq(weightLogs.userId, userId)))
    .returning();

  if (!row) {
    return NextResponse.json({ error: "찾을 수 없어요." }, { status: 404 });
  }
  return NextResponse.json({ log: row });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const [row] = await db
    .delete(weightLogs)
    .where(and(eq(weightLogs.id, id), eq(weightLogs.userId, userId)))
    .returning({ id: weightLogs.id });

  if (!row) {
    return NextResponse.json({ error: "찾을 수 없어요." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
