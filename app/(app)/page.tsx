"use client";

import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import type { MealEstimate } from "@/lib/ai/types";

type Mode = "home" | "analyzing" | "review" | "saving";

type MealRow = {
  id: string;
  eatenAt: string;
  kcal: number;
};

export default function RecordPage() {
  const [mode, setMode] = useState<Mode>("home");
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // 촬영/분석 상태
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<MealEstimate | null>(null);
  const [note, setNote] = useState("");

  // 오늘 누적
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
      /* 무시 — 요약은 보조 정보 */
    }
  }

  useEffect(() => {
    loadToday();
  }, []);

  const todayKcal = todayMeals.reduce((s, m) => s + (m.kcal || 0), 0);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // 같은 파일 재선택 허용
    if (!file) return;

    setError(null);
    setImage(file);
    setPreviewUrl(URL.createObjectURL(file));
    setMode("analyzing");

    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/analyze", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "분석 실패");
      setEstimate(json.estimate as MealEstimate);
      setMode("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "분석에 실패했어요.");
      setMode("home");
    }
  }

  function patchTotal(key: keyof MealEstimate["total"], value: number) {
    setEstimate((prev) =>
      prev ? { ...prev, total: { ...prev.total, [key]: value } } : prev,
    );
  }

  function removeItem(idx: number) {
    setEstimate((prev) =>
      prev ? { ...prev, items: prev.items.filter((_, i) => i !== idx) } : prev,
    );
  }

  function reset() {
    setImage(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setEstimate(null);
    setNote("");
    setMode("home");
  }

  async function save() {
    if (!estimate) return;
    setMode("saving");
    setError(null);
    try {
      const fd = new FormData();
      fd.append(
        "data",
        JSON.stringify({
          items: estimate.items,
          kcal: estimate.total.kcal,
          protein_g: estimate.total.protein_g,
          carb_g: estimate.total.carb_g,
          fat_g: estimate.total.fat_g,
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
      setToast("저장했어요 🍚");
      setTimeout(() => setToast(null), 2000);
      loadToday();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했어요.");
      setMode("review");
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
      {/* 헤더 */}
      <header className="flex items-center justify-between pt-2">
        <h1 className="text-lg font-bold">🍚 밥로그</h1>
        <button
          onClick={() => signOut()}
          className="text-xs text-neutral-400"
        >
          로그아웃
        </button>
      </header>

      {/* 오늘 누적 */}
      <section className="rounded-2xl bg-neutral-100 px-4 py-3">
        <p className="text-xs text-neutral-500">오늘 먹은 양</p>
        <p className="text-2xl font-bold">
          {todayKcal.toLocaleString()}{" "}
          <span className="text-base font-normal text-neutral-500">kcal</span>
        </p>
        <p className="text-xs text-neutral-400">끼니 {todayMeals.length}개</p>
      </section>

      {error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {/* 홈: 촬영 버튼 */}
      {(mode === "home" || mode === "analyzing") && (
        <button
          onClick={() => cameraRef.current?.click()}
          disabled={mode === "analyzing"}
          className="flex flex-1 flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-neutral-300 py-16 text-neutral-500 transition active:scale-[0.99] disabled:opacity-60"
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
              <span className="animate-pulse text-sm">분석 중…</span>
            </>
          ) : (
            <>
              <span className="text-5xl">📷</span>
              <span className="font-medium">사진 찍어 기록하기</span>
              <span className="text-xs text-neutral-400">
                밥 사진 한 장이면 끝
              </span>
            </>
          )}
        </button>
      )}

      {mode === "home" && (
        <button
          onClick={() => galleryRef.current?.click()}
          className="rounded-xl bg-neutral-100 py-3 text-sm font-medium text-neutral-600 transition active:scale-95"
        >
          🖼 갤러리에서 선택
        </button>
      )}

      {/* 카메라(후면) 직접 호출 */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onPick}
        className="hidden"
      />
      {/* 갤러리 선택 (capture 없음) */}
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
              className="h-40 w-full rounded-2xl object-cover"
            />
          )}

          {/* 인식 항목 */}
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold">인식된 음식</p>
            {estimate.items.length === 0 && (
              <p className="text-sm text-neutral-400">인식된 항목이 없어요.</p>
            )}
            {estimate.items.map((it, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-xl bg-neutral-50 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium">{it.name}</p>
                  <p className="text-xs text-neutral-400">{it.qty}</p>
                </div>
                <button
                  onClick={() => removeItem(idx)}
                  className="text-xs text-neutral-400"
                >
                  삭제
                </button>
              </div>
            ))}
          </div>

          {/* 총합 보정 */}
          <div className="grid grid-cols-2 gap-3">
            <NumField
              label="칼로리 (kcal)"
              value={estimate.total.kcal}
              onChange={(v) => patchTotal("kcal", v)}
            />
            <NumField
              label="단백질 (g)"
              value={estimate.total.protein_g}
              onChange={(v) => patchTotal("protein_g", v)}
            />
            <NumField
              label="탄수 (g)"
              value={estimate.total.carb_g}
              onChange={(v) => patchTotal("carb_g", v)}
            />
            <NumField
              label="지방 (g)"
              value={estimate.total.fat_g}
              onChange={(v) => patchTotal("fat_g", v)}
            />
          </div>

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="메모 (선택)"
            rows={2}
            className="rounded-xl border border-neutral-200 px-3 py-2 text-sm"
          />

          <p className="text-xs text-neutral-400">
            {estimate.notes} · 신뢰도 {estimate.confidence}
          </p>

          <div className="flex gap-2">
            <button
              onClick={reset}
              disabled={mode === "saving"}
              className="flex-1 rounded-xl bg-neutral-100 py-3 font-medium text-neutral-600 disabled:opacity-60"
            >
              취소
            </button>
            <button
              onClick={save}
              disabled={mode === "saving"}
              className="flex-[2] rounded-xl bg-neutral-900 py-3 font-medium text-white transition active:scale-95 disabled:opacity-60"
            >
              {mode === "saving" ? "저장 중…" : "저장"}
            </button>
          </div>
        </section>
      )}

      {toast && (
        <div className="fixed inset-x-0 bottom-20 z-30 mx-auto w-fit rounded-full bg-neutral-900 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </main>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-neutral-500">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="rounded-xl border border-neutral-200 px-3 py-2 text-sm"
      />
    </label>
  );
}
