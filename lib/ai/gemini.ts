import "server-only";
import { GoogleGenAI } from "@google/genai";
import type { MealEstimate, MealItem } from "./types";

// ── 모델 교체 지점 (D11) ── 변경 시 여기 한 줄만 수정.
const MODEL = "gemini-3.1-flash-lite";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const ANALYZE_PROMPT = `너는 음식 사진에서 개별 음식 항목과 양을 추정하는 영양 분석 전문가다.
- 사진 속 음식을 항목별로 나누고, 셀 수 없는 항목은 그램(g)으로 양을 추정하라.
- 한국 음식(한식)을 특히 정확히 인식하라.
- 각 항목과 전체(total)에 대해 kcal, 단백질(g), 탄수화물(g), 지방(g)을 추정하라.
- 불확실하면 보수적으로 범위 중간값을 쓰고, 어디까지나 사진 기반 근사치임을 전제하라.
- 반드시 아래 JSON 스키마로만, 다른 설명 없이 JSON만 출력하라.

{
  "items": [
    { "name": "김치찌개", "qty": "1 그릇(약 400g)", "kcal": 240, "protein_g": 16, "carb_g": 12, "fat_g": 13 }
  ],
  "total": { "kcal": 650, "protein_g": 28, "carb_g": 70, "fat_g": 22 },
  "confidence": "low | medium | high",
  "notes": "사진만으로 추정한 근사값"
}`;

export async function analyzeMeal(
  imageBase64: string,
  mimeType: string,
): Promise<MealEstimate> {
  const res = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType, data: imageBase64 } },
          { text: ANALYZE_PROMPT },
        ],
      },
    ],
    config: { responseMimeType: "application/json", temperature: 0.2 },
  });

  return parseEstimate(res.text ?? "");
}

// 코드펜스 제거 후 안전 파싱 + 최소 정규화.
function parseEstimate(raw: string): MealEstimate {
  const cleaned = raw
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();

  const data = JSON.parse(cleaned) as Partial<MealEstimate>;

  const items: MealItem[] = Array.isArray(data.items)
    ? data.items.map((it) => ({
        name: String(it?.name ?? "음식"),
        qty: String(it?.qty ?? ""),
        kcal: num(it?.kcal),
        protein_g: num(it?.protein_g),
        carb_g: num(it?.carb_g),
        fat_g: num(it?.fat_g),
      }))
    : [];

  const total = data.total ?? sumItems(items);

  return {
    items,
    total: {
      kcal: num(total.kcal),
      protein_g: num(total.protein_g),
      carb_g: num(total.carb_g),
      fat_g: num(total.fat_g),
    },
    confidence:
      data.confidence === "high" || data.confidence === "medium"
        ? data.confidence
        : "low",
    notes: String(data.notes ?? "사진 기반 추정치"),
  };
}

function num(v: unknown): number {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}

function sumItems(items: MealItem[]): MealTotalsLike {
  return items.reduce(
    (acc, it) => ({
      kcal: acc.kcal + it.kcal,
      protein_g: acc.protein_g + it.protein_g,
      carb_g: acc.carb_g + it.carb_g,
      fat_g: acc.fat_g + it.fat_g,
    }),
    { kcal: 0, protein_g: 0, carb_g: 0, fat_g: 0 },
  );
}

type MealTotalsLike = {
  kcal: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
};
