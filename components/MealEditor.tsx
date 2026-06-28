import { MEAL_TYPES, type MealType } from "@/lib/meal";
import type { MealTotals } from "@/lib/ai/types";
import type { DraftItem } from "@/lib/useDraftItems";

// 기록 홈(신규)·히스토리(수정) 양쪽에서 쓰는 "항목별 양 보정" 화면.
// 데이터/연산은 lib/useDraftItems가 담당, 여기는 순수 표시 + 콜백 위임.
export default function MealEditor({
  items,
  scaled,
  total,
  mealType,
  onMealTypeChange,
  onAmountChange,
  onBump,
  onRemove,
  removedLabel,
  onUndo,
  note,
  onNoteChange,
  photoUrl,
  footerNote,
  onAddMore,
  onCancel,
  onSave,
  saving,
  saveLabel = "저장",
}: {
  items: DraftItem[];
  scaled: (it: DraftItem) => MealTotals;
  total: MealTotals;
  mealType: MealType;
  onMealTypeChange: (m: MealType) => void;
  onAmountChange: (idx: number, value: number) => void;
  onBump: (idx: number, dir: 1 | -1) => void;
  onRemove: (idx: number) => void;
  removedLabel?: string;
  onUndo?: () => void;
  note: string;
  onNoteChange: (note: string) => void;
  photoUrl?: string | null;
  footerNote?: string;
  onAddMore?: () => void;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
  saveLabel?: string;
}) {
  return (
    <section className="flex flex-col gap-4">
      {photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt="" className="h-44 w-full rounded-3xl object-cover" />
      )}

      {/* 끼니 선택 */}
      <div className="flex gap-2">
        {MEAL_TYPES.map((m) => (
          <button
            key={m}
            onClick={() => onMealTypeChange(m)}
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
        <p className="font-display text-lg text-ink">먹은 음식</p>
        {items.length === 0 && (
          <p className="text-sm text-muted">항목이 없어요. 음식을 추가해봐요.</p>
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
                  onClick={() => onRemove(idx)}
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
                    onClick={() => onBump(idx, -1)}
                    className="size-8 rounded-full bg-coral-soft text-lg leading-none text-ink/70 transition active:scale-90"
                    aria-label="줄이기"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={Number.isFinite(it.currentAmount) ? it.currentAmount : ""}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) =>
                      onAmountChange(
                        idx,
                        e.target.value === "" ? NaN : parseFloat(e.target.value),
                      )
                    }
                    className="w-14 rounded-xl border border-line bg-cream px-1 py-1.5 text-center font-display text-ink outline-none focus:border-coral/50"
                  />
                  <button
                    onClick={() => onBump(idx, 1)}
                    className="size-8 rounded-full bg-coral-soft text-lg leading-none text-ink/70 transition active:scale-90"
                    aria-label="늘리기"
                  >
                    +
                  </button>
                  <span className="ml-0.5 text-sm text-muted">{it.unit}</span>
                </div>
                <span className="font-display text-coral">{Math.round(s.kcal)} kcal</span>
              </div>
            </div>
          );
        })}

        {removedLabel && onUndo && (
          <button
            onClick={onUndo}
            className="self-start text-xs text-ink/50 underline underline-offset-2"
          >
            {removedLabel}
          </button>
        )}

        {onAddMore && (
          <button
            onClick={onAddMore}
            disabled={saving}
            className="self-start rounded-2xl border border-dashed border-coral/40 px-4 py-2 text-sm text-coral transition active:scale-95 disabled:opacity-60"
          >
            🔍 음식 더 추가
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
          단백질 {round1(total.protein_g)}g · 탄수 {round1(total.carb_g)}g · 지방{" "}
          {round1(total.fat_g)}g
        </p>
      </div>

      <textarea
        value={note}
        onChange={(e) => onNoteChange(e.target.value)}
        placeholder="메모 (선택)"
        rows={2}
        className="rounded-2xl border border-line bg-rice px-4 py-3 text-sm outline-none focus:border-coral/50"
      />

      {footerNote && <p className="text-xs text-muted">{footerNote}</p>}

      <div className="flex gap-2">
        <button
          onClick={onCancel}
          disabled={saving}
          className="flex-1 rounded-2xl bg-coral-soft py-3.5 font-medium text-ink/70 disabled:opacity-60"
        >
          취소
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          className="flex-2 rounded-2xl bg-coral py-3.5 font-display text-lg text-white shadow-sm transition active:scale-95 disabled:opacity-60"
        >
          {saving ? "저장 중…" : saveLabel}
        </button>
      </div>
    </section>
  );
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
