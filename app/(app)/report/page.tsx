"use client";

import { useEffect, useState } from "react";

type Period = "주" | "월";

type DaySummary = {
  date: string;
  kcal: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
  mealCount: number;
};

type WeightPoint = { date: string; weightKg: number };

type ReportSummary = {
  periodLabel: Period;
  days: DaySummary[];
  weightPoints: WeightPoint[];
};

type ReportResponse = {
  summary: ReportSummary;
  report: string | null;
  generatedAt: string | null;
  stale: boolean;
};

export default function ReportPage() {
  const [period, setPeriod] = useState<Period>("주");
  const [data, setData] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/report?period=${encodeURIComponent(period)}`);
        if (!res.ok) throw new Error("불러오기에 실패했어요.");
        const json = (await res.json()) as ReportResponse;
        if (active) setData(json);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "불러오기에 실패했어요.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [period]);

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period }),
      });
      if (!res.ok) throw new Error("생성에 실패했어요.");
      const json = (await res.json()) as ReportResponse;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "생성에 실패했어요.");
    } finally {
      setGenerating(false);
    }
  }

  const stats = data?.summary ? computeStats(data.summary) : null;

  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
      <header className="flex items-center justify-between pt-2">
        <h1 className="font-display text-2xl text-ink">
          🍚 이번 {period === "주" ? "주" : "달"} 돌아보기
        </h1>
      </header>

      <div className="flex gap-2">
        {(["주", "월"] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 rounded-2xl py-2 text-sm transition ${
              period === p
                ? "bg-coral font-display text-white"
                : "border border-line bg-rice text-ink/60"
            }`}
          >
            {p}간
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center py-10">
          <span className="animate-pulse text-sm text-coral">불러오는 중…</span>
        </div>
      ) : generating ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10">
          <span className="animate-bob text-5xl">🍚</span>
          <p className="animate-pulse text-sm text-coral">정리하는 중…</p>
        </div>
      ) : !data?.generatedAt ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-10 text-center">
          <span className="text-5xl">🍚</span>
          <p className="text-sm text-muted">
            {data?.report ??
              `${period === "주" ? "이번 주" : "이번 달"} 기록을 모아 밥로그가 한마디 건네줄게요.`}
          </p>
          <button
            onClick={generate}
            className="rounded-2xl bg-coral px-6 py-3 font-display text-white transition active:scale-95"
          >
            보고서 생성
          </button>
        </div>
      ) : (
        <>
          {stats && (
            <section className="grid grid-cols-2 gap-3">
              <StatCard label="하루 평균" value={stats.avgKcal.toLocaleString()} unit="kcal" />
              <StatCard label="기록한 날" value={String(stats.recordedDays)} unit="일" />
              <StatCard
                label="매크로 평균(1일)"
                value={`탄 ${stats.avgCarb} · 단 ${stats.avgProtein} · 지 ${stats.avgFat}`}
                unit="g"
              />
              {stats.weightDelta !== null && (
                <StatCard
                  label="체중 변화"
                  value={`${stats.weightDelta > 0 ? "+" : ""}${stats.weightDelta}`}
                  unit="kg"
                />
              )}
            </section>
          )}

          <section className="rounded-3xl bg-coral-soft px-5 py-4">
            <p className="mb-2 font-display text-ink">밥로그의 한마디 🍚</p>
            <p className="whitespace-pre-line text-sm leading-relaxed text-ink/80">
              {data.report}
            </p>
          </section>

          <div className="flex items-center justify-between gap-3 px-1">
            <p className="text-xs text-ink/45">
              {fmtGeneratedAt(data.generatedAt)} 기준
              {data.stale && " · 그 뒤로 기록이 달라졌어요"}
            </p>
            <button
              onClick={generate}
              className={`shrink-0 rounded-xl px-3 py-1.5 text-xs transition active:scale-95 ${
                data.stale
                  ? "bg-coral font-medium text-white"
                  : "border border-line bg-rice text-ink/55"
              }`}
            >
              다시 생성
            </button>
          </div>
        </>
      )}

      {error && <p className="text-sm text-coral">{error}</p>}
    </main>
  );
}

function StatCard({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-rice px-4 py-3">
      <p className="text-xs text-ink/55">{label}</p>
      <p className="font-display text-lg text-ink">
        {value}
        {unit && <span className="ml-1 text-xs text-ink/45">{unit}</span>}
      </p>
    </div>
  );
}

function computeStats(s: ReportSummary) {
  const days = s.days;
  const recordedDays = days.length;
  const sum = days.reduce(
    (acc, d) => ({
      kcal: acc.kcal + d.kcal,
      protein: acc.protein + d.protein_g,
      carb: acc.carb + d.carb_g,
      fat: acc.fat + d.fat_g,
    }),
    { kcal: 0, protein: 0, carb: 0, fat: 0 },
  );
  const avgKcal = recordedDays ? Math.round(sum.kcal / recordedDays) : 0;
  const avgProtein = recordedDays ? Math.round(sum.protein / recordedDays) : 0;
  const avgCarb = recordedDays ? Math.round(sum.carb / recordedDays) : 0;
  const avgFat = recordedDays ? Math.round(sum.fat / recordedDays) : 0;

  let weightDelta: number | null = null;
  if (s.weightPoints.length >= 2) {
    const first = s.weightPoints[0].weightKg;
    const last = s.weightPoints[s.weightPoints.length - 1].weightKg;
    weightDelta = Math.round((last - first) * 10) / 10;
  }

  return { recordedDays, avgKcal, avgProtein, avgCarb, avgFat, weightDelta };
}

function fmtGeneratedAt(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const ap = h < 12 ? "오전" : "오후";
  const h12 = h % 12 || 12;
  return `${d.getMonth() + 1}/${d.getDate()} ${ap} ${h12}:${m}`;
}
