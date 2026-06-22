# 02 · 아키텍처 (Architecture)

## 큰 그림

```
[안드로이드 크롬 / 설치된 PWA]
        │
        │  ① 음식 사진 업로드
        ▼
[Next.js App Router (Vercel)]
   ├── 페이지 (React, Tailwind, Recharts)
   ├── /api/analyze   → Gemini 2.0 Flash 호출, JSON 추정 반환
   ├── /api/meals     → CRUD (drizzle → Neon)
   ├── /api/weight    → 체중 CRUD
   ├── /api/report    → 누적 기록 요약 → Gemini로 보고서/조언
   └── /api/push/*    → 구독 저장 + (Cron이 호출하는) 발송 엔드포인트
        │
        ▼
[Neon Postgres]  ← drizzle-orm
        ▲
        │  ② Vercel Cron이 정해진 시간에 /api/push/send 호출
[Vercel Cron]
```

## 데이터 흐름 (기록 루프)
1. 사용자가 카메라/갤러리로 사진 선택 → 클라이언트가 `/api/analyze`로 전송 (base64 또는 multipart).
2. 서버가 Gemini 2.0 Flash에 사진+프롬프트 전송 → `{ items, kcal, protein, carb, fat ... }` JSON 수신.
3. 클라이언트에 추정값 표시 → **사용자가 보정 화면에서 숫자 수정** (정확도 방어선).
4. "저장" → `/api/meals` POST → drizzle로 Neon insert.
5. 히스토리/차트 화면은 `/api/meals`(기간 쿼리)로 읽어 Recharts로 렌더.

## 보고서 흐름
- `/api/report?range=week|month` → 해당 기간 meals/weight 집계 → 요약 컨텍스트를 Gemini에 전달 → 자연어 보고서 + 조언 텍스트 반환. (상세 프롬프트는 `06`.)

## 푸시 흐름 (Phase 4)
- 권한 허용 시 클라이언트가 `PushSubscription`을 `/api/push/subscribe`에 저장.
- Vercel Cron이 스케줄(예: 12:30, 19:30 KST)에 `/api/push/send` 호출.
- 발송 핸들러가 Neon에서 "오늘 기록 존재 여부" 확인 → 없으면만 `web-push`로 발송. (상세는 `08`.)

## 인증 전략 (D7 구체화)
단일 사용자라 풀 인증은 과함. 다음 중 하나로 가볍게:
- **권장(구현됨):** Next.js `proxy.ts`(Next.js 16부터 `middleware.ts`의 새 이름, D13 참고)에서 쿠키의 단일 패스코드 검증. 최초 진입 시 `/unlock` 페이지에서 환경변수 `APP_PASSCODE`와 대조 → 일치하면 장기 만료 httpOnly 쿠키 발급. 이후 모든 라우트 통과.
- Cron이 호출하는 `/api/push/send`는 별도로 `CRON_SECRET` 헤더로 보호 (Vercel Cron이 자동 첨부하는 Authorization 사용).
- 목적은 "검색·우연 노출 차단" 수준. 고보안 아님.

## 폴더 구조 (제안)
```
app/
  (app)/
    page.tsx              # 기록(카메라) 홈
    history/page.tsx      # 일/주/월 차트
    weight/page.tsx       # 체중 입력 + 추세
    report/page.tsx       # 보고서 + AI 조언
  unlock/page.tsx
  api/
    analyze/route.ts
    meals/route.ts
    weight/route.ts
    report/route.ts
    push/subscribe/route.ts
    push/send/route.ts
lib/
  ai/                     # LLM 어댑터 (모델 교체 지점)
  db/                     # drizzle 스키마 + 클라이언트
  push/
components/               # 하단 탭 네비, 카메라 입력, 차트 래퍼 등
proxy.ts                  # Next.js 16: middleware.ts의 새 이름 (D13)
public/
  manifest.webmanifest
  sw.js                   # 또는 next-pwa가 생성
```
