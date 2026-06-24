# PROGRESS · 진행 상태

> **매 작업마다 여기를 갱신한다.** 세션 시작 시 이 파일부터 읽는다.

## 현재 상태
- **단계:** **Phase 0·1·1.5·2·3 코드 완료.** Phase 1.5/2는 폰에서 PWA 설치·차트 렌더 확인 완료(2026-06-24). Phase 3: 기간 집계(`lib/report/summarize.ts`) + `generateReport`(`lib/ai/gemini.ts`, 직전 기간 비교 포함) + `/api/report`(GET=조회+stale판단, POST=생성) + 돌아보기 화면(주/월 토글, 통계 카드, "밥로그의 한마디"). **실사용 중 발견한 문제(탭 이동하면 결과 사라짐) 보완 — `reports` 테이블에 기간당 최신 1개씩 저장**, AI 호출 자체는 여전히 캐싱 안 함(누를 때만 호출). **남은 건 폰에서 실제 데이터로 확인.**
- **다음 작업:** Phase 3 폰 확인 후 **Phase 4(푸시 알림)**. 읽을 문서: `08`.
- **구현 코드:** Next.js 16.2.9. 카카오 로그인(D16)·기록 루프(사진→분석→보정→저장)·R2 사진 보관·**Vercel 배포(bablog.dimad.kr) 동작 확인**. UI 리디자인(D14 톤, Jua+크림+코랄+🍚). 사진 리사이즈/EXIF 제거. dev 로그인 우회(`DEV_AUTH_BYPASS`). 보정 화면 D18 리팩터(끼니 선택 + 항목별 양/단위 스테퍼 + 삭제 되돌리기 + 비음식 가드). **수동 입력(D18): 식약처 라이브 API 검색(`/api/foods/search`) + AI 텍스트 폴백(`/api/foods/estimate`) + 검색 UI(보정 화면 재사용, 음식 더 추가).** 식약처는 방식 A 라이브 호출 확정(D18 갱신).

## Phase 체크
- [x] Phase 0 · 프로젝트 셋업 (Neon·Vercel·카카오 로그인 완료)
- [x] Phase 1 · 기록 루프 (사진 기록 + 수동 입력 + R2 + E2E 저장 동작 확인)
- [x] Phase 1.5 · PWA화 (브랜딩·manifest·SW, 폰 설치 확인 완료)
- [x] Phase 2 · 조회 (히스토리+체중, 폰 확인 완료. 수정/삭제는 백로그)
- [~] Phase 3 · 보고서 + AI 조언 (코드 완료, 폰 확인 대기)
- [ ] Phase 4 · 푸시 알림

## 결정 대기 (착수 시 정할 것)
(현재 없음 — 새 결정 대기 항목 생기면 여기 추가)

## 변경 로그
| 날짜 | 내용 |
|---|---|
| 2026-06-24 | **Phase 3 보강: 직전 기간 1개 → 최근 추이(N개)로 확장.** "AI가 DB에 쌓인 걸 학습하는 거 아니냐"는 질문에 답하며 설계 변경 — `generateReport`의 두 번째 인자를 `previousAvg: ReportAverage` 하나에서 `trend: ReportTrendPoint[]`(기본 4개 기간, `TREND_BUCKETS`)로 교체. `app/api/report/route.ts`의 `loadTrend()`가 `meals`를 이번 기간 이전 4개 기간만큼 넓게 한 번에 조회해 기간별로 버킷 나눠 평균 계산(데이터 없는 버킷은 건너뜀) — 새 테이블 없이 기존 영구 데이터 재사용. `lib/report/summarize.ts`의 `dayKey`를 export로 바꿔 날짜 range 포맷 재사용. 실제 계정(기록 2일치, 추이 데이터 없음)으로 호출해 에러 없이 정상 동작(추이 언급 없이 보고서만 나옴) 확인. 문서: `06`(B 섹션 갱신) · `09`. **별개로:** `next.config.ts`의 `allowedDevOrigins`에 사용자가 모바일 테스트용으로 직접 추가한 IP를 제가 "자동으로 끼어든 부작용"으로 잘못 판단해 두 번 되돌렸던 것 — 사용자 정정 받고 복구함(직접 추가한 값이었음, 자동 변경 아니었음). |
| 2026-06-24 | **Phase 3 보강: 보고서 결과 저장 + 직전 기간 비교.** 실사용 테스트 중 "생성 후 탭 넘어가면 사라짐" 발견 → `reports` 테이블 추가(기간당 최신 1개, `user_id`+`period_label` unique). `lib/report/summarize.ts`에 `averageOf`(평균 계산)·`summaryFingerprint`(jsonb 키 순서 불확실성 피하려고 평문 키로 비교) 추가. `/api/report` GET 신설(라이브 집계 + 저장된 결과 비교해 `stale`만 알려줌, AI 호출 없음) / POST는 그대로 명시적 클릭에서만 AI 호출+upsert. `generateReport`에 직전 기간 평균(선택) 인자 추가해 "지난주보다 늘었다/줄었다" 비교 가능하게(새 테이블 없이 기존 쿼리 확장). `drizzle-kit push`로 Neon에 `reports` 테이블 반영. eslint `react-hooks/set-state-in-effect` 지적 받아 페이지의 setState 위치 조정. 빌드/린트 통과 + curl로 GET/POST 흐름 실제 확인(생성 직후 재조회 시 동일 결과·`stale:false` 확인). 문서: `03`(`reports` 테이블 추가)·`06`(B 섹션 설계 갱신)·`09`(Phase 3 체크 갱신). |
| 2026-06-24 | **Phase 3 구현(보고서 + 밥로그의 한마디).** 폰에서 Phase 1.5/2 확인 완료 후 진행. `lib/ai/types.ts`에 `ReportPeriodSummary` 추가, `lib/report/summarize.ts`(끼니·체중 원본 → 일별 집계), `lib/ai/gemini.ts`에 `generateReport()`(회고·응원 톤 프롬프트, JSON 아니라 평문) 추가. `app/api/report/route.ts`(POST, 기간 7/30일 조회+집계+AI 호출), `app/(app)/report/page.tsx`(주/월 토글 + 통계 카드 + "밥로그의 한마디" 카드, 기존 빈 화면 워딩 유지). **캐싱 안 하기로 결정**(`01`/`09` 갱신, 미해결 항목 제거) — 누를 때마다 새로 생성. `npm install`로 누락된 의존성(next-auth/recharts/@google/genai/@aws-sdk 등) 복구 후 `tsc --noEmit`·`next build`·`eslint` 모두 통과. 폰 확인 대기. |
| 2026-06-24 | **요구사항 수집 보강(구현 안 함, 참고 앱 스샷 기반).** 앞 항목들 구체화: ① `food_cache`를 "캐시"가 아니라 **전역 공유 영구 DB(`foods`)로 확정** — 음식 영양정보는 개인정보 아니라 D16(멀티유저 격리)과 무관, 즐겨찾기(`user_favorite_foods`)·사용횟수(`usage_count`)도 추가 ② 목표 칼로리는 **코드 계산 확정** + BMI·순탄수·TDEE·매크로 목표g·체중변화량까지 계산값 세트로 확장(`03` "계산값" 신설), `user_profiles`에 목표(`goal_type`/`target_weight_kg`/`weekly_rate_kg`) 필드 추가 ③ 보상(딸기)은 사용처 미정이지만 **`reward_ledger` 테이블은 선제 준비**하기로 함 ④ "기록 홈" 대시보드 강화 아이디어 추가(목표 대비·소모량·순탄수·당류나트륨·체중변화·보상을 한 화면에) ⑤ 운동/활동 기록은 범위 크다고 보고 일단 보류, 미해결로만 기록. 반영: `01`(미해결 갱신)·`03`(`foods`/`user_favorite_foods`/`reward_ledger`/계산값 추가)·`05`(기록 홈 대시보드·보조기능 갱신)·`06`(조회 우선순위 갱신)·`09`(Phase 5+ 백로그 갱신). |
| 2026-06-24 | **요구사항 수집(구현 안 함).** 사용자가 다음 아이디어를 제시 → 문서에 백로그/미해결로 기록: ① 반복 AI 호출 절감용 자체 음식 캐시(`food_cache`) ② 음식별 영양정보 확장(나트륨/당류 등) ③ 끼니 태그(아침/점심/저녁/간식) 모아보기 ④ 끼니 상세보기+수정 ⑤ 사진 가로/세로 비율 버그 ⑥ AI 인식+DB 영양정보 하이브리드 매칭 ⑦ BMR/TDEE 기반 목표 칼로리 계산(신체정보 입력) ⑧ 보상 시스템(딸기 적립, 인아웃 사과 참고 — D14와 관계 재검토 필요). 반영: `01`(미해결 4건 추가) · `03`(`food_cache`/`user_profiles` 테이블 제안) · `05`(히스토리 절·보조기능 목록) · `06`(조회 우선순위·하이브리드 파이프라인) · `09`(Phase 5+ 백로그). 사용자가 인아웃 보상 화면 스크린샷을 추후 공유 예정. |
| (초기) | 핸드오프 문서 세트 작성. 프로젝트명 밥로그 확정. 스택·아키텍처·스키마·로드맵 정리. |
| 2026-06-23 | **Phase 2 조회 구현.** 히스토리(`/history`): 일/주/월 토글, 일=날짜이동+합계+끼니리스트(썸네일), 주/월=일별 kcal 막대(Recharts). 체중(`/weight`): 입력폼+`/api/weight`(GET/POST)+기간토글 추세 라인차트+최근리스트. `recharts@3.8.1` 설치(React19 호환, v2 불가). `/api/meals?days=N` 서버 기간조회 추가(월간 100건 상한 문제 해소). 보고서 빈화면 워딩 변경(돌아보기/밥로그의 한마디, D14톤). 수정/삭제는 백로그. 빌드 통과. |
| 2026-06-23 | **앱 느낌 UX 패스(설치 후 피드백).** globals.css: `overscroll-behavior:none`(당겨서 새로고침·바운스 제거), 탭 하이라이트/선택 제거(입력칸 예외), 스크롤바 숨김. viewport `viewportFit:cover` + 하단탭/본문 `env(safe-area-inset-bottom)`. **뒤로가기 정리:** 하단탭 `replace`(히스토리 안 쌓임 → 탭 어디서든 뒤로 1번에 종료), 기록 페이지 하위화면(분석/검색/보정)은 history 트랩+popstate로 뒤로가기=닫기(입력 보존, 페이지 이탈 방지). 종료 확인 다이얼로그는 안 넣음(안티패턴). |
| 2026-06-23 | **Phase 1.5 PWA·브랜딩 구현.** Gemini 생성 마스코트(`assets/brand/mascot.png`)의 배경이 투명이 아니라 회색 체커가 픽셀로 박혀 있어 가장자리 플러드필로 제거→`mascot-clean.png`. 거기서 sharp로 파비콘(`app/icon.png`)·PWA 192/512/maskable(`public/icons/`) 파생, OG(`app/opengraph-image.tsx`: 크림+마스코트+Jua "밥로그", 구글폰트 TTF 런타임 로드). `app/manifest.ts`+viewport(theme #FFF8F0), `public/sw.js`(셸 캐싱)+`ServiceWorkerRegister`(prod)+next.config sw 헤더. **프록시 matcher에 opengraph-image/icon.png 공개 제외 추가**(누락 시 카톡 크롤러가 로그인으로 리다이렉트됨). 빌드·로컬 서빙 확인. |
| 2026-06-23 | **수동 입력(D18) 구현 + Phase 0 완료 처리.** 식약처 라이브 API 재검증 → 이전 "0건"은 한글 URL 미인코딩 아티팩트였고 실제론 정상(김치찌개 356·비빔밥 718건, 부분매칭, 30만 건). **방식 A(라이브 호출) 확정**(B 자체 import 불필요). 필드 매핑 확정(AMT_NUM1=kcal/3=단백/4=지방/6=탄수, SERVING_SIZE 기준, Z10500=1회중량). `lib/food/`(foodApi+types), `/api/foods/search`, `/api/foods/estimate`(AI 폴백), 기록 홈에 검색 UI(보정 화면 재사용·음식 더 추가). 구어체 별칭(공기밥/맨밥/흰밥/밥→쌀밥). 수동 검색 저장 E2E 확인. 빌드 통과. **Phase 0**은 사용자 확인(카카오 로그인·Vercel 배포)으로 완료 처리. 자동완성은 백로그로. |
| 2026-06-23 | **UI 리디자인(D14)·사진 리사이즈·dev 우회·배포(bablog.dimad.kr).** 이어서 **D18 입력개선:** 끼니 분류(meal_type) + 항목별 양/단위 스테퍼 + 삭제 되돌리기(스택) + 비음식 가드 + g→사람단위 프롬프트. **수동입력용 식약처 API 키 발급·활성화 확인**(검색 매칭·응답필드 확인은 다음 세션). |
| 2026-06-23 | **Phase 1 기록 루프 구현.** Gemini 어댑터(`lib/ai/`, 3.1 Flash Lite, D11 확정)·R2 사진 보관(D17)·`/api/analyze`·`/api/meals`(user_id 스코프)·기록 홈 카메라 플로우·하단 탭 네비·조회 화면 골격. `@google/genai`·`@aws-sdk/client-s3` 설치, 모델 id 동작 검증, 빌드 통과. R2 자격증명·브라우저 E2E는 미완. |
| 2026-06-23 | **멀티유저 인증 골격 구현.** Auth.js v5(next-auth@beta, Next 16 호환 확인) + 카카오 provider + `@auth/drizzle-adapter` + JWT 세션. 스키마에 users/accounts/sessions/verification_tokens + meals·weight_logs에 `user_id` FK 추가. `proxy.ts` 인증 게이트로 교체, `/login` 추가, `/unlock`·`APP_PASSCODE` 제거, `requireUserId()` DAL 추가. **Neon 싱가포르 `db:push` 완료(6테이블)**, 프로덕션 빌드 통과. 카카오 자격증명은 미입력. |
| 2026-06-23 | **멀티유저 전환 결정(D16)** — 완전 1인용 → 본인+지인 몇 명이 각자 독립 데이터로 쓰는 무료 멀티유저. D7(단일 패스코드)·`00` 비목표/제약 갱신. 스키마에 `users`+`user_id` 추가 예정, 로그인 방식 미정. |
| 2026-06-23 | 비주얼 톤 방향(D14: 골격은 관습대로, 스킨만 귀엽게)과 목표 설정 방침(D15: kcal 목표 대신 체중 목표를 Phase 2에서 검토) 결정. `09` Phase 2에 체중 목표 검토 항목 추가. |
| 2026-06-22 | Phase 0 착수. `create-next-app`으로 Next.js 16.2.9 스캐폴딩(로컬 git만, GitHub 원격 미연동). drizzle-orm/drizzle-kit 설치, `lib/db/schema.ts`(meals, weight_logs) 작성. Next 16의 `middleware.ts→proxy.ts` 네이밍 변경 확인 후 `proxy.ts`+`/unlock`으로 패스코드 잠금 구현. 개인 프로젝트임을 재확인(D12), Next.js는 항상 최신 버전 사용(D13), AI 모델은 Gemini 3.1 Flash Lite로 잠정 변경(D11). Neon DB·GitHub 원격 연동은 보류. |

---

### 다음 세션의 나에게 (Quick Start)
1. 이 파일 → `09-roadmap.md`에서 현재 Phase 확인.
2. 그 Phase의 "읽을 문서"만 읽기.
3. 작업 후 이 파일 갱신.
4. 막히면 `01-decisions.md`로 "왜 이렇게 정했는지" 확인.
