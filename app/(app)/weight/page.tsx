"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type WeightLog = {
  id: string;
  loggedAt: string;
  weightKg: string;
  bodyFatPct: string | null;
  note: string | null;
};

type Range = "1개월" | "3개월" | "전체";
const RANGE_DAYS: Record<Range, number | null> = {
  "1개월": 30,
  "3개월": 90,
  전체: null,
};

export default function WeightPage() {
  const [logs, setLogs] = useState<WeightLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [weight, setWeight] = useState("");
  const [fat, setFat] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<Range>("3개월");

  async function load() {
    try {
      const res = await fetch("/api/weight");
      if (res.ok) {
        const { logs } = (await res.json()) as { logs: WeightLog[] };
        setLogs(logs);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    const w = parseFloat(weight);
    if (!Number.isFinite(w) || w <= 0) {
      setError("체중을 입력해 주세요.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/weight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weightKg: w, bodyFatPct: parseFloat(fat) || undefined }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "저장 실패");
      }
      setWeight("");
      setFat("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했어요.");
    } finally {
      setSaving(false);
    }
  }

  const latest = logs[0]; // loggedAt desc

  const chartData = useMemo(() => {
    const days = RANGE_DAYS[range];
    const since = days ? Date.now() - days * 86400000 : 0;
    return logs
      .filter((l) => +new Date(l.loggedAt) >= since)
      .map((l) => ({
        t: +new Date(l.loggedAt),
        weight: Number(l.weightKg),
        label: fmtShort(l.loggedAt),
      }))
      .sort((a, b) => a.t - b.t);
  }, [logs, range]);

  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
      <header className="flex items-center justify-between pt-2">
        <h1 className="font-display text-2xl text-ink">⚖️ 체중</h1>
      </header>

      {/* 입력 */}
      <section className="flex flex-col gap-3 rounded-3xl bg-coral-soft px-5 py-4">
        {latest && (
          <p className="text-sm text-ink/55">
            최근 기록{" "}
            <span className="font-display text-ink">{Number(latest.weightKg)}kg</span> ·{" "}
            {fmtShort(latest.loggedAt)}
          </p>
        )}
        <div className="flex items-end gap-2">
          <label className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-xs text-ink/55">체중 (kg)</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="65.0"
              className="w-full min-w-0 rounded-xl border border-line bg-rice px-3 py-2.5 text-center font-display text-lg text-ink outline-none focus:border-coral/50"
            />
          </label>
          <label className="flex min-w-0 w-20 flex-col gap-1">
            <span className="text-xs text-ink/55">체지방 (%)</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={fat}
              onChange={(e) => setFat(e.target.value)}
              placeholder="선택"
              className="w-full min-w-0 rounded-xl border border-line bg-rice px-3 py-2.5 text-center font-display text-lg text-ink outline-none focus:border-coral/50"
            />
          </label>
          <button
            onClick={save}
            disabled={saving}
            className="shrink-0 rounded-xl bg-coral px-4 py-2.5 font-display text-white transition active:scale-95 disabled:opacity-60"
          >
            {saving ? "저장 중" : "저장"}
          </button>
        </div>
        {error && <p className="text-sm text-coral">{error}</p>}
      </section>

      {/* 기간 토글 */}
      <div className="flex gap-2">
        {(Object.keys(RANGE_DAYS) as Range[]).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`flex-1 rounded-2xl py-2 text-sm transition ${
              range === r
                ? "bg-coral font-display text-white"
                : "border border-line bg-rice text-ink/60"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {/* 추세 차트 */}
      <div className="h-56 w-full rounded-3xl border border-line bg-rice p-3">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-coral">
            불러오는 중…
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted">
            이 기간엔 기록이 없어요.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
              <CartesianGrid stroke="#F1E8DE" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "#B8AFA6" }}
                axisLine={false}
                tickLine={false}
                minTickGap={24}
              />
              <YAxis
                domain={["dataMin - 1", "dataMax + 1"]}
                tick={{ fontSize: 11, fill: "#B8AFA6" }}
                axisLine={false}
                tickLine={false}
                width={32}
              />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "1px solid #F1E8DE", fontSize: 12 }}
                formatter={(v) => [`${Number(v)} kg`, ""]}
              />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="#FF8A6B"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#FF8A6B" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* 최근 리스트 */}
      <div className="flex flex-col gap-2">
        {!loading && logs.length === 0 && (
          <p className="py-6 text-center text-sm text-muted">
            첫 체중을 기록해봐요!
          </p>
        )}
        {logs.slice(0, 14).map((l) => (
          <div
            key={l.id}
            className="flex items-center justify-between rounded-2xl border border-line bg-rice px-4 py-3"
          >
            <span className="text-sm text-ink/60">{fmtShort(l.loggedAt)}</span>
            <span className="font-display text-ink">
              {Number(l.weightKg)}kg
              {l.bodyFatPct && (
                <span className="ml-2 text-xs text-muted">
                  체지방 {Number(l.bodyFatPct)}%
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
    </main>
  );
}

function fmtShort(s: string): string {
  const d = new Date(s);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
