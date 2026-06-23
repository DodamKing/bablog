"use client";

import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import type { MealEstimate, MealItem } from "@/lib/ai/types";
import { compressImage } from "@/lib/image";
import { inferMealType, MEAL_TYPES, type MealType } from "@/lib/meal";

type Mode = "home" | "analyzing" | "review" | "saving";

type MealRow = { id: string; eatenAt: string; kcal: number };

// 보정용 항목: AI 기준 양/매크로(base) + 사용자가 조정한 현재 양(빈칸 허용 위해 NaN 가능).
type DraftItem = MealItem & { currentAmount: number };

// 단위별 +/- 증감폭
function stepFor(unit: string): number {
  if (unit === "g" || unit === "ml") return 10;
  if (["개", "조각", "장", "판", "컵", "알", "줄"].includes(unit)) return 1;
  return 0.5;
}

export default function RecordPage() {
  const [mode, setMode] = useState<Mode>("home");
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [estimate, setEstimate] = useState<MealEstimate | null>(null);
  const [items, setItems] = useState<DraftItem[]>([]);
  const [removedStack, setRemovedStack] = useState<
    { item: DraftItem; index: number }[]
  >([]);
  const [mealType, setMealType] = useState<MealType>(inferMealType());
  const [note, setNote] = useState("");

  const [todayMeals, setTodayMeals] = useState<MealRow[]>([]);

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

  useEffect(() => {
    loadToday();
  }, []);

  const todayKcal = todayMeals.reduce((s, m) => s + (m.kcal || 0), 0);

  // 현재 양 기준 비례 스케일 (빈칸/NaN은 0으로 계산)
  function scaled(it: DraftItem) {
    const amt = Number.isFinite(it.currentAmount) ? it.currentAmount : 0;
    const f = it.amount ? amt / it.amount : 1;
    return {
      kcal: it.kcal * f,
      protein_g: it.protein_g * f,
      carb_g: it.carb_g * f,
      fat_g: it.fat_g * f,
    };
  }

  const total = items.reduce(
    (acc, it) => {
      const s = scaled(it);
      return {
        kcal: acc.kcal + s.kcal,
        protein_g: acc.protein_g + s.protein_g,
        carb_g: acc.carb_g + s.carb_g,
        fat_g: acc.fat_g + s.fat_g,
      };
    },
    { kcal: 0, protein_g: 0, carb_g: 0, fat_g: 0 },
  );

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);
    setMode("analyzing");

    const compressed = await compressImage(file);
    setImage(compressed);
    setPreviewUrl(URL.createObjectURL(compressed));

    try {
      const fd = new FormData();
      fd.append("image", compressed);
      const res = await fetch("/api/analyze", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "분석 실패");
      const est = json.estimate as MealEstimate;
      if (est.items.length === 0) {
        // 비음식/식별 불가 가드
        setError("음식을 못 찾았어요. 더 잘 보이게 다시 찍어볼까요?");
        setMode("home");
        return;
      }
      setEstimate(est);
      setItems(est.items.map((it) => ({ ...it, currentAmount: it.amount })));
      setRemovedStack([]);
      setMealType(inferMealType());
      setMode("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "분석에 실패했어요.");
      setMode("home");
    }
  }

  function setAmount(idx: number, value: number) {
    setItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, currentAmount: value } : it)),
    );
  }

  function bump(idx: number, dir: 1 | -1) {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== idx) return it;
        const base = Number.isFinite(it.currentAmount) ? it.currentAmount : 0;
        const next = Math.max(0, round1(base + dir * stepFor(it.unit)));
        return { ...it, currentAmount: next };
      }),
    );
  }

  function removeItem(idx: number) {
    setRemovedStack((prev) => [...prev, { item: items[idx], index: idx }]);
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function undoRemove() {
    if (removedStack.length === 0) return;
    const last = removedStack[removedStack.length - 1];
    setItems((prev) => {
      const next = [...prev];
      next.splice(Math.min(last.index, next.length), 0, last.item);
      return next;
    });
    setRemovedStack((prev) => prev.slice(0, -1));
  }

  function reset() {
    setImage(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setEstimate(null);
    setItems([]);
    setRemovedStack([]);
    setNote("");
    setMode("home");
  }

  async function save() {
    setMode("saving");
    setError(null);
    try {
      const payloadItems = items.map((it) => {
        const s = scaled(it);
        return {
          name: it.name,
          amount: Number.isFinite(it.currentAmount) ? it.currentAmount : 0,
          unit: it.unit,
          kcal: Math.round(s.kcal),
          protein_g: round1(s.protein_g),
          carb_g: round1(s.carb_g),
          fat_g: round1(s.fat_g),
        };
      });
      const fd = new FormData();
      fd.append(
        "data",
        JSON.stringify({
          items: payloadItems,
          kcal: Math.round(total.kcal),
          protein_g: round1(total.protein_g),
          carb_g: round1(total.carb_g),
          fat_g: round1(total.fat_g),
          mealType,
          note,
          aiRaw: estimate,
        }),
      );
      if (image) fd.append("image", image);

      const res = await fetch("/api/meals", { method: "POST", body: fd });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "저장 실패");
      }
      reset();
      setToast("잘 먹었어요 🍚");
      setTimeout(() => setToast(null), 2000);
      loadToday();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했어요.");
      setMode("review");
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
      <header className="flex items-center justify-between pt-2">
        <h1 className="font-display text-2xl text-ink">🍚 밥로그</h1>
        <button onClick={() => signOut()} className="text-xs text-muted">
          로그아웃
        </button>
      </header>

      {/* 오늘 누적 */}
      <section className="rounded-3xl bg-coral-soft px-5 py-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-ink/55">오늘 먹은 양</p>
            <p className="font-display text-4xl text-ink">
              {todayKcal.toLocaleString()}
              <span className="ml-1 text-lg text-ink/45">kcal</span>
            </p>
          </div>
          <span className="animate-bob text-5xl">🍚</span>
        </div>
        <div className="mt-3 flex items-center gap-1">
          {todayMeals.length === 0 ? (
            <p className="text-sm text-ink/50">오늘 첫 끼니를 기록해봐요!</p>
          ) : (
            <>
              {todayMeals.slice(0, 8).map((m) => (
                <span key={m.id} className="text-base">
                  🍚
                </span>
              ))}
              <span className="ml-1 text-sm text-ink/50">
                끼니 {todayMeals.length}개
              </span>
            </>
          )}
        </div>
      </section>

      {error && (
        <p className="rounded-2xl bg-coral/10 px-4 py-2.5 text-sm text-coral">
          {error}
        </p>
      )}

      {/* 홈: 촬영 */}
      {(mode === "home" || mode === "analyzing") && (
        <button
          onClick={() => cameraRef.current?.click()}
          disabled={mode === "analyzing"}
          className="flex flex-1 flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-coral/40 bg-rice py-16 transition active:scale-[0.99] disabled:opacity-70"
        >
          {mode === "analyzing" ? (
            <>
              {previewUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt=""
                  className="h-28 w-28 rounded-2xl object-cover"
                />
              )}
              <span className="animate-pulse font-display text-lg text-coral">
                맛 분석 중…
              </span>
            </>
          ) : (
            <>
              <span className="animate-bob text-6xl">📷</span>
              <span className="font-display text-xl text-ink">
                사진 찍어 기록하기
              </span>
              <span className="text-sm text-muted">밥 사진 한 장이면 끝</span>
            </>
          )}
        </button>
      )}

      {mode === "home" && (
        <button
          onClick={() => galleryRef.current?.click()}
          className="rounded-2xl border border-line bg-rice py-3 text-sm font-medium text-ink/70 transition active:scale-95"
        >
          🖼 갤러리에서 선택
        </button>
      )}

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onPick}
        className="hidden"
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        onChange={onPick}
        className="hidden"
      />

      {/* 보정 화면 */}
      {(mode === "review" || mode === "saving") && estimate && (
        <section className="flex flex-col gap-4">
          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt=""
              className="h-44 w-full rounded-3xl object-cover"
            />
          )}

          {/* 끼니 선택 */}
          <div className="flex gap-2">
            {MEAL_TYPES.map((m) => (
              <button
                key={m}
                onClick={() => setMealType(m)}
                className={`flex-1 rounded-2xl py-2 text-sm transition ${
                  mealType === m
                    ? "bg-coral font-display text-white"
                    : "border border-line bg-rice text-ink/60"
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {/* 항목별 양 보정 */}
          <div className="flex flex-col gap-2">
            <p className="font-display text-lg text-ink">인식된 음식</p>
            {items.length === 0 && (
              <p className="text-sm text-muted">인식된 항목이 없어요.</p>
            )}
            {items.map((it, idx) => {
              const s = scaled(it);
              return (
                <div
                  key={idx}
                  className="flex flex-col gap-2.5 rounded-2xl border border-line bg-rice px-4 py-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-ink">{it.name}</p>
                    <button
                      onClick={() => removeItem(idx)}
                      className="text-sm text-muted"
                      aria-label="삭제"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    {/* 스테퍼 */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => bump(idx, -1)}
                        className="size-8 rounded-full bg-coral-soft text-lg leading-none text-ink/70 transition active:scale-90"
                        aria-label="줄이기"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={
                          Number.isFinite(it.currentAmount)
                            ? it.currentAmount
                            : ""
                        }
                        onFocus={(e) => e.target.select()}
                        onChange={(e) =>
                          setAmount(
                            idx,
                            e.target.value === ""
                              ? NaN
                              : parseFloat(e.target.value),
                          )
                        }
                        className="w-14 rounded-xl border border-line bg-cream px-1 py-1.5 text-center font-display text-ink outline-none focus:border-coral/50"
                      />
                      <button
                        onClick={() => bump(idx, 1)}
                        className="size-8 rounded-full bg-coral-soft text-lg leading-none text-ink/70 transition active:scale-90"
                        aria-label="늘리기"
                      >
                        +
                      </button>
                      <span className="ml-0.5 text-sm text-muted">
                        {it.unit}
                      </span>
                    </div>
                    <span className="font-display text-coral">
                      {Math.round(s.kcal)} kcal
                    </span>
                  </div>
                </div>
              );
            })}

            {/* 삭제 되돌리기 */}
            {removedStack.length > 0 && (
              <button
                onClick={undoRemove}
                className="self-start text-xs text-ink/50 underline underline-offset-2"
              >
                ‘{removedStack[removedStack.length - 1].item.name}’ 삭제됨 ·
                되돌리기
                {removedStack.length > 1 ? ` (${removedStack.length})` : ""}
              </button>
            )}
          </div>

          {/* 합계 (항목에서 자동 계산) */}
          <div className="rounded-2xl bg-matcha-soft px-4 py-3">
            <p className="text-xs text-ink/50">합계</p>
            <p className="font-display text-2xl text-ink">
              {Math.round(total.kcal).toLocaleString()}
              <span className="ml-1 text-base text-ink/45">kcal</span>
            </p>
            <p className="mt-0.5 text-xs text-ink/55">
              단백질 {round1(total.protein_g)}g · 탄수 {round1(total.carb_g)}g ·
              지방 {round1(total.fat_g)}g
            </p>
          </div>

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="메모 (선택)"
            rows={2}
            className="rounded-2xl border border-line bg-rice px-4 py-3 text-sm outline-none focus:border-coral/50"
          />

          <p className="text-xs text-muted">
            {estimate.notes} · 신뢰도 {estimate.confidence}
          </p>

          <div className="flex gap-2">
            <button
              onClick={reset}
              disabled={mode === "saving"}
              className="flex-1 rounded-2xl bg-coral-soft py-3.5 font-medium text-ink/70 disabled:opacity-60"
            >
              취소
            </button>
            <button
              onClick={save}
              disabled={mode === "saving"}
              className="flex-[2] rounded-2xl bg-coral py-3.5 font-display text-lg text-white shadow-sm transition active:scale-95 disabled:opacity-60"
            >
              {mode === "saving" ? "저장 중…" : "저장"}
            </button>
          </div>
        </section>
      )}

      {toast && (
        <div className="animate-pop fixed inset-x-0 bottom-20 z-30 mx-auto w-fit rounded-full bg-ink px-5 py-2.5 font-display text-cream shadow-lg">
          {toast}
        </div>
      )}
    </main>
  );
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
