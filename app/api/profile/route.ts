import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { userProfiles, weightLogs } from "@/lib/db/schema";
import { getUserId } from "@/lib/auth-helpers";
import { computeDailyGoals, type ActivityLevel, type Gender, type GoalType } from "@/lib/health/goals";

const ACTIVITY_LEVELS: ActivityLevel[] = ["sedentary", "light", "moderate", "active", "very_active"];
const GENDERS: Gender[] = ["male", "female"];
const GOAL_TYPES: GoalType[] = ["감량", "유지", "증량"];

// 신체정보/목표 + (가능하면) 오늘의 목표 kcal/매크로. 최신 체중은 weight_logs에서 가져옴(중복 저장 안 함).
export async function GET() {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const [profile] = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId));

  const [latestWeight] = await db
    .select({ weightKg: weightLogs.weightKg })
    .from(weightLogs)
    .where(eq(weightLogs.userId, userId))
    .orderBy(desc(weightLogs.loggedAt))
    .limit(1);

  const currentWeightKg = latestWeight ? Number(latestWeight.weightKg) : null;

  const goals = profile
    ? computeDailyGoals(
        {
          birthYear: profile.birthYear,
          heightCm: profile.heightCm ? Number(profile.heightCm) : null,
          gender: profile.gender,
          activityLevel: profile.activityLevel,
          goalType: profile.goalType,
          weeklyRateKg: profile.weeklyRateKg ? Number(profile.weeklyRateKg) : null,
        },
        currentWeightKg,
      )
    : null;

  return NextResponse.json({
    profile: profile
      ? {
          birthYear: profile.birthYear,
          heightCm: profile.heightCm ? Number(profile.heightCm) : null,
          gender: profile.gender,
          activityLevel: profile.activityLevel,
          goalType: profile.goalType,
          targetWeightKg: profile.targetWeightKg ? Number(profile.targetWeightKg) : null,
          weeklyRateKg: profile.weeklyRateKg ? Number(profile.weeklyRateKg) : null,
        }
      : null,
    goals,
  });
}

// 신체정보/목표 저장(upsert). JSON: { birthYear?, heightCm?, gender?, activityLevel?, goalType?, targetWeightKg?, weeklyRateKg? }
export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const data = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const birthYear = toInt(data.birthYear);
  const heightCm = toNum(data.heightCm);
  const gender = GENDERS.includes(data.gender as Gender) ? (data.gender as Gender) : null;
  const activityLevel = ACTIVITY_LEVELS.includes(data.activityLevel as ActivityLevel)
    ? (data.activityLevel as ActivityLevel)
    : null;
  const goalType = GOAL_TYPES.includes(data.goalType as GoalType) ? (data.goalType as GoalType) : null;
  const targetWeightKg = toNum(data.targetWeightKg);
  const weeklyRateKg = toNum(data.weeklyRateKg);

  if (birthYear === null || heightCm === null || !gender || !activityLevel) {
    return NextResponse.json(
      { error: "생년·키·성별·활동량은 필수예요." },
      { status: 400 },
    );
  }

  await db
    .insert(userProfiles)
    .values({
      userId,
      birthYear,
      heightCm: String(heightCm),
      gender,
      activityLevel,
      goalType,
      targetWeightKg: targetWeightKg !== null ? String(targetWeightKg) : null,
      weeklyRateKg: weeklyRateKg !== null ? String(weeklyRateKg) : null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: userProfiles.userId,
      set: {
        birthYear,
        heightCm: String(heightCm),
        gender,
        activityLevel,
        goalType,
        targetWeightKg: targetWeightKg !== null ? String(targetWeightKg) : null,
        weeklyRateKg: weeklyRateKg !== null ? String(weeklyRateKg) : null,
        updatedAt: new Date(),
      },
    });

  return NextResponse.json({ ok: true });
}

function toInt(v: unknown): number | null {
  const n = typeof v === "string" ? parseInt(v, 10) : (v as number);
  return Number.isFinite(n) ? n : null;
}

function toNum(v: unknown): number | null {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : null;
}
