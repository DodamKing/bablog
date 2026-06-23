import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { weightLogs } from "@/lib/db/schema";
import { getUserId } from "@/lib/auth-helpers";

// 현재 사용자의 체중 기록 (최근순).
export async function GET() {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(weightLogs)
    .where(eq(weightLogs.userId, userId))
    .orderBy(desc(weightLogs.loggedAt))
    .limit(365);

  return NextResponse.json({ logs: rows });
}

// 체중 기록 저장. JSON: { weightKg, bodyFatPct?, loggedAt?, note? }
export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const data = (await req.json().catch(() => ({}))) as {
    weightKg?: unknown;
    bodyFatPct?: unknown;
    loggedAt?: unknown;
    note?: unknown;
  };

  const weight = Number(data.weightKg);
  if (!Number.isFinite(weight) || weight <= 0) {
    return NextResponse.json({ error: "체중을 입력해 주세요." }, { status: 400 });
  }

  const fat = Number(data.bodyFatPct);

  const [row] = await db
    .insert(weightLogs)
    .values({
      userId,
      ...(typeof data.loggedAt === "string"
        ? { loggedAt: new Date(data.loggedAt) }
        : {}),
      weightKg: String(weight),
      bodyFatPct: Number.isFinite(fat) && fat > 0 ? String(fat) : null,
      note: typeof data.note === "string" && data.note ? data.note : null,
    })
    .returning();

  return NextResponse.json({ log: row });
}
