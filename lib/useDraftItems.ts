import { useState } from "react";
import type { MealItem, MealTotals } from "@/lib/ai/types";

// 보정용 항목: AI/DB 기준 양·매크로(base) + 사용자가 조정한 현재 양(빈칸 허용 위해 NaN 가능).
export type DraftItem = MealItem & { currentAmount: number };

// 단위별 +/- 증감폭
function stepFor(unit: string): number {
  if (unit === "g" || unit === "ml") return 10;
  if (["개", "조각", "장", "판", "컵", "알", "줄"].includes(unit)) return 1;
  return 0.5;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function toDraft(items: MealItem[]): DraftItem[] {
  return items.map((it) => ({ ...it, currentAmount: it.amount }));
}

// 기록 홈(신규)·히스토리(수정) 양쪽에서 쓰는 "항목별 양 보정" 상태 + 로직.
// 화면(JSX)은 components/MealEditor.tsx가 그리고, 이 훅이 데이터/연산을 담당.
export function useDraftItems(initial: MealItem[] = []) {
  const [items, setItems] = useState<DraftItem[]>(() => toDraft(initial));
  const [removedStack, setRemovedStack] = useState<
    { item: DraftItem; index: number }[]
  >([]);

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

  const total: MealTotals = items.reduce(
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

  function addItems(newItems: MealItem[]) {
    setItems((prev) => [...prev, ...toDraft(newItems)]);
  }

  function reset(newItems: MealItem[] = []) {
    setItems(toDraft(newItems));
    setRemovedStack([]);
  }

  // 저장용 payload: 보정된 현재 양 기준으로 항목/합계를 정리.
  function toPayload() {
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
        ...(it.source ? { source: it.source } : {}),
      };
    });
    return {
      items: payloadItems,
      kcal: Math.round(total.kcal),
      protein_g: round1(total.protein_g),
      carb_g: round1(total.carb_g),
      fat_g: round1(total.fat_g),
    };
  }

  return {
    items,
    removedStack,
    total,
    scaled,
    setAmount,
    bump,
    removeItem,
    undoRemove,
    addItems,
    reset,
    toPayload,
  };
}
