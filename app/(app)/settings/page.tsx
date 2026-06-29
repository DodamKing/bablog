"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ACTIVITY_LABELS,
  type ActivityLevel,
  type DailyGoals,
  type Gender,
  type GoalType,
} from "@/lib/health/goals";

const ACTIVITY_LEVELS: ActivityLevel[] = [
  "sedentary",
  "light",
  "moderate",
  "active",
  "very_active",
];
const GOAL_TYPES: GoalType[] = ["감량", "유지", "증량"];

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [goals, setGoals] = useState<DailyGoals | null>(null);

  const [birthYear, setBirthYear] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [gender, setGender] = useState<Gender | null>(null);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(null);
  const [goalType, setGoalType] = useState<GoalType | null>(null);
  const [targetWeightKg, setTargetWeightKg] = useState("");
  const [weeklyRateKg, setWeeklyRateKg] = useState("");

  async function load() {
    try {
      const res = await fetch("/api/profile");
      if (res.ok) {
        const j = (await res.json()) as {
          profile: {
            birthYear: number | null;
            heightCm: number | null;
            gender: Gender | null;
            activityLevel: ActivityLevel | null;
            goalType: GoalType | null;
            targetWeightKg: number | null;
            weeklyRateKg: number | null;
          } | null;
          goals: DailyGoals | null;
        };
        if (j.profile) {
          setBirthYear(j.profile.birthYear ? String(j.profile.birthYear) : "");
          setHeightCm(j.profile.heightCm ? String(j.profile.heightCm) : "");
          setGender(j.profile.gender);
          setActivityLevel(j.profile.activityLevel);
          setGoalType(j.profile.goalType);
          setTargetWeightKg(j.profile.targetWeightKg ? String(j.profile.targetWeightKg) : "");
          setWeeklyRateKg(j.profile.weeklyRateKg ? String(j.profile.weeklyRateKg) : "");
        }
        setGoals(j.goals);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    setError(null);
    if (!birthYear || !heightCm || !gender || !activityLevel) {
      setError("태어난 해·키·성별·활동량은 필수예요.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          birthYear: parseInt(birthYear, 10),
          heightCm: parseFloat(heightCm),
          gender,
          activityLevel,
          goalType,
          targetWeightKg: parseFloat(targetWeightKg) || undefined,
          weeklyRateKg: parseFloat(weeklyRateKg) || undefined,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "저장에 실패했어요.");
      }
      setToast("저장했어요");
      setTimeout(() => setToast(null), 2000);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했어요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
      <header className="flex items-center gap-3 pt-2">
        <Link href="/" aria-label="뒤로" className="text-xl text-ink/70">
          ←
        </Link>
        <h1 className="font-display text-2xl text-ink">설정</h1>
      </header>

      {loading ? (
        <p className="py-10 text-center text-sm text-muted">불러오는 중…</p>
      ) : (
        <>
          <section className="flex flex-col gap-4 rounded-3xl bg-coral-soft px-5 py-5">
            <p className="text-sm text-ink/55">
              목표 kcal·매크로 계산에 쓰여요. 안 채워도 다른 기능은 그대로 동작해요.
            </p>

            <div className="flex gap-2">
              <label className="flex flex-1 min-w-0 flex-col gap-1">
                <span className="text-xs text-ink/55">태어난 해</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={birthYear}
                  onChange={(e) => setBirthYear(e.target.value)}
                  placeholder="1995"
                  className="w-full min-w-0 rounded-xl border border-line bg-rice px-3 py-2.5 text-center font-display text-lg text-ink outline-none focus:border-coral/50"
                />
              </label>
              <label className="flex flex-1 min-w-0 flex-col gap-1">
                <span className="text-xs text-ink/55">키 (cm)</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  placeholder="170"
                  className="w-full min-w-0 rounded-xl border border-line bg-rice px-3 py-2.5 text-center font-display text-lg text-ink outline-none focus:border-coral/50"
                />
              </label>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-ink/55">성별</span>
              <div className="flex gap-2">
                {(["male", "female"] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => setGender(g)}
                    className={`flex-1 rounded-2xl py-2 text-sm transition ${
                      gender === g
                        ? "bg-coral font-display text-white"
                        : "border border-line bg-rice text-ink/60"
                    }`}
                  >
                    {g === "male" ? "남성" : "여성"}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-ink/55">활동량</span>
              <div className="flex flex-col gap-1.5">
                {ACTIVITY_LEVELS.map((level) => (
                  <button
                    key={level}
                    onClick={() => setActivityLevel(level)}
                    className={`rounded-2xl px-4 py-2.5 text-left text-sm transition ${
                      activityLevel === level
                        ? "bg-coral font-display text-white"
                        : "border border-line bg-rice text-ink/70"
                    }`}
                  >
                    {ACTIVITY_LABELS[level]}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-ink/55">목표</span>
              <div className="flex gap-2">
                {GOAL_TYPES.map((g) => (
                  <button
                    key={g}
                    onClick={() => setGoalType(g)}
                    className={`flex-1 rounded-2xl py-2 text-sm transition ${
                      goalType === g
                        ? "bg-coral font-display text-white"
                        : "border border-line bg-rice text-ink/60"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {goalType && goalType !== "유지" && (
              <div className="flex gap-2">
                <label className="flex flex-1 min-w-0 flex-col gap-1">
                  <span className="text-xs text-ink/55">목표 체중 (kg)</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    value={targetWeightKg}
                    onChange={(e) => setTargetWeightKg(e.target.value)}
                    placeholder="65"
                    className="w-full min-w-0 rounded-xl border border-line bg-rice px-3 py-2.5 text-center font-display text-lg text-ink outline-none focus:border-coral/50"
                  />
                </label>
                <label className="flex flex-1 min-w-0 flex-col gap-1">
                  <span className="text-xs text-ink/55">주간 변화율 (kg/주)</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    value={weeklyRateKg}
                    onChange={(e) => setWeeklyRateKg(e.target.value)}
                    placeholder="0.5"
                    className="w-full min-w-0 rounded-xl border border-line bg-rice px-3 py-2.5 text-center font-display text-lg text-ink outline-none focus:border-coral/50"
                  />
                </label>
              </div>
            )}

            {error && <p className="text-sm text-coral">{error}</p>}

            <button
              onClick={save}
              disabled={saving}
              className="rounded-2xl bg-coral py-3 font-display text-white transition active:scale-95 disabled:opacity-60"
            >
              {saving ? "저장 중…" : "저장"}
            </button>
          </section>

          {goals ? (
            <section className="flex flex-col gap-2 rounded-3xl border border-line bg-rice px-5 py-4">
              <p className="font-display text-lg text-ink">오늘의 목표</p>
              <p className="text-sm text-ink/70">
                {goals.targetKcal.toLocaleString()}kcal · 탄 {goals.targetCarbG}g · 단{" "}
                {goals.targetProteinG}g · 지 {goals.targetFatG}g
              </p>
              <p className="text-xs text-ink/45">
                기초대사량 {goals.bmr}kcal · 활동대사량 {goals.tdee}kcal · 체질량지수 {goals.bmi}
              </p>
            </section>
          ) : (
            <p className="px-1 text-sm text-muted">
              체중을 한 번이라도 기록하면(⚖️ 체중 탭) 목표가 계산돼요.
            </p>
          )}
        </>
      )}

      {toast && (
        <div className="animate-pop fixed inset-x-0 bottom-20 z-30 mx-auto w-fit rounded-full bg-ink px-5 py-2.5 font-display text-cream shadow-lg">
          {toast}
        </div>
      )}
    </main>
  );
}
