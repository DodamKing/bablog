# 밥로그 (BabLog)

> 사진 한 장으로 끼니를 기록하는 **개인용 PWA 칼로리·식단 트래커**.
> 판매·배포가 아니라 **내가 편하게 쓰려고** 만드는 도구. 안드로이드 전용.

---

## 이 문서 세트는 무엇인가

이 폴더는 **구현 핸드오프 문서**다. 코드는 아직 한 줄도 없다.
미래의 작업자(=다음 세션의 Claude)가 이 문서만 읽고 바로 구현을 시작할 수 있도록,
결정·구조·스키마·단계를 **얕은 문서 여러 개로 쪼개** 정리해 두었다.

### 핵심 원칙
- **한 문서에 다 쌓지 않는다.** 작업에 필요한 문서 2~4개만 골라 읽는다 (토큰 절약).
- **결정은 다시 논쟁하지 않는다.** 이미 내린 결정은 `01-decisions.md`에 이유까지 박혀 있다. 뒤집을 땐 거기에 새 결정으로 추가만 한다.
- **진행 상태는 `PROGRESS.md` 하나로만 관리한다.** 작업 끝낼 때마다 거기 갱신.

---

## 어떤 작업이면 어떤 문서를 읽나 (토큰 관리 가이드)

| 하려는 일 | 읽을 문서 |
|---|---|
| 프로젝트 처음 파악 | `00-overview.md` + `01-decisions.md` |
| 코드 짜기 시작 (공통) | `00`, `01`, `04-tech-stack.md`, 그리고 해당 Phase의 작업 |
| DB / 스키마 작업 | `03-data-model.md` |
| 사진 분석·AI 기능 | `06-ai-pipeline.md` |
| PWA 설치·매니페스트 | `07-pwa-setup.md` |
| 푸시 알림 | `08-push-notifications.md` |
| "다음에 뭐 하지?" | `PROGRESS.md` → `09-roadmap.md` |

**구현 세션을 시작하는 Claude에게:** 전부 읽지 마라. 위 표에서 지금 Phase에 해당하는 것만 읽어라.

---

## 문서 지도

| 파일 | 한 줄 설명 | 성격 |
|---|---|---|
| `docs/00-overview.md` | 비전·목표·범위·비목표 | 거의 안 바뀜 |
| `docs/01-decisions.md` | 모든 결정과 그 이유 (ADR) | 추가만 함 |
| `docs/02-architecture.md` | 시스템 구조·데이터 흐름·인증 | 가끔 갱신 |
| `docs/03-data-model.md` | Neon/Postgres 스키마 (drizzle) | 스키마 바뀌면 갱신 |
| `docs/04-tech-stack.md` | 스택·라이브러리·env·폴더구조 | 가끔 갱신 |
| `docs/05-features.md` | 화면별 기능 명세 | 기능 추가 시 갱신 |
| `docs/06-ai-pipeline.md` | Gemini 호출·프롬프트·JSON 스키마 | 프롬프트 튜닝 시 갱신 |
| `docs/07-pwa-setup.md` | manifest·service worker·설치 | 거의 안 바뀜 |
| `docs/08-push-notifications.md` | VAPID·구독·Cron·발송 | Phase 4에서 사용 |
| `docs/09-roadmap.md` | Phase별 빌드 계획·작업 단위 | Phase 진행 시 체크 |
| `PROGRESS.md` | 현재 상태·다음 작업·변경 로그 | **매 작업마다 갱신** |

---

## 한 줄 요약 스택

Next.js (App Router, TS) · Tailwind · drizzle-orm · Neon(Postgres) · Gemini 2.0 Flash · Recharts · PWA(manifest+service worker) · Vercel 배포 · 푸시는 Vercel Cron + web-push
