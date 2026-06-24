"use client";

import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import type { MealEstimate, MealItem } from "@/lib/ai/types";
import type { FoodHit } from "@/lib/food/types";
import { compressImage } from "@/lib/image";
import { inferMealType, type MealType } from "@/lib/meal";
import { useDraftItems } from "@/lib/useDraftItems";
import { useBackTrap } from "@/lib/useBackTrap";
import MealEditor from "@/components/MealEditor";

type Mode = "home" | "analyzing" | "search" | "review" | "saving";

type MealRow = { id: string; eatenAt: string; kcal: number };

export default function RecordPage() {
  const [mode, setMode] = useState<Mode>("home");
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [estimate, setEstimate] = useState<MealEstimate | null>(null);
  const draft = useDraftItems();
  const [mealType, setMealType] = useState<MealType>(inferMealType());
  const [note, setNote] = useState("");

  // 수동 입력(D18): 식약처 DB 검색 + AI 폴백
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodHit[]>([]);
  const [searched, setSearched] = useState(false);
  const [searchBusy, setSearchBusy] = useState(false);

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
      draft.reset(est.items);
      setMealType(inferMealType());
      setMode("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "분석에 실패했어요.");
      setMode("home");
    }
  }

  function reset() {
    setImage(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setEstimate(null);
    draft.reset([]);
    setNote("");
    setQuery("");
    setResults([]);
    setSearched(false);
    setMode("home");
  }

  // ── 수동 입력(D18): 검색 → 선택/AI추정 → 보정 화면 재사용 ──────────

  function startManual() {
    reset();
    setMode("search");
  }

  function openSearch() {
    // 보정 중 "음식 더 추가" — items는 유지한 채 검색만 다시.
    setQuery("");
    setResults([]);
    setSearched(false);
    setMode("search");
  }

  async function doSearch() {
    const q = query.trim();
    if (!q) return;
    setSearchBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/foods/search?q=${encodeURIComponent(q)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "검색 실패");
      setResults((json.foods as FoodHit[]) ?? []);
      setSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "검색에 실패했어요.");
    } finally {
      setSearchBusy(false);
    }
  }

  // FoodHit(기준 양 기준 매크로) → 보정용 항목(1회 제공량을 기본 양으로).
  function hitToItem(h: FoodHit): MealItem {
    const amount =
      h.servingWeight && h.servingWeight > 0 ? h.servingWeight : h.basisAmount;
    const f = h.basisAmount ? amount / h.basisAmount : 1;
    return {
      name: h.name,
      amount: round1(amount),
      unit: h.unit,
      kcal: h.kcal * f,
      protein_g: h.protein_g * f,
      carb_g: h.carb_g * f,
      fat_g: h.fat_g * f,
    };
  }

  // 항목들을 보정 화면에 추가(기존 items에 누적). 사진 없는 수동 흐름이라
  // 합성 estimate를 세워 보정 UI 게이트(estimate 필요)를 만족시킨다.
  function addItems(newItems: MealItem[], notes: string) {
    if (draft.items.length === 0) setMealType(inferMealType());
    draft.addItems(newItems);
    setEstimate(
      (prev) =>
        prev ?? {
          items: [],
          total: { kcal: 0, protein_g: 0, carb_g: 0, fat_g: 0 },
          confidence: "medium",
          notes,
        },
    );
    setMode("review");
  }

  async function aiEstimate() {
    const q = query.trim();
    if (!q) return;
    setSearchBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/foods/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: q }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "추정 실패");
      const est = json.estimate as MealEstimate;
      if (est.items.length === 0) {
        setError("‘" + q + "’를 추정하지 못했어요. 다른 이름으로 검색해볼까요?");
        return;
      }
      addItems(est.items, "AI 이름 기반 추정값");
    } catch (err) {
      setError(err instanceof Error ? err.message : "추정에 실패했어요.");
    } finally {
      setSearchBusy(false);
    }
  }

  function cancelSearch() {
    if (draft.items.length > 0) setMode("review");
    else reset();
  }

  async function save() {
    setMode("saving");
    setError(null);
    try {
      const fd = new FormData();
      fd.append(
        "data",
        JSON.stringify({
          ...draft.toPayload(),
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

  // 사진분석/검색/보정/저장중 화면은 안드로이드 뒤로가기로 "닫기" 처리(useBackTrap).
  // saving도 포함해야 저장 중 깜빡 닫혔다 다시 열리며 트랩 칸이 어긋나는 일이 없음.
  const subOpen =
    mode === "search" || mode === "review" || mode === "analyzing" || mode === "saving";
  useBackTrap(subOpen, reset);

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
        <div className="flex gap-2">
          <button
            onClick={() => galleryRef.current?.click()}
            className="flex-1 rounded-2xl border border-line bg-rice py-3 text-sm font-medium text-ink/70 transition active:scale-95"
          >
            🖼 갤러리
          </button>
          <button
            onClick={startManual}
            className="flex-1 rounded-2xl border border-line bg-rice py-3 text-sm font-medium text-ink/70 transition active:scale-95"
          >
            🔍 검색해서 입력
          </button>
        </div>
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

      {/* 수동 입력: 검색 */}
      {mode === "search" && (
        <section className="flex flex-1 flex-col gap-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              doSearch();
            }}
            className="flex gap-2"
          >
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="음식 이름 (예: 김치찌개)"
              className="flex-1 rounded-2xl border border-line bg-rice px-4 py-3 text-sm outline-none focus:border-coral/50"
            />
            <button
              type="submit"
              disabled={searchBusy || !query.trim()}
              className="rounded-2xl bg-coral px-5 font-display text-white transition active:scale-95 disabled:opacity-50"
            >
              검색
            </button>
          </form>

          {searchBusy && (
            <p className="animate-pulse py-2 text-center text-sm text-coral">
              찾는 중…
            </p>
          )}

          <div className="flex flex-col gap-2">
            {results.map((h) => (
              <button
                key={h.code}
                onClick={() => addItems([hitToItem(h)], "식약처 DB")}
                className="flex items-center justify-between rounded-2xl border border-line bg-rice px-4 py-3 text-left transition active:scale-[0.99]"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-ink">
                    {h.name}
                  </span>
                  <span className="text-xs text-muted">
                    {h.basisAmount}
                    {h.unit}당 {Math.round(h.kcal)} kcal
                    {h.maker ? ` · ${h.maker}` : ""}
                  </span>
                </span>
                <span className="ml-2 shrink-0 font-display text-coral">＋</span>
              </button>
            ))}
          </div>

          {searched && !searchBusy && results.length === 0 && (
            <p className="text-sm text-muted">검색 결과가 없어요.</p>
          )}

          {/* AI 폴백: DB에 없으면 이름으로 추정 */}
          {searched && !searchBusy && query.trim() && (
            <button
              onClick={aiEstimate}
              className="self-start rounded-2xl bg-matcha-soft px-4 py-2.5 text-sm font-medium text-ink/70 transition active:scale-95"
            >
              ✨ ‘{query.trim()}’ AI로 추정해서 추가
            </button>
          )}

          <button
            onClick={cancelSearch}
            className="mt-auto rounded-2xl bg-coral-soft py-3.5 font-medium text-ink/70"
          >
            {draft.items.length > 0 ? "보정으로 돌아가기" : "취소"}
          </button>
        </section>
      )}

      {/* 보정 화면 */}
      {(mode === "review" || mode === "saving") && estimate && (
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
          photoUrl={previewUrl}
          footerNote={`${estimate.notes} · 신뢰도 ${estimate.confidence}`}
          onAddMore={openSearch}
          onCancel={reset}
          onSave={save}
          saving={mode === "saving"}
        />
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
