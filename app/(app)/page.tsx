"use client";

import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import type { MealEstimate } from "@/lib/ai/types";
import { compressImage } from "@/lib/image";

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

  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<MealEstimate | null>(null);
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

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);
    setMode("analyzing");

    // 업로드/분석 전에 리사이즈 + EXIF 제거
    const compressed = await compressImage(file);
    setImage(compressed);
    setPreviewUrl(URL.createObjectURL(compressed));

    try {
      const fd = new FormData();
      fd.append("image", compressed);
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

      {/* 오늘 누적 — 밥공기 마스코트 */}
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

          <div className="flex flex-col gap-2">
            <p className="font-display text-lg text-ink">인식된 음식</p>
            {estimate.items.length === 0 && (
              <p className="text-sm text-muted">인식된 항목이 없어요.</p>
            )}
            {estimate.items.map((it, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-2xl border border-line bg-rice px-4 py-2.5"
              >
                <div>
                  <p className="text-sm font-medium text-ink">{it.name}</p>
                  <p className="text-xs text-muted">{it.qty}</p>
                </div>
                <button
                  onClick={() => removeItem(idx)}
                  className="text-xs text-muted"
                >
                  삭제
                </button>
              </div>
            ))}
          </div>

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
      <span className="text-xs text-muted">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="rounded-xl border border-line bg-rice px-3 py-2.5 font-display text-lg text-ink outline-none focus:border-coral/50"
      />
    </label>
  );
}
