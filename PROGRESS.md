# PROGRESS · 진행 상태

> **매 작업마다 여기를 갱신한다.** 세션 시작 시 이 파일부터 읽는다.

## 현재 상태
- **단계:** Phase 0 진행 중
- **다음 작업:** Neon 프로젝트 생성 → `DATABASE_URL` 채우고 `npm run db:push`로 첫 마이그레이션 → GitHub 원격 연동 → Vercel 배포 확인 (→ `09-roadmap.md` Phase 0 잔여 항목)
- **구현 코드:** Next.js 16.2.9 스캐폴딩 완료. drizzle 스키마(`meals`, `weight_logs`)와 패스코드 잠금(`proxy.ts` + `/unlock`) 구현됨. 실제 DB는 아직 연결 안 됨.

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
| 2026-06-22 | Phase 0 착수. `create-next-app`으로 Next.js 16.2.9 스캐폴딩(로컬 git만, GitHub 원격 미연동). drizzle-orm/drizzle-kit 설치, `lib/db/schema.ts`(meals, weight_logs) 작성. Next 16의 `middleware.ts→proxy.ts` 네이밍 변경 확인 후 `proxy.ts`+`/unlock`으로 패스코드 잠금 구현. 개인 프로젝트임을 재확인(D12), Next.js는 항상 최신 버전 사용(D13), AI 모델은 Gemini 3.1 Flash Lite로 잠정 변경(D11). Neon DB·GitHub 원격 연동은 보류. |

---

### 다음 세션의 나에게 (Quick Start)
1. 이 파일 → `09-roadmap.md`에서 현재 Phase 확인.
2. 그 Phase의 "읽을 문서"만 읽기.
3. 작업 후 이 파일 갱신.
4. 막히면 `01-decisions.md`로 "왜 이렇게 정했는지" 확인.
