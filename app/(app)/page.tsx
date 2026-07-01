"use client";

import { useEffect, useState } from "react";
import MealRecorder from "@/components/MealRecorder";
import AppBar from "@/components/AppBar";
import type { DailyGoals } from "@/lib/health/goals";

type MealRow = {
  id: string;
  eatenAt: string;
  kcal: number;
  proteinG: string;
  carbG: string;
  fatG: string;
};

export default function RecordPage() {
  const [todayMeals, setTodayMeals] = useState<MealRow[]>([]);
  const [goals, setGoals] = useState<DailyGoals | null>(null);

  async function loadToday() {
    try {
      const res = await fetch("/api/meals");
      if (!res.ok) return;
      const { meals } = (await res.json()) as { meals: MealRow[] };
      const today = new Date().toDateString();
      setTodayMeals(
        meals.filter((m) => new Date(m.eatenAt).toDateString() === today),
      );
    } catch {
      /* 요약은 보조 정보 — 실패해도 무시 */
    }
  }

  // Phase 7(D20): 목표 kcal/매크로 — 프로필 미입력 시 null, 대시보드에서 안내문으로 대체.
  async function loadGoals() {
    try {
      const res = await fetch("/api/profile");
      if (!res.ok) return;
      const { goals } = (await res.json()) as { goals: DailyGoals | null };
      setGoals(goals);
    } catch {
      /* 보조 정보 — 실패해도 무시 */
    }
  }

  useEffect(() => {
    (async () => {
      await loadToday();
      await loadGoals();
    })();
  }, []);

  const todayKcal = todayMeals.reduce((s, m) => s + (m.kcal || 0), 0);
  const todayProteinG = todayMeals.reduce((s, m) => s + (Number(m.proteinG) || 0), 0);
  const todayCarbG = todayMeals.reduce((s, m) => s + (Number(m.carbG) || 0), 0);
  const todayFatG = todayMeals.reduce((s, m) => s + (Number(m.fatG) || 0), 0);

  // 원형 게이지(D21+, 2026-07-01 디자인 강화) — 목표 대비 진행률
  const RING_R = 42;
  const RING_CIRC = 2 * Math.PI * RING_R;
  const ringPct = goals ? Math.min(1, todayKcal / goals.targetKcal) : 0;

  // 오늘 먹은 것의 매크로 구성비(%) — 목표와 무관, 오늘 섭취량 안에서의 비율.
  const carbKcal = todayCarbG * 4;
  const proteinKcal = todayProteinG * 4;
  const fatKcal = todayFatG * 9;
  const macroKcalTotal = carbKcal + proteinKcal + fatKcal;
  const carbPct = macroKcalTotal > 0 ? Math.round((carbKcal / macroKcalTotal) * 100) : 0;
  const proteinPct = macroKcalTotal > 0 ? Math.round((proteinKcal / macroKcalTotal) * 100) : 0;
  const fatPct = macroKcalTotal > 0 ? Math.max(0, 100 - carbPct - proteinPct) : 0;

  const remainingKcal = goals ? Math.round(goals.targetKcal - todayKcal) : 0;

  const mealCountRow =
    todayMeals.length === 0 ? (
      <p className="text-sm text-ink/50">오늘 첫 끼니를 기록해봐요!</p>
    ) : (
      <>
        {todayMeals.slice(0, 8).map((m) => (
          <span key={m.id} className="text-base">
            🍚
          </span>
        ))}
        <span className="ml-1 text-sm text-ink/50">끼니 {todayMeals.length}개</span>
      </>
    );

  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
      <AppBar title="🍚 밥로그" />

      {/* 오늘 누적 — 날짜를 얹어 "기록 액션"이 아니라 "오늘의 홈"이라는 정체성을 드러냄(D21) */}
      <section className="rounded-3xl bg-coral-soft px-5 py-5">
        <p className="text-sm text-ink/55">
          {new Date().toLocaleDateString("ko-KR", {
            month: "long",
            day: "numeric",
            weekday: "short",
          })}
          , 오늘 먹은 양
        </p>

        {goals ? (
          <>
            {/* 목표 대비 원형 게이지 — 평가 문구·경고색 없이 진행률만(D15) */}
            <div className="relative mx-auto my-3 flex size-36 items-center justify-center">
              <svg viewBox="0 0 100 100" className="size-36 -rotate-90">
                <circle
                  cx="50"
                  cy="50"
                  r={RING_R}
                  fill="none"
                  stroke="#FFFFFF"
                  strokeOpacity={0.55}
                  strokeWidth="9"
                />
                <circle
                  cx="50"
                  cy="50"
                  r={RING_R}
                  fill="none"
                  stroke="#FF8A6B"
                  strokeWidth="9"
                  strokeLinecap="round"
                  strokeDasharray={RING_CIRC}
                  strokeDashoffset={RING_CIRC * (1 - ringPct)}
                  className="transition-[stroke-dashoffset] duration-500"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="animate-bob text-2xl">🍚</span>
                <span className="font-display text-2xl text-ink">
                  {todayKcal.toLocaleString()}
                </span>
                <span className="text-[11px] text-ink/45">
                  /{goals.targetKcal.toLocaleString()}kcal
                </span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-1">{mealCountRow}</div>

            {/* 오늘 매크로 구성비 */}
            <div className="mt-3 flex justify-center gap-2">
              <MacroBadge label="탄" pct={carbPct} dotClassName="bg-coral" />
              <MacroBadge label="단" pct={proteinPct} dotClassName="bg-matcha" />
              <MacroBadge label="지" pct={fatPct} dotClassName="bg-muted" />
            </div>

            {/* 매크로별 목표 대비 */}
            <div className="mt-3 flex flex-col gap-1.5">
              <MacroBar
                label="탄수"
                current={todayCarbG}
                target={goals.targetCarbG}
                barClassName="bg-coral"
              />
              <MacroBar
                label="단백질"
                current={todayProteinG}
                target={goals.targetProteinG}
                barClassName="bg-matcha"
              />
              <MacroBar
                label="지방"
                current={todayFatG}
                target={goals.targetFatG}
                barClassName="bg-muted"
              />
            </div>

            <p className="mt-3 text-center text-xs text-ink/45">
              {remainingKcal > 0
                ? `${remainingKcal.toLocaleString()}kcal 더 먹어도 돼요`
                : "오늘 목표를 채웠어요"}
            </p>
          </>
        ) : (
          <>
            <div className="flex items-start justify-between">
              <p className="font-display text-4xl text-ink">
                {todayKcal.toLocaleString()}
                <span className="ml-1 text-lg text-ink/45">kcal</span>
              </p>
              <span className="animate-bob text-5xl">🍚</span>
            </div>
            <div className="mt-3 flex items-center gap-1">{mealCountRow}</div>
          </>
        )}
      </section>

      <MealRecorder allowCamera onSaved={loadToday} />
    </main>
  );
}

function MacroBadge({
  label,
  pct,
  dotClassName,
}: {
  label: string;
  pct: number;
  dotClassName: string;
}) {
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-rice/80 px-2.5 py-1 text-xs text-ink/70">
      <span className={`size-1.5 rounded-full ${dotClassName}`} />
      {label} {pct}%
    </span>
  );
}

function MacroBar({
  label,
  current,
  target,
  barClassName,
}: {
  label: string;
  current: number;
  target: number;
  barClassName: string;
}) {
  const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="w-11 shrink-0 text-xs text-ink/55">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-rice/60">
        <div
          className={`h-full rounded-full transition-all ${barClassName}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-16 shrink-0 text-right text-xs text-ink/45">
        {Math.round(current)}/{target}g
      </span>
    </div>
  );
}
