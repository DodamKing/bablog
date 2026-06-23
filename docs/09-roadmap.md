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
- [ ] 카카오 개발자 앱 등록 → `AUTH_KAKAO_ID`/`AUTH_KAKAO_SECRET` + 리다이렉트 URI → 로그인 동작 확인
- [ ] Vercel 배포 파이프라인 확인 (GitHub 원격 연동 후, env 변수 등록)
- **완료 기준:** 카카오 로그인 통과 → 빈 앱이 뜨고, 사용자별 데이터 격리 준비됨. Vercel 배포 확인.

## Phase 1 · 기록 루프 (핵심 MVP)
**읽을 문서:** `02`, `03`, `04`, `06`(A), `05`(1번 화면)
- [x] `lib/ai/` Gemini 어댑터: `analyzeMeal(image)` → JSON (3.1 Flash Lite, 모델 id 검증됨)
- [x] `/api/analyze` route
- [x] 기록 홈: 카메라 입력 → 분석 → **보정 화면** → 저장
- [x] `/api/meals` POST/GET (user_id 스코프)
- [x] 사진 보관 결정(D17: Cloudflare R2) + `lib/storage/r2.ts` (자격증명 입력 대기)
- [x] 하단 탭 네비 뼈대(기록/히스토리/체중/보고서 라우트만)
- [ ] R2 자격증명 입력 + 브라우저에서 전체 플로우 E2E 확인
- **완료 기준:** 폰에서 사진 찍어 보정 후 저장 → DB에 들어감.

## Phase 1.5 · PWA화 (앱처럼 설치)
**읽을 문서:** `07`
- [ ] manifest + 아이콘(192/512/maskable)
- [ ] 서비스 워커(셸 캐싱)
- [ ] 안드로이드 홈 설치 → standalone 확인 (Lighthouse PWA 통과)
- **완료 기준:** 폰 홈 화면에 밥로그 아이콘, 전체화면 실행.

## Phase 2 · 조회 (히스토리 + 체중)
**읽을 문서:** `03`, `05`(2·3번 화면)
- [ ] 히스토리: 일/주/월 토글 + Recharts 막대 차트 + 끼니 리스트(수정/삭제)
- [ ] 체중: 입력 + `/api/weight` + 추세 라인 차트
- [ ] (검토) 체중 목표 설정 + 추세선에 목표 표시 — D15
- **완료 기준:** "이번 주/달 이만큼 먹었구나", "체중 이렇게 변했구나"가 보임.

## Phase 3 · 보고서 + AI 조언
**읽을 문서:** `05`(4번 화면), `06`(B)
- [ ] 기간 집계 유틸 (일별 총 kcal·매크로, 체중 추세)
- [ ] `lib/ai/generateReport(summary)` + `/api/report`
- [ ] 보고서 화면(주/월), 비강압적 조언 톤 준수
- [ ] 보고서 캐싱 여부 결정
- **완료 기준:** 버튼 한 번에 기간 요약 + 조언이 나옴.

## Phase 4 · 푸시 알림
**읽을 문서:** `08`
- [ ] VAPID 키 + env
- [ ] `push_subscriptions` 테이블 + `/api/push/subscribe`
- [ ] 권한 요청 UI + 구독
- [ ] sw에 push/notificationclick 핸들러
- [ ] `/api/push/send` + 스마트 스킵 + `vercel.json` Cron(UTC 주의)
- **완료 기준:** 정시에 알림이 오고, 이미 기록한 날은 안 옴.

## Phase 5+ · 계속 붙일 것 (백로그)
- 일일 목표(kcal/매크로) + 홈 목표 대비 표시
- 자주 먹는 음식 즐겨찾기/빠른 재기록
- 바코드(Open Food Facts) 보정
- 데이터 내보내기(JSON/CSV)
- (필요 시) Capacitor로 감싸 네이티브 앱화

---

## 세션 운영 규칙 (토큰 관리)
1. 세션 시작 → `PROGRESS.md` 읽고 현재 Phase 확인.
2. 그 Phase의 "읽을 문서"만 읽는다. 전체 문서 통독 금지.
3. 작업 → 완료 시 `PROGRESS.md`에 체크 + 변경 로그.
4. 결정이 바뀌면 `01-decisions.md`에 새 항목 추가.
