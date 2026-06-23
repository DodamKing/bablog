"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";

type MealRow = {
  id: string;
  eatenAt: string;
  mealType: string | null;
  photoUrl: string | null;
  kcal: number;
  proteinG: string;
  carbG: string;
  fatG: string;
};

type Period = "일" | "주" | "월";

export default function HistoryPage() {
  const [meals, setMeals] = useState<MealRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("일");
  const [dayOffset, setDayOffset] = useState(0); // 0=오늘, -1=어제 …

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/meals?days=31");
        if (res.ok) {
          const { meals } = (await res.json()) as { meals: MealRow[] };
          setMeals(meals);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── 일별 합계(kcal) 집계: 최근 N일 ───────────────────────────
  const dailyKcal = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of meals) {
      const k = dayKey(new Date(m.eatenAt));
      map.set(k, (map.get(k) ?? 0) + (m.kcal || 0));
    }
    return map;
  }, [meals]);

  const chartData = useMemo(() => {
    const days = period === "주" ? 7 : 30;
    const today = startOfDay(new Date());
    const out: { label: string; kcal: number; key: string }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = dayKey(d);
      out.push({
        key,
        kcal: dailyKcal.get(key) ?? 0,
        label:
          period === "주"
            ? "일월화수목금토"[d.getDay()]
            : String(d.getDate()),
      });
    }
    return out;
  }, [period, dailyKcal]);

  const periodTotal = chartData.reduce((s, d) => s + d.kcal, 0);
  const periodDaysWithData = chartData.filter((d) => d.kcal > 0).length || 1;
  const periodAvg = Math.round(periodTotal / periodDaysWithData);

  // ── 선택한 날의 끼니 ─────────────────────────────────────────
  const selectedDay = useMemo(() => {
    const d = startOfDay(new Date());
    d.setDate(d.getDate() + dayOffset);
    return d;
  }, [dayOffset]);

  const dayMeals = useMemo(() => {
    const key = dayKey(selectedDay);
    return meals
      .filter((m) => dayKey(new Date(m.eatenAt)) === key)
      .sort((a, b) => +new Date(a.eatenAt) - +new Date(b.eatenAt));
  }, [meals, selectedDay]);

  const dayTotal = dayMeals.reduce(
    (acc, m) => ({
      kcal: acc.kcal + (m.kcal || 0),
      p: acc.p + Number(m.proteinG || 0),
      c: acc.c + Number(m.carbG || 0),
      f: acc.f + Number(m.fatG || 0),
    }),
    { kcal: 0, p: 0, c: 0, f: 0 },
  );

  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
      <header className="flex items-center justify-between pt-2">
        <h1 className="font-display text-2xl text-ink">📊 히스토리</h1>
      </header>

      {/* 기간 토글 */}
      <div className="flex gap-2">
        {(["일", "주", "월"] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 rounded-2xl py-2 text-sm transition ${
              period === p
                ? "bg-coral font-display text-white"
                : "border border-line bg-rice text-ink/60"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="animate-pulse py-10 text-center text-sm text-coral">
          불러오는 중…
        </p>
      ) : period === "일" ? (
        <DayView
          date={selectedDay}
          meals={dayMeals}
          total={dayTotal}
          onPrev={() => setDayOffset((o) => o - 1)}
          onNext={() => setDayOffset((o) => Math.min(0, o + 1))}
          canNext={dayOffset < 0}
        />
      ) : (
        <section className="flex flex-col gap-4">
          <div className="rounded-3xl bg-coral-soft px-5 py-4">
            <p className="text-sm text-ink/55">
              최근 {period === "주" ? "7일" : "30일"} 평균
            </p>
            <p className="font-display text-4xl text-ink">
              {periodAvg.toLocaleString()}
              <span className="ml-1 text-lg text-ink/45">kcal/일</span>
            </p>
            <p className="mt-0.5 text-xs text-ink/55">
              합계 {periodTotal.toLocaleString()} kcal
            </p>
          </div>

          <div className="h-56 w-full rounded-3xl border border-line bg-rice p-3">
            {periodTotal === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted">
                아직 기록이 없어요.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "#B8AFA6" }}
                    axisLine={false}
                    tickLine={false}
                    interval={period === "월" ? 4 : 0}
                  />
                  <Tooltip
                    cursor={{ fill: "#FFE9E1", opacity: 0.5 }}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #F1E8DE",
                      fontSize: 12,
                    }}
                    formatter={(v) => [`${Number(v).toLocaleString()} kcal`, ""]}
                    labelFormatter={() => ""}
                  />
                  <Bar dataKey="kcal" radius={[6, 6, 0, 0]}>
                    {chartData.map((d) => (
                      <Cell key={d.key} fill={d.kcal > 0 ? "#FF8A6B" : "#F1E8DE"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      )}
    </main>
  );
}

function DayView({
  date,
  meals,
  total,
  onPrev,
  onNext,
  canNext,
}: {
  date: Date;
  meals: MealRow[];
  total: { kcal: number; p: number; c: number; f: number };
  onPrev: () => void;
  onNext: () => void;
  canNext: boolean;
}) {
  return (
    <section className="flex flex-col gap-4">
      {/* 날짜 이동 */}
      <div className="flex items-center justify-between">
        <button onClick={onPrev} className="size-9 rounded-full bg-coral-soft text-ink/70">
          ‹
        </button>
        <p className="font-display text-lg text-ink">{fmtDate(date)}</p>
        <button
          onClick={onNext}
          disabled={!canNext}
          className="size-9 rounded-full bg-coral-soft text-ink/70 disabled:opacity-30"
        >
          ›
        </button>
      </div>

      {/* 합계 */}
      <div className="rounded-3xl bg-coral-soft px-5 py-4">
        <p className="text-sm text-ink/55">이 날 먹은 양</p>
        <p className="font-display text-4xl text-ink">
          {total.kcal.toLocaleString()}
          <span className="ml-1 text-lg text-ink/45">kcal</span>
        </p>
        <p className="mt-0.5 text-xs text-ink/55">
          단백질 {round1(total.p)}g · 탄수 {round1(total.c)}g · 지방 {round1(total.f)}g
        </p>
      </div>

      {/* 끼니 리스트 */}
      <div className="flex flex-col gap-2">
        {meals.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">이 날은 기록이 없어요.</p>
        ) : (
          meals.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 rounded-2xl border border-line bg-rice p-3"
            >
              {m.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.photoUrl} alt="" className="size-14 rounded-xl object-cover" />
              ) : (
                <div className="flex size-14 items-center justify-center rounded-xl bg-coral-soft text-2xl">
                  🍚
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink">
                  {m.mealType ?? "끼니"}
                  <span className="ml-2 text-xs text-muted">{fmtTime(m.eatenAt)}</span>
                </p>
                <p className="text-xs text-ink/55">
                  단백질 {round1(Number(m.proteinG))}g · 탄수 {round1(Number(m.carbG))}g · 지방{" "}
                  {round1(Number(m.fatG))}g
                </p>
              </div>
              <span className="font-display text-coral">{m.kcal} kcal</span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
function fmtDate(d: Date): string {
  const today = startOfDay(new Date());
  const diff = Math.round((+startOfDay(d) - +today) / 86400000);
  if (diff === 0) return "오늘";
  if (diff === -1) return "어제";
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${"일월화수목금토"[d.getDay()]})`;
}
function fmtTime(s: string): string {
  const d = new Date(s);
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const ap = h < 12 ? "오전" : "오후";
  const h12 = h % 12 || 12;
  return `${ap} ${h12}:${m}`;
}
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
