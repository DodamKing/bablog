"use client";

import { useEffect, useRef, useState } from "react";
import type { MealEstimate, MealItem } from "@/lib/ai/types";
import { hitToBasis, type FoodHit } from "@/lib/food/types";
import { compressImage } from "@/lib/image";
import { inferMealType, type MealType } from "@/lib/meal";
import { useDraftItems } from "@/lib/useDraftItems";
import { useBackTrap } from "@/lib/useBackTrap";
import MealEditor from "@/components/MealEditor";
import ConfirmDialog from "@/components/ConfirmDialog";

type Mode = "entry" | "analyzing" | "search" | "review" | "saving";

// 사진 찍기/갤러리/검색으로 끼니를 기록하는 흐름 — 홈(오늘, 카메라 포함)과
// 히스토리의 "기록 추가" 오버레이(지난 날짜, 검색만) 양쪽에서 공용으로 쓴다(D22 개정).
// 오늘 누적 대시보드 등은 이 컴포넌트 밖 관심사 — 저장이 끝나면 onSaved만 호출.
export default function MealRecorder({
  targetDate,
  allowCamera,
  onSaved,
  onCancel,
}: {
  targetDate?: Date; // 없으면 오늘(now). 있으면 그 날짜 + 현재 시:분.
  allowCamera: boolean; // 홈=true(카메라/갤러리/검색), 히스토리=false(검색만)
  onSaved: () => void;
  onCancel?: () => void; // 홈은 "entry"(카메라 대시보드)로 돌아가면 그만이라 불필요. 히스토리는 이걸로 오버레이를 닫음.
}) {
  function freshEatenAt(): Date {
    const now = new Date();
    if (!targetDate) return now;
    return new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
      now.getHours(),
      now.getMinutes(),
    );
  }

  const [mode, setMode] = useState<Mode>(allowCamera ? "entry" : "search");
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [estimate, setEstimate] = useState<MealEstimate | null>(null);
  const draft = useDraftItems();
  const [mealType, setMealType] = useState<MealType>(inferMealType());
  const [eatenAt, setEatenAt] = useState<Date>(freshEatenAt);
  const [note, setNote] = useState("");

  // 수동 입력(D18): 식약처 DB 검색 + AI 폴백
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodHit[]>([]);
  const [searched, setSearched] = useState(false);
  const [searchBusy, setSearchBusy] = useState(false);

  // 즐겨찾기 + 자주 먹는 음식 (Phase 6)
  const [frequent, setFrequent] = useState<FoodHit[]>([]);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [regForm, setRegForm] = useState({
    name: "",
    amount: "",
    unit: "g",
    kcal: "",
    protein_g: "",
    carb_g: "",
    fat_g: "",
  });
  const [deleteTarget, setDeleteTarget] = useState<FoodHit | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  async function loadFrequent() {
    try {
      const res = await fetch("/api/foods/search");
      const json = await res.json();
      if (res.ok) setFrequent((json.foods as FoodHit[]) ?? []);
    } catch {
      /* 보조 정보 — 실패해도 무시 */
    }
  }

  // 검색만 하는 히스토리 쪽(allowCamera=false)은 처음부터 search 모드로 시작하므로
  // 마운트 시 바로 즐겨찾기/자주 먹는 음식을 불러온다.
  useEffect(() => {
    (async () => {
      if (!allowCamera) await loadFrequent();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        setMode("entry");
        return;
      }
      setEstimate(est);
      draft.reset(est.items);
      setMealType(inferMealType());
      setMode("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "분석에 실패했어요.");
      setMode("entry");
    }
  }

  // "처음 상태로 돌아가기" — 홈은 그게 카메라 대시보드("entry")고, 히스토리는
  // 그런 상위 화면이 없으므로 오버레이를 닫는 것 자체가 "처음 상태"다.
  function reset() {
    setImage(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setEstimate(null);
    draft.reset([]);
    setEatenAt(freshEatenAt());
    setNote("");
    setQuery("");
    setResults([]);
    setSearched(false);
    setShowRegisterForm(false);
    if (allowCamera) {
      setMode("entry");
    } else {
      onCancel?.();
    }
  }

  // ── 수동 입력(D18): 검색 → 선택/AI추정 → 보정 화면 재사용 ──────────

  function startManual() {
    reset();
    setMode("search");
    loadFrequent();
  }

  function openSearch() {
    // 보정 중 "음식 더 추가" — items는 유지한 채 검색만 다시.
    setQuery("");
    setResults([]);
    setSearched(false);
    setShowRegisterForm(false);
    setMode("search");
    loadFrequent();
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
  // source: "gov" — 식약처/foods 테이블 출신, 끼니 저장 시 foods/user_foods에 upsert(D19).
  function hitToItem(h: FoodHit): MealItem {
    return { ...hitToBasis(h), source: "gov" };
  }

  // 즐겨찾기 토글 (Phase 6). foods 테이블에 아직 없는 식약처 라이브 결과는 서버가 upsert 후 처리.
  async function toggleFavorite(hit: FoodHit) {
    const makeFavorite = !hit.favorited;
    const apply = (fav: boolean) => (list: FoodHit[]) =>
      list.map((h) => (h.code === hit.code ? { ...h, favorited: fav } : h));
    setResults(apply(makeFavorite));
    setFrequent(apply(makeFavorite));
    try {
      const res = await fetch("/api/foods/favorite", {
        method: makeFavorite ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          hit.fromFoodsTable ? { foodId: hit.code } : { hit },
        ),
      });
      if (!res.ok) throw new Error();
    } catch {
      setResults(apply(!makeFavorite));
      setFrequent(apply(!makeFavorite));
    }
  }

  // 직접 등록 (Phase 6) — 검색 결과 없을 때 AI 추정 버튼 옆에서 시작.
  // kcal/단백/탄수/지방은 전역 공유 데이터라 빈 값을 0으로 묵인하지 않고 전부 필수로 받음.
  function parseRequired(s: string): number | null {
    if (s.trim() === "") return null;
    const n = parseFloat(s);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }

  async function submitRegister() {
    const name = regForm.name.trim();
    const amount = parseFloat(regForm.amount);
    const unit = regForm.unit.trim();
    const kcal = parseRequired(regForm.kcal);
    const protein_g = parseRequired(regForm.protein_g);
    const carb_g = parseRequired(regForm.carb_g);
    const fat_g = parseRequired(regForm.fat_g);
    if (
      !name || !unit || !Number.isFinite(amount) || amount <= 0 ||
      kcal === null || protein_g === null || carb_g === null || fat_g === null
    ) {
      setError("이름·양·단위·kcal·단백질·탄수·지방을 모두 채워주세요.");
      return;
    }
    setSearchBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/foods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          amount,
          unit,
          kcal,
          protein_g,
          carb_g,
          fat_g,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "등록 실패");
      const food = json.food as FoodHit;
      addItems([{ ...hitToBasis(food), source: "user" }], "직접 등록");
      setShowRegisterForm(false);
      setRegForm({
        name: "",
        amount: "",
        unit: "g",
        kcal: "",
        protein_g: "",
        carb_g: "",
        fat_g: "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "등록에 실패했어요.");
    } finally {
      setSearchBusy(false);
    }
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
      addItems(
        est.items.map((it) => ({ ...it, source: "ai" as const })),
        "AI 이름 기반 추정값",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "추정에 실패했어요.");
    } finally {
      setSearchBusy(false);
    }
  }

  // 검색결과/자주먹는 음식 한 줄 — 양쪽에서 재사용.
  function renderFoodRow(h: FoodHit) {
    return (
      <div
        key={h.code}
        className="flex items-center gap-1 rounded-2xl border border-line bg-rice px-4 py-3"
      >
        <button
          onClick={() => addItems([hitToItem(h)], h.maker ? "식약처 DB" : "")}
          className="flex min-w-0 flex-1 items-center justify-between text-left transition active:scale-[0.99]"
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
        <button
          onClick={() => toggleFavorite(h)}
          aria-label={h.favorited ? "즐겨찾기 해제" : "즐겨찾기 추가"}
          className="shrink-0 px-1 text-lg text-coral transition active:scale-90"
        >
          {h.favorited ? "★" : "☆"}
        </button>
        {h.mine && (
          <button
            onClick={() => setDeleteTarget(h)}
            aria-label="삭제"
            className="shrink-0 px-1 text-sm text-muted transition active:scale-90"
          >
            🗑
          </button>
        )}
      </div>
    );
  }

  // 내가 직접 등록한 음식 삭제 (Phase 6). 끼니에 이미 저장된 기록은
  // 그 시점 스냅샷이라 영향 없음 — `foods`/`user_foods`에서만 제거.
  async function confirmDeleteFood() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      const res = await fetch("/api/foods", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ foodId: deleteTarget.code }),
      });
      if (!res.ok) throw new Error();
      const removed = (list: FoodHit[]) =>
        list.filter((h) => h.code !== deleteTarget.code);
      setResults(removed);
      setFrequent(removed);
      setDeleteTarget(null);
    } catch {
      setError("삭제에 실패했어요.");
    } finally {
      setDeleteBusy(false);
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
          eatenAt: eatenAt.toISOString(),
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
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했어요.");
      setMode("review");
    }
  }

  // 카메라 흐름(홈)만 안드로이드 뒤로가기 트랩 대상 — 히스토리 오버레이는
  // 바깥(AddMealOverlay)이 이미 트랩을 걸고 있어 여기선 걸지 않는다(이중 트랩 방지).
  const subOpen =
    allowCamera &&
    (mode === "search" || mode === "review" || mode === "analyzing" || mode === "saving");
  useBackTrap(subOpen, reset);

  return (
    <>
      {error && (
        <p className="rounded-2xl bg-coral/10 px-4 py-2.5 text-sm text-coral">
          {error}
        </p>
      )}

      {/* 홈: 촬영 */}
      {allowCamera && (mode === "entry" || mode === "analyzing") && (
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

      {allowCamera && mode === "entry" && (
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

      {allowCamera && (
        <>
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
        </>
      )}

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

          {/* 검색 전: 즐겨찾기 + 자주 먹는 음식 (Phase 6) */}
          {query.trim() === "" && !searched && frequent.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-muted">즐겨찾기 · 자주 먹는 음식</p>
              {frequent.map(renderFoodRow)}
            </div>
          )}

          <div className="flex flex-col gap-2">{results.map(renderFoodRow)}</div>

          {searched && !searchBusy && results.length === 0 && (
            <p className="text-sm text-muted">검색 결과가 없어요.</p>
          )}

          {/* AI 폴백 + 직접 등록 토글: DB에 없으면. 폼 자체(showRegisterForm)는 검색어가
              바뀌어도 안 사라지게 별도 블록으로 분리 — 이전엔 같은 조건에 묶여 있어서
              검색창을 비우면 작성 중인 폼이 통째로 사라지는 버그가 있었음. */}
          {searched && !searchBusy && query.trim() && (
            <div className="flex gap-2">
              <button
                onClick={aiEstimate}
                className="flex-1 rounded-2xl bg-matcha-soft px-4 py-2.5 text-sm font-medium text-ink/70 transition active:scale-95"
              >
                ✨ AI로 추정해서 추가
              </button>
              <button
                onClick={() => {
                  setShowRegisterForm((v) => !v);
                  setRegForm((f) => ({ ...f, name: query.trim() }));
                }}
                className="flex-1 rounded-2xl border border-dashed border-coral/40 px-4 py-2.5 text-sm font-medium text-coral transition active:scale-95"
              >
                📝 직접 등록
              </button>
            </div>
          )}

          {showRegisterForm && (
            <div className="flex flex-col gap-2 rounded-2xl border border-line bg-rice p-3">
              <input
                value={regForm.name}
                onChange={(e) =>
                  setRegForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="음식 이름"
                className="rounded-xl border border-line bg-cream px-3 py-2 text-sm outline-none focus:border-coral/50"
              />
              <div className="flex gap-2">
                <input
                  value={regForm.amount}
                  onChange={(e) =>
                    setRegForm((f) => ({ ...f, amount: e.target.value }))
                  }
                  type="number"
                  inputMode="decimal"
                  placeholder="양"
                  className="w-16 rounded-xl border border-line bg-cream px-2 py-2 text-center text-sm outline-none focus:border-coral/50"
                />
                <input
                  value={regForm.unit}
                  onChange={(e) =>
                    setRegForm((f) => ({ ...f, unit: e.target.value }))
                  }
                  placeholder="단위(g)"
                  className="w-16 rounded-xl border border-line bg-cream px-2 py-2 text-center text-sm outline-none focus:border-coral/50"
                />
                <input
                  value={regForm.kcal}
                  onChange={(e) =>
                    setRegForm((f) => ({ ...f, kcal: e.target.value }))
                  }
                  type="number"
                  inputMode="decimal"
                  placeholder="kcal"
                  className="flex-1 rounded-xl border border-line bg-cream px-2 py-2 text-center text-sm outline-none focus:border-coral/50"
                />
              </div>
              <div className="flex gap-2">
                <input
                  value={regForm.protein_g}
                  onChange={(e) =>
                    setRegForm((f) => ({ ...f, protein_g: e.target.value }))
                  }
                  type="number"
                  inputMode="decimal"
                  placeholder="단백질 g"
                  className="flex-1 rounded-xl border border-line bg-cream px-2 py-2 text-center text-sm outline-none focus:border-coral/50"
                />
                <input
                  value={regForm.carb_g}
                  onChange={(e) =>
                    setRegForm((f) => ({ ...f, carb_g: e.target.value }))
                  }
                  type="number"
                  inputMode="decimal"
                  placeholder="탄수 g"
                  className="flex-1 rounded-xl border border-line bg-cream px-2 py-2 text-center text-sm outline-none focus:border-coral/50"
                />
                <input
                  value={regForm.fat_g}
                  onChange={(e) =>
                    setRegForm((f) => ({ ...f, fat_g: e.target.value }))
                  }
                  type="number"
                  inputMode="decimal"
                  placeholder="지방 g"
                  className="flex-1 rounded-xl border border-line bg-cream px-2 py-2 text-center text-sm outline-none focus:border-coral/50"
                />
              </div>
              <button
                onClick={submitRegister}
                disabled={searchBusy}
                className="rounded-2xl bg-coral py-2.5 font-display text-white transition active:scale-95 disabled:opacity-50"
              >
                등록하고 추가
              </button>
            </div>
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

      {deleteTarget && (
        <ConfirmDialog
          title={`'${deleteTarget.name}' 삭제할까요?`}
          description="직접 등록한 음식만 지울 수 있어요. 이미 저장된 끼니 기록엔 영향 없어요."
          busy={deleteBusy}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmDeleteFood}
        />
      )}
    </>
  );
}
