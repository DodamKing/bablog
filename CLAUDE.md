@AGENTS.md

세션 시작 시 `README.md` → `PROGRESS.md` → `docs/09-roadmap.md`의 현재 Phase 순으로 읽고, 그 Phase에 필요한 문서만 선택적으로 읽을 것. 전체 `docs/` 통독 금지.

## 작업 방식 (Git)
- 커밋은 사용자가 지시할 때만 한다. 1인 개인 프로젝트라 atomic commit으로 잘게 쪼갤 필요 없이, 섞인 변경사항도 한 번에 묶어 커밋해도 됨.
- `git push`는 항상 사용자가 직접 한다 — Claude는 push하지 않음. 다만 push 안 된 커밋이 쌓여 있으면 잊지 않도록 알려줄 것.
- GitHub 원격 레포 생성도 사용자가 직접 한다. 생성 후 origin URL을 주면 `git remote add`만 처리.
- **커밋 메시지는 간단하게** (제목 한 줄 위주). 무엇을·왜 바꿨는지 상세 내역은 `PROGRESS.md` 변경 로그와 `docs/01-decisions.md`가 정본이니, 커밋 본문에 길게 풀어쓰지 말 것. 필요하면 해당 로그/결정 번호(D14 등)를 참조.
