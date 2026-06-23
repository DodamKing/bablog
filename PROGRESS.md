# PROGRESS · 진행 상태

> **매 작업마다 여기를 갱신한다.** 세션 시작 시 이 파일부터 읽는다.

## 현재 상태
- **단계:** Phase 1 구현 거의 완료 (기록 루프 코드 완성, 브라우저 E2E 테스트·R2 연결만 남음)
- **다음 작업:** R2 자격증명 채우기 → 브라우저에서 사진→분석→보정→저장 전체 동작 확인 → Phase 1 커밋 → GitHub 연동 → Vercel 배포.
- **구현 코드:** Next.js 16.2.9. 인증(D16, 카카오 로그인) 완료·검증됨. **Phase 1 코드 완성:** `lib/ai/gemini.ts`(analyzeMeal, Gemini 3.1 Flash Lite — 모델 id 동작 검증됨), `lib/storage/r2.ts`(사진 업로드, 미설정 시 null), `/api/analyze`·`/api/meals`(user_id 스코프), 기록 홈 `app/(app)/page.tsx`(카메라→분석→보정→저장), 하단 탭 네비, history/weight/report 골격. 빌드 통과. **남음: R2 자격증명, 브라우저 전체 플로우 테스트.**

## Phase 체크
- [~] Phase 0 · 프로젝트 셋업 (Neon 연결·Vercel 배포 확인만 남음)
- [ ] Phase 1 · 기록 루프 (MVP)
- [ ] Phase 1.5 · PWA화
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
