import "server-only";
import { GoogleGenAI } from "@google/genai";
import type { MealEstimate, MealItem, ReportPeriodSummary, ReportTrendPoint } from "./types";
import { averageOf } from "@/lib/report/summarize";

// ── 모델 교체 지점 (D11) ── 변경 시 여기 한 줄만 수정.
const MODEL = "gemini-3.1-flash-lite";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const ANALYZE_PROMPT = `너는 음식 사진에서 개별 음식 항목과 양을 추정하는 영양 분석 전문가다.
- 사진 속 음식을 항목별로 나눠라. 한국 음식(한식)을 특히 정확히 인식하라.
- 각 항목의 양을 "amount"(숫자)와 "unit"으로 표현하되, **사람이 직관적으로 아는 단위**를 우선하라:
  밥·찌개·국·반찬 등 일반 음식은 공기/그릇/인분, 과일·빵 등은 개/조각, 음료는 ml/컵.
  g은 **무게로 재는 음식(고기, 견과류 등)에만** 쓰고, 그 외엔 되도록 쓰지 마라.
- 각 항목의 kcal·단백질(g)·탄수화물(g)·지방(g)은 **그 amount 기준**으로 추정하라.
- total은 모든 항목의 합이다.
- 사진에 음식이 없거나 음식을 식별할 수 없으면 items를 빈 배열 []로, total은 모두 0으로 반환하라.
- 불확실하면 보수적으로 범위 중간값을 쓰고, 어디까지나 사진 기반 근사치임을 전제하라.
- 반드시 아래 JSON 스키마로만, 다른 설명 없이 JSON만 출력하라.

{
  "items": [
    { "name": "김치찌개", "amount": 400, "unit": "g", "kcal": 240, "protein_g": 16, "carb_g": 12, "fat_g": 13 },
    { "name": "공기밥", "amount": 1, "unit": "공기", "kcal": 310, "protein_g": 6, "carb_g": 68, "fat_g": 1 }
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

// 수동 입력 폴백(D18): DB(식약처)에 없는 음식을 이름만으로 추정.
const TEXT_PROMPT = `너는 음식 이름(텍스트)만 보고 흔한 1인분 기준 영양을 추정하는 전문가다.
- 입력한 음식을 보통 어떻게 먹는 1인분 양(amount + 사람이 아는 unit: 그릇/공기/개/조각/인분/ml 등)으로 추정하라. g은 무게로 재는 음식에만.
- kcal·단백질(g)·탄수화물(g)·지방(g)은 그 amount 기준으로 추정하라. total은 항목 합.
- 보통 한 가지 음식이지만, "라면+김밥"처럼 여러 개면 항목을 나눠라.
- 음식이 아니거나 추정 불가면 items를 빈 배열 []로 반환하라.
- 반드시 아래 JSON 스키마로만, 다른 설명 없이 출력하라.

{
  "items": [
    { "name": "신라면", "amount": 1, "unit": "그릇", "kcal": 500, "protein_g": 10, "carb_g": 79, "fat_g": 16 }
  ],
  "total": { "kcal": 500, "protein_g": 10, "carb_g": 79, "fat_g": 16 },
  "confidence": "low | medium | high",
  "notes": "이름 기반 추정값"
}`;

export async function estimateMealFromText(
  text: string,
): Promise<MealEstimate> {
  const res = await ai.models.generateContent({
    model: MODEL,
    contents: [
      { role: "user", parts: [{ text: `${TEXT_PROMPT}\n\n음식: ${text}` }] },
    ],
    config: { responseMimeType: "application/json", temperature: 0.2 },
  });

  return parseEstimate(res.text ?? "");
}

// 보고서(06-B, Phase 3): 기간 집계를 받아 "밥로그의 한마디"를 자연어로.
// 톤(09 Phase 3 확정): 회고·응원, "조언/평가"식 훈수 금지. JSON 아니라 평문 텍스트라 responseMimeType 안 씀.
const REPORT_PROMPT = `너는 "밥로그" 앱의 마스코트야. 사용자의 한 주/달 식사 기록을 보고 다정하게 한마디 건네는 역할이다.
- 입력으로 받은 기간 집계(일별 kcal/매크로, 체중 추세)를 바탕으로 사실 중심으로 짧게 요약하라: 평균 섭취량, 매크로 분포, 끼니 패턴(데이터에 드러나는 점만), 체중 변화와의 연결(체중 데이터가 있을 때만).
- 최근 추이(과거 여러 기간의 평균)가 같이 주어지면 자연스럽게 한 줄로 언급해도 좋다 — 한두 개면 "직전보다 늘었다/줄었다/비슷하다", 여러 개면 전체적인 흐름(꾸준히 늘어남/줄어듦/오르내림)으로. 주어지지 않으면 비교 언급하지 마라.
- 조언은 균형 잡히고 비강압적으로. 극단적 칼로리 제한·단식·특정 음식 금지 같은 강한 처방 금지. "이렇게 해야 한다"는 훈수·평가 톤 금지 — 다정하게 회고하고 응원하는 톤으로.
- 의학적 단정·진단 금지. 필요하면 "전문가와 상담해보는 것도 좋아요" 정도만 가볍게.
- 해요체로, 2~4문단의 짧은 자연어로. 제목·markdown 기호 없이 본문만 출력하라.
- 기록이 며칠 안 되면 평가하지 말고 "조금 더 모이면 더 잘 보일 거예요" 같은 가벼운 톤으로.`;

export async function generateReport(
  summary: ReportPeriodSummary,
  trend: ReportTrendPoint[] = [],
): Promise<string> {
  const res = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [{ text: `${REPORT_PROMPT}\n\n${formatSummaryForPrompt(summary, trend)}` }],
      },
    ],
    config: { temperature: 0.7 },
  });

  return (res.text ?? "").trim();
}

function formatSummaryForPrompt(s: ReportPeriodSummary, trend: ReportTrendPoint[]): string {
  const lines = [`기간: 이번 ${s.periodLabel}`, "", "일별 기록:"];

  for (const d of s.days) {
    lines.push(
      `${d.date}: ${Math.round(d.kcal)}kcal (단백 ${round1(d.protein_g)}g/탄수 ${round1(d.carb_g)}g/지방 ${round1(d.fat_g)}g), 끼니 ${d.mealCount}회`,
    );
  }

  const avg = averageOf(s.days);
  if (avg) {
    lines.push(
      "",
      `평균(기록한 ${avg.recordedDays}일 기준): ${avg.avgKcal}kcal, 단백 ${avg.avgProteinG}g, 탄수 ${avg.avgCarbG}g, 지방 ${avg.avgFatG}g`,
    );
  }

  if (trend.length > 0) {
    lines.push("", "최근 추이(오래된 기간 → 최근 기간 순, 이번 기간 제외):");
    for (const t of trend) {
      lines.push(
        `${t.rangeStart}~${t.rangeEnd}: ${t.avgKcal}kcal (단백 ${t.avgProteinG}g, 기록 ${t.recordedDays}일)`,
      );
    }
  }

  if (s.weightPoints.length >= 2) {
    const first = s.weightPoints[0];
    const last = s.weightPoints[s.weightPoints.length - 1];
    lines.push(
      "",
      `체중 추세: ${first.date} ${first.weightKg}kg → ${last.date} ${last.weightKg}kg (변화 ${round1(last.weightKg - first.weightKg)}kg)`,
    );
  }

  return lines.join("\n");
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
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
        amount: num(it?.amount) || 1,
        unit: String(it?.unit ?? "인분"),
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
