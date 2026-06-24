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
import ConfirmDialog from "@/components/ConfirmDialog";

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

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editWeight, setEditWeight] = useState("");
  const [editFat, setEditFat] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<WeightLog | null>(null);
  const [deleting, setDeleting] = useState(false);

  function startEdit(l: WeightLog) {
    setEditingId(l.id);
    setEditWeight(String(Number(l.weightKg)));
    setEditFat(l.bodyFatPct ? String(Number(l.bodyFatPct)) : "");
  }

  async function saveEdit() {
    if (!editingId) return;
    const w = parseFloat(editWeight);
    if (!Number.isFinite(w) || w <= 0) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/weight/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weightKg: w, bodyFatPct: parseFloat(editFat) || undefined }),
      });
      if (res.ok) {
        setEditingId(null);
        load();
      }
    } finally {
      setSavingEdit(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/weight/${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        setDeleteTarget(null);
        load();
      }
    } finally {
      setDeleting(false);
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
        {logs.slice(0, 14).map((l) =>
          editingId === l.id ? (
            <div
              key={l.id}
              className="flex items-center gap-2 rounded-2xl border border-coral/40 bg-rice px-4 py-3"
            >
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                value={editWeight}
                onChange={(e) => setEditWeight(e.target.value)}
                className="w-16 rounded-xl border border-line bg-cream px-1 py-1.5 text-center font-display text-ink outline-none focus:border-coral/50"
              />
              <span className="text-xs text-muted">kg</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                value={editFat}
                onChange={(e) => setEditFat(e.target.value)}
                placeholder="체지방%"
                className="w-16 rounded-xl border border-line bg-cream px-1 py-1.5 text-center font-display text-ink outline-none focus:border-coral/50"
              />
              <div className="ml-auto flex gap-1.5">
                <button
                  onClick={() => setEditingId(null)}
                  disabled={savingEdit}
                  className="rounded-xl bg-coral-soft px-3 py-1.5 text-xs text-ink/70 disabled:opacity-60"
                >
                  취소
                </button>
                <button
                  onClick={saveEdit}
                  disabled={savingEdit}
                  className="rounded-xl bg-coral px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
                >
                  {savingEdit ? "저장 중" : "저장"}
                </button>
              </div>
            </div>
          ) : (
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
              <div className="flex shrink-0 gap-1">
                <button
                  onClick={() => startEdit(l)}
                  className="px-1 text-sm text-ink/50"
                  aria-label="수정"
                >
                  ✏️
                </button>
                <button
                  onClick={() => setDeleteTarget(l)}
                  className="px-1 text-sm text-ink/50"
                  aria-label="삭제"
                >
                  🗑️
                </button>
              </div>
            </div>
          ),
        )}
      </div>

      {deleteTarget && (
        <ConfirmDialog
          title="이 체중 기록을 삭제할까요?"
          description="삭제하면 되돌릴 수 없어요."
          busy={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      )}
    </main>
  );
}

function fmtShort(s: string): string {
  const d = new Date(s);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
