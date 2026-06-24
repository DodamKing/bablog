# 04 · 기술 스택 (Tech Stack)

## 스택 목록
| 영역 | 선택 | 역할 |
|---|---|---|
| 프레임워크 | Next.js (App Router, TypeScript) | 프론트 + API routes 한 몸 |
| 스타일 | Tailwind CSS | 모바일 퍼스트 UI |
| ORM | drizzle-orm + drizzle-kit | Neon 접근, 마이그레이션 |
| DB | Neon (Postgres, serverless) | 모든 기록 |
| AI | Gemini 3.1 Flash Lite (`@google/generative-ai`, D11, 잠정) | 사진 분석, 보고서 |
| 차트 | Recharts | 일/주/월·체중 차트 |
| PWA | `next-pwa` 또는 수동 manifest+sw | 설치·오프라인·푸시 |
| 푸시 | `web-push` (VAPID) | 알림 발송 (Phase 4) |
| 스케줄 | Vercel Cron | 정시 푸시 트리거 (Phase 4) |
| 배포 | Vercel | 호스팅 + Cron |

> **버전:** 개인 프로젝트라 레거시 호환 부담 없음 (D12) — 항상 착수 시점 최신 안정 버전 사용 (D13). 2026-06-22 스캐폴딩 기준 Next.js 16.2.9, React 19.2.4.
> Next.js 16은 `middleware.ts`가 `proxy.ts`로 바뀌는 등 breaking change가 있음 — 다음 세션도 코드 작성 전 `node_modules/next/dist/docs/`로 현재 컨벤션을 확인할 것 (`AGENTS.md` 참고).

## 환경 변수 (.env)
```
DATABASE_URL=postgres://...neon...        # Neon 연결 문자열
GEMINI_API_KEY=...                         # Google AI Studio 키
APP_PASSCODE=...                           # 단일 사용자 잠금 (02 인증)
CRON_SECRET=...                            # Vercel Cron 보호 (Phase 4)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...           # 푸시 (Phase 4) — 클라이언트 subscribe에서도 읽어야 해서 NEXT_PUBLIC_ 접두
VAPID_PRIVATE_KEY=...                       # 푸시 (Phase 4)
VAPID_SUBJECT=mailto:you@example.com        # 푸시 (Phase 4)
# (사진 보관 시) BLOB_READ_WRITE_TOKEN=...   # Vercel Blob
```

## 라이브러리 설치 메모
- `@google/generative-ai` — Gemini SDK. (Phase 1, 미설치)
- [x] `drizzle-orm`, `drizzle-kit`, `@neondatabase/serverless`, `dotenv` (Phase 0에서 설치 완료). `db:generate`/`db:migrate`/`db:push`/`db:studio` npm 스크립트 등록됨.
- `recharts` (Phase 2, 미설치).
- [x] `web-push`, `@types/web-push` (Phase 4 설치 완료).
- `next-pwa` 쓸지 수동 SW 쓸지는 `07`에서 결정.

## 코드 컨벤션
- AI 호출은 `lib/ai/`에 어댑터로 격리 → 모델 교체 시 한 군데만 수정 (D5).
- DB 접근은 `lib/db/`의 drizzle 클라이언트만 통해서.
- API route는 얇게, 로직은 `lib/`로.
- 모바일 퍼스트: 모든 화면을 폰 세로 기준으로 먼저 설계. 하단 탭 네비 고정.
- 단위 일관성: 영양소는 g, 에너지는 kcal로 통일. DB도 동일.

## 폴더 구조
`02-architecture.md`의 폴더 구조 섹션 참고.
