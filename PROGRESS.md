# PROGRESS · 진행 상태

> **매 작업마다 여기를 갱신한다.** 세션 시작 시 이 파일부터 읽는다.

## 현재 상태
- **단계:** **Phase 0·1 완료 + Phase 1.5 코드 완료.** 브랜딩(마스코트→파비콘/PWA아이콘/maskable/OG)·manifest·서비스워커까지 구현·빌드 통과. **남은 건 폰에서 홈 설치 standalone 확인(사용자).**
- **다음 작업:** 폰 설치 확인 후 **Phase 2(조회: 히스토리+체중)**. 읽을 문서: `03`, `05`(2·3번 화면). 차트는 Recharts(D8), 체중 목표는 검토(D15).
- **구현 코드:** Next.js 16.2.9. 카카오 로그인(D16)·기록 루프(사진→분석→보정→저장)·R2 사진 보관·**Vercel 배포(bablog.dimad.kr) 동작 확인**. UI 리디자인(D14 톤, Jua+크림+코랄+🍚). 사진 리사이즈/EXIF 제거. dev 로그인 우회(`DEV_AUTH_BYPASS`). 보정 화면 D18 리팩터(끼니 선택 + 항목별 양/단위 스테퍼 + 삭제 되돌리기 + 비음식 가드). **수동 입력(D18): 식약처 라이브 API 검색(`/api/foods/search`) + AI 텍스트 폴백(`/api/foods/estimate`) + 검색 UI(보정 화면 재사용, 음식 더 추가).** 식약처는 방식 A 라이브 호출 확정(D18 갱신).

## Phase 체크
- [x] Phase 0 · 프로젝트 셋업 (Neon·Vercel·카카오 로그인 완료)
- [x] Phase 1 · 기록 루프 (사진 기록 + 수동 입력 + R2 + E2E 저장 동작 확인)
- [~] Phase 1.5 · PWA화 (브랜딩·manifest·SW 코드 완료, 폰 설치 확인만 남음)
- [ ] Phase 2 · 조회 (히스토리 + 체중)
- [ ] Phase 3 · 보고서 + AI 조언
- [ ] Phase 4 · 푸시 알림

## 결정 대기 (착수 시 정할 것)
- 사진 영구 보관 여부 (Phase 1) — `03` 사진 저장 정책
- 보고서 캐싱 여부 (Phase 3)
- Gemini 3.1 Flash Lite 모델명 재확인 (Phase 1 착수 시, D11)

## 변경 로그
| 날짜 | 내용 |
|---|---|
| (초기) | 핸드오프 문서 세트 작성. 프로젝트명 밥로그 확정. 스택·아키텍처·스키마·로드맵 정리. |
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
