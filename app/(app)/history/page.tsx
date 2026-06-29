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
import type { MealItem } from "@/lib/ai/types";
import { MEAL_TYPES, type MealType } from "@/lib/meal";
import { useDraftItems } from "@/lib/useDraftItems";
import { useBackTrap } from "@/lib/useBackTrap";
import MealEditor from "@/components/MealEditor";
import ConfirmDialog from "@/components/ConfirmDialog";
import AppBar from "@/components/AppBar";

type MealRow = {
  id: string;
  eatenAt: string;
  mealType: MealType | null;
  photoUrl: string | null;
  items: MealItem[];
  kcal: number;
  proteinG: string;
  carbG: string;
  fatG: string;
  note: string | null;
};

type Period = "일" | "주" | "월";

const MEAL_TYPE_EMOJI: Record<MealType, string> = {
  아침: "🌅",
  점심: "🍱",
  저녁: "🍙",
  간식: "🍪",
};

export default function HistoryPage() {
  const [meals, setMeals] = useState<MealRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("일");
  const [dayOffset, setDayOffset] = useState(0); // 0=오늘, -1=어제 …

  async function load() {
    try {
      const res = await fetch("/api/meals?days=31");
      if (res.ok) {
        const { meals } = (await res.json()) as { meals: MealRow[] };
        setMeals(meals);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
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
      <AppBar title="📊 히스토리" />

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
          onChanged={load}
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

// 같은 날 같은 끼니(mealType)로 기록된 여러 건을 한 그룹으로 묶는다(여러 번에
// 나눠 입력해도 "오늘 점심"은 합쳐서 보임). 미분류(null)는 맨 뒤 그룹으로.
function groupByMealType(meals: MealRow[]) {
  const buckets: { type: MealType | null; meals: MealRow[] }[] = [
    ...MEAL_TYPES.map((type) => ({ type, meals: [] as MealRow[] })),
    { type: null, meals: [] },
  ];
  for (const m of meals) {
    const bucket = buckets.find((b) => b.type === (m.mealType ?? null));
    bucket?.meals.push(m);
  }
  return buckets.filter((b) => b.meals.length > 0);
}

function DayView({
  date,
  meals,
  total,
  onPrev,
  onNext,
  canNext,
  onChanged,
}: {
  date: Date;
  meals: MealRow[];
  total: { kcal: number; p: number; c: number; f: number };
  onPrev: () => void;
  onNext: () => void;
  canNext: boolean;
  onChanged: () => void;
}) {
  const [editingMeal, setEditingMeal] = useState<MealRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MealRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/meals/${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        setDeleteTarget(null);
        onChanged();
      }
    } finally {
      setDeleting(false);
    }
  }

  const groups = groupByMealType(meals);

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

      {/* 끼니 그룹 */}
      <div className="flex flex-col gap-5">
        {groups.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">이 날은 기록이 없어요.</p>
        ) : (
          groups.map((g) => {
            const groupKcal = g.meals.reduce((s, m) => s + (m.kcal || 0), 0);
            return (
              <div key={g.type ?? "미분류"} className="flex flex-col gap-2">
                <div className="flex items-center justify-between px-1">
                  <p className="font-display text-ink">
                    {g.type ? MEAL_TYPE_EMOJI[g.type] : "🍴"} {g.type ?? "기록"}
                  </p>
                  <p className="text-sm text-ink/55">{groupKcal.toLocaleString()} kcal</p>
                </div>
                <div className="flex flex-col gap-2">
                  {g.meals.map((m) => (
                    <MealCard
                      key={m.id}
                      meal={m}
                      onEdit={() => setEditingMeal(m)}
                      onDelete={() => setDeleteTarget(m)}
                    />
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {editingMeal && (
        <MealEditOverlay
          key={editingMeal.id}
          meal={editingMeal}
          onClose={() => setEditingMeal(null)}
          onSaved={() => {
            setEditingMeal(null);
            onChanged();
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="이 끼니를 삭제할까요?"
          description="삭제하면 되돌릴 수 없어요."
          busy={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      )}
    </section>
  );
}

function MealCard({
  meal,
  onEdit,
  onDelete,
}: {
  meal: MealRow;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [showPhoto, setShowPhoto] = useState(false);

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-line bg-rice p-3">
      <div className="flex items-center gap-3">
        {meal.photoUrl ? (
          <button onClick={() => setShowPhoto(true)} className="shrink-0" aria-label="사진 크게 보기">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={meal.photoUrl} alt="" className="size-14 rounded-xl object-cover" />
          </button>
        ) : (
          <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-coral-soft text-2xl">
            🍚
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted">{fmtTime(meal.eatenAt)}</p>
          {meal.note && <p className="truncate text-xs text-ink/55">{meal.note}</p>}
        </div>
        <span className="shrink-0 font-display text-coral">{meal.kcal} kcal</span>
        <div className="flex shrink-0 gap-1">
          <button onClick={onEdit} className="px-1 text-sm text-ink/50" aria-label="수정">
            ✏️
          </button>
          <button onClick={onDelete} className="px-1 text-sm text-ink/50" aria-label="삭제">
            🗑️
          </button>
        </div>
      </div>

      {/* 음식별 영양정보 — 한 끼니를 여러 항목으로 기록했어도 전부 나열 */}
      {meal.items.length > 0 && (
        <div className="flex flex-col gap-1.5 border-t border-line pt-2">
          {meal.items.map((it, idx) => (
            <div key={idx} className="flex flex-col gap-0.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="min-w-0 truncate font-medium text-ink/80">{it.name}</span>
                <span className="shrink-0 text-ink/60">{Math.round(it.kcal)}kcal</span>
              </div>
              <p className="text-ink/40">
                {it.amount}{it.unit} · 단백질 {round1(it.protein_g)}g · 탄수 {round1(it.carb_g)}g · 지방{" "}
                {round1(it.fat_g)}g
              </p>
            </div>
          ))}
        </div>
      )}

      {/* 원본 비율로 보기(썸네일은 정사각 크롭이라 잘려 보이는 문제 보완) */}
      {showPhoto && meal.photoUrl && (
        <button
          onClick={() => setShowPhoto(false)}
          className="fixed inset-0 z-40 flex items-center justify-center bg-ink/80 p-6"
          aria-label="닫기"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={meal.photoUrl}
            alt=""
            className="max-h-full max-w-full rounded-2xl object-contain"
          />
        </button>
      )}
    </div>
  );
}

function MealEditOverlay({
  meal,
  onClose,
  onSaved,
}: {
  meal: MealRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const draft = useDraftItems(meal.items);
  const [mealType, setMealType] = useState<MealType>(meal.mealType ?? "간식");
  const [note, setNote] = useState(meal.note ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useBackTrap(true, onClose);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/meals/${meal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft.toPayload(), mealType, note }),
      });
      if (!res.ok) throw new Error("수정에 실패했어요.");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "수정에 실패했어요.");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 overflow-y-auto bg-cream p-4">
      <div className="mx-auto flex w-full max-w-md flex-col gap-4">
        <header className="flex items-center justify-between pt-2">
          <h2 className="font-display text-xl text-ink">끼니 수정</h2>
          <button onClick={onClose} className="text-sm text-muted">
            닫기
          </button>
        </header>
        {error && <p className="text-sm text-coral">{error}</p>}
        <MealEditor
          items={draft.items}
          scaled={draft.scaled}
          total={draft.total}
          mealType={mealType}
          onMealTypeChange={setMealType}
          onAmountChange={draft.setAmount}
          onBump={draft.bump}
          onRemove={draft.removeItem}
          removedLabel={
            draft.removedStack.length > 0
              ? `'${draft.removedStack[draft.removedStack.length - 1].item.name}' 삭제됨 · 되돌리기${
                  draft.removedStack.length > 1 ? ` (${draft.removedStack.length})` : ""
                }`
              : undefined
          }
          onUndo={draft.undoRemove}
          note={note}
          onNoteChange={setNote}
          photoUrl={meal.photoUrl}
          onCancel={onClose}
          onSave={save}
          saving={saving}
          saveLabel="수정 저장"
        />
      </div>
    </div>
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
