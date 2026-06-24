# 09 · 로드맵 (Roadmap)

> Phase 단위로 쪼개 **한 세션에 한 Phase**씩 구현. 토큰 관리를 위해, 각 Phase에 "읽을 문서"를 명시.
> 끝낼 때마다 `PROGRESS.md` 갱신. 한 Phase 안에서도 작업이 크면 더 잘게 나눠서.

---

## Phase 0 · 프로젝트 셋업
**읽을 문서:** `00`, `01`, `04`
- [x] Next.js(App Router, TS, 16.2.9) + Tailwind 초기화
- [x] `lib/db/schema.ts`에 `meals`, `weight_logs` 정의 (drizzle 패키지 설치 + `drizzle.config.ts` 작성)
- [x] ~~단일 사용자 잠금(패스코드)~~ → 멀티유저 인증으로 교체(D16): Auth.js v5 + 카카오 + Drizzle 어댑터, JWT 세션. `proxy.ts` 게이트 + `/login` + `requireUserId()` DAL.
- [x] drizzle + Neon 실제 연결(싱가포르), `db:push` 첫 마이그레이션 — users/accounts/sessions/verification_tokens + meals/weight_logs(user_id)
- [x] 카카오 개발자 앱 등록 → `AUTH_KAKAO_ID`/`AUTH_KAKAO_SECRET` + 리다이렉트 URI → 로그인 동작 확인 (사용자 확인)
- [x] Vercel 배포 파이프라인 확인 (bablog.dimad.kr 동작)
- **완료 기준:** 카카오 로그인 통과 → 빈 앱이 뜨고, 사용자별 데이터 격리 준비됨. Vercel 배포 확인.

## Phase 1 · 기록 루프 (핵심 MVP)
**읽을 문서:** `02`, `03`, `04`, `06`(A), `05`(1번 화면)
- [x] `lib/ai/` Gemini 어댑터: `analyzeMeal(image)` → JSON (3.1 Flash Lite, 모델 id 검증됨)
- [x] `/api/analyze` route
- [x] 기록 홈: 카메라 입력 → 분석 → **보정 화면** → 저장
- [x] `/api/meals` POST/GET (user_id 스코프)
- [x] 사진 보관 결정(D17: Cloudflare R2) + `lib/storage/r2.ts` (자격증명 입력 대기)
- [x] 하단 탭 네비 뼈대(기록/히스토리/체중/보고서 라우트만)
- [x] 수동 입력(D18): 식약처 라이브 검색 + AI 폴백 + 검색 UI(보정 화면 재사용)
- [x] R2 자격증명 입력 + 브라우저에서 전체 플로우 E2E 확인 (저장→DB 동작 확인)
- **완료 기준:** 폰에서 사진 찍어/검색해서 보정 후 저장 → DB에 들어감.

## Phase 1.5 · PWA화 (앱처럼 설치)
**읽을 문서:** `07`
- [x] **브랜딩 패스** — 마스코트 1장(`assets/brand/mascot.png`, 체커배경 플러드필 제거→`mascot-clean.png`)에서 sharp로 파생: 파비콘(`app/icon.png`), PWA 아이콘(192/512/maskable, `public/icons/`), OG(`app/opengraph-image.tsx`, 1200×630, 마스코트+Jua "밥로그" 합성). 기본 favicon.ico 제거.
  - 안드로이드 전용(D2)이라 애플 터치 아이콘은 생략. 카카오 동의화면 아이콘은 192 재사용.
- [x] manifest(`app/manifest.ts`) + 아이콘 연결 + theme/viewport(크림 #FFF8F0)
- [x] 서비스 워커(`public/sw.js`, 셸 캐싱 SWR + 네비 네트워크우선) + 등록(`ServiceWorkerRegister`, prod만) + sw.js 헤더(next.config). 프록시 matcher에 OG/icon/manifest/sw 공개 제외 추가(크롤러 접근).
- [ ] **(사용자)** 안드로이드 홈 설치 → standalone 확인 (Lighthouse PWA 통과)
- **완료 기준:** 폰 홈 화면에 밥로그 아이콘, 전체화면 실행. 카톡 공유 시 미리보기 정상.

## Phase 2 · 조회 (히스토리 + 체중)
**읽을 문서:** `03`, `05`(2·3번 화면)
- [x] 히스토리: 일/주/월 토글 + Recharts 막대 차트 + 끼니 리스트 (수정/삭제는 백로그로 보류)
- [x] 체중: 입력 + `/api/weight`(GET/POST) + 추세 라인 차트(기간 토글) + 최근 리스트
- [ ] (검토) 체중 목표 설정 + 추세선에 목표 표시 — D15 (Phase 3 이후 재검토)
- 참고: 히스토리 월간은 `/api/meals?days=N`(서버 기간조회, 개수상한 의존 X). 끼니 수정/삭제·체중 수정/삭제는 백로그.
- **완료 기준:** "이번 주/달 이만큼 먹었구나", "체중 이렇게 변했구나"가 보임.

## Phase 3 · 돌아보기 (보고서 + 밥로그의 한마디)
**읽을 문서:** `05`(4번 화면), `06`(B)
- 워딩(확정): 화면/섹션명 **"이번 주 돌아보기"**(월간이면 "이번 달 돌아보기"), AI 텍스트는 **"밥로그의 한마디 🍚"**. "조언/평가"식 훈수 톤 금지 — 회고·응원 톤(00 비목표·D5·D15결).
- [x] 기간 집계 유틸 (`lib/report/summarize.ts`: 일별 총 kcal·매크로, 체중 추세)
- [x] `lib/ai/generateReport(summary, trend)` + `/api/report`(POST, `{period: "주"|"월"}`)
- [x] 돌아보기 화면(주/월 토글, 통계 카드, "밥로그의 한마디" 카드), 비강압적 톤 준수
- [x] 보고서 캐싱 여부 결정 — **AI 호출은 캐싱 안 함**(누를 때마다 새로 생성). 단, **생성 결과(텍스트)는 기간당 최신 1개씩 `reports`에 저장**해 탭 이동해도 안 사라지게 함(2026-06-24 실사용 중 발견 — 결과가 페이지 이동 시 사라지는 문제 보완). 저장 당시 집계와 지금 집계를 비교해 `stale` 여부만 알려주고, 자동 재호출은 안 함(`03`/`06` 참고).
- [x] **최근 추이(N개 과거 기간) 비교** — 직전 기간 1개에서 확장, `meals` 원본을 더 넓게 조회해 기간별 평균을 프롬프트에 추가(`06` 참고). 새 저장소 없이 기존 쿼리 범위만 확장.
- [x] **(사용자)** 폰에서 실제 데이터로 확인 — 정상 동작. 매크로 평균 카드 단위(g) 표시가 마지막 숫자에만 붙어 보이는 문제 발견 → 각 숫자 뒤에 g를 붙이도록 수정.
- **완료 기준:** 버튼 한 번에 기간 요약 + 조언이 나옴.

## Phase 4 · 푸시 알림
**읽을 문서:** `08`
- [x] VAPID 키 생성 + 로컬 `.env` 등록
- [x] `push_subscriptions` 테이블(user_id 포함, D16 보강) + `/api/push/subscribe`(POST/DELETE)
- [x] 권한 요청 UI(`NotificationOptIn`, 레이아웃 마운트) + 구독
- [x] sw에 push/notificationclick 핸들러
- [x] `/api/push/send` + 스마트 스킵(meal_type 기준, 시간윈도 재추정 안 함) + `vercel.json` Cron(UTC 주의)
- [ ] **(사용자)** Vercel 프로젝트 env에 VAPID/CRON_SECRET 등록 + 배포 후 폰에서 구독·수신·스킵 확인
- **완료 기준:** 정시에 알림이 오고, 이미 기록한 날은 안 옴.

## Phase 5+ · 계속 붙일 것 (백로그)
- 일일 목표(kcal/매크로) + 홈 목표 대비 표시 — BMR·TDEE 등 계산값 세트(`03` "계산값" 참고). D15(체중목표 우선)와 우선순위 재검토.
- 기록 홈 대시보드 강화 — 목표 대비/소모량/순탄수/당류·나트륨/체중변화/보상 한 화면에 (`05` 1번 화면 참고, 2026-06-24 참고 앱 스샷 기반)
- 음식 DB(`foods`, `03`) 도입 — 즐겨찾기/직접 등록/사용횟수 기반 빠른 재기록, 식약처 API 다음 우선순위로 검색해 반복 AI 호출 절감 (`06` 참고)
- 수동 검색 자동완성(타이핑 중 식약처 결과 미리보기 — debounce + 별칭 확장)
- 뒤로가기 미세버그: UI로 하위화면(보정/검색) 닫을 때 history 트랩 한 칸이 드물게 남아 종료에 2번 필요 — 여유 시 정리
- 끼니/체중 수정·삭제 + 끼니 상세보기(음식별 전체 영양정보) (조회만 구현됨)
- 끼니 태그(아침/점심/저녁/간식) 모아보기 — 현재 태그만 분류, 집계 뷰 없음 (`05` 참고)
- 음식별 영양정보 확장(나트륨/당류/식이섬유 등) — 식약처 API엔 이미 있음, 현재 안 씀
- 사진 가로/세로 비율 버그 — 썸네일/상세에서 원본 비율 무시되는 문제
- 사진 AI 인식 + DB 영양정보 하이브리드 매칭 (`06` 참고)
- 보상 시스템(기록 시 딸기 적립) — 사용처 미정, 적립 로직(`reward_ledger`, `03`)은 선제 준비. D14와 관계 재검토(`01` 미해결 참고)
- 운동/활동 기록(`exercise_logs`, `03`) — 우선순위 낮음(2026-06-24 확정). 도입하면 "오늘 소모량"이 TDEE 정적 추정보다 정확해짐.
- Recharts dev 경고(ResponsiveContainer width/height -1): StrictMode 마운트 찰나 측정 0 — 프로덕션 무관, 거슬리면 차트에 명시 height/aspect
- 바코드(Open Food Facts) 보정
- 데이터 내보내기(JSON/CSV)
- (필요 시) Capacitor로 감싸 네이티브 앱화

---

## 세션 운영 규칙 (토큰 관리)
1. 세션 시작 → `PROGRESS.md` 읽고 현재 Phase 확인.
2. 그 Phase의 "읽을 문서"만 읽는다. 전체 문서 통독 금지.
3. 작업 → 완료 시 `PROGRESS.md`에 체크 + 변경 로그.
4. 결정이 바뀌면 `01-decisions.md`에 새 항목 추가.
