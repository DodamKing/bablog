# 03 · 데이터 모델 (Data Model)

> Neon(Postgres) + drizzle-orm. 단일 사용자라 `user_id`는 두지 않거나 상수 1개로 둔다.
> 아래는 의도 명세. 실제 drizzle 스키마는 `lib/db/schema.ts`에 작성.

## 테이블

### `meals` — 끼니 기록
| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | uuid (pk, default gen) | |
| `eaten_at` | timestamptz | 먹은 시각 (기본 now, 수정 가능) |
| `photo_url` | text nullable | 저장한 사진 경로 (저장 정책은 아래) |
| `items` | jsonb | AI가 인식한 음식 항목 배열 `[{name, qty}]` (백로그: 나트륨/당류/식이섬유 등 확장 필드 — 식약처 API엔 이미 있으나 현재 안 씀, `06` 참고) |
| `kcal` | integer | 보정된 최종 칼로리 |
| `protein_g` | numeric | 단백질 (g) |
| `carb_g` | numeric | 탄수화물 (g) |
| `fat_g` | numeric | 지방 (g) |
| `note` | text nullable | 사용자 메모 |
| `ai_raw` | jsonb nullable | AI 원본 추정 (보정 전, 디버깅/재분석용) |
| `created_at` | timestamptz default now | |

### `weight_logs` — 체중 기록
| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | uuid (pk) | |
| `logged_at` | timestamptz | 측정 시각 |
| `weight_kg` | numeric | 체중 |
| `body_fat_pct` | numeric nullable | 체지방률 (선택) |
| `note` | text nullable | |
| `created_at` | timestamptz default now | |

### `reports` — 보고서(Phase 3, 구현됨) "마지막 생성 결과" 1개씩
기간(주/월)당 최신 1개만 upsert(히스토리 전체 보관 아님). 탭 재방문 시 안 사라지게 하는 용도 — 통계는 항상 `meals`/`weight_logs`에서 라이브 재계산하고, 여기는 **AI 텍스트만** 캐싱.
| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | uuid (pk) | |
| `user_id` | text (fk users) | |
| `period_label` | text | `주` \| `월` |
| `report_text` | text | 생성된 "밥로그의 한마디" |
| `summary_fingerprint` | text | 생성 시점 집계를 평문 키로 직렬화한 값 — 지금 집계와 비교해 변경 여부(stale) 판단용(jsonb 키 순서 불확실성 피함, `06` 참고) |
| `generated_at` | timestamptz default now | |
unique(`user_id`, `period_label`).

### `push_subscriptions` — 푸시 구독 (Phase 4, 구현됨)
초안엔 `user_id`가 없었으나(D16 멀티유저 전환 전 작성) 발송 시 사용자별로 스코프해야 해서 추가.
| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | uuid (pk) | |
| `user_id` | text (fk users) | |
| `endpoint` | text unique | PushSubscription endpoint(기기/브라우저 단위) |
| `p256dh` | text | 구독 키 |
| `auth` | text | 구독 키 |
| `created_at` | timestamptz default now | |

### `daily_summaries` — (선택, Phase 3 최적화) 일별 집계 캐시
보고서·차트 성능을 위해 필요해지면 추가. 처음엔 `meals`에서 즉석 집계로 충분.
| 컬럼 | 타입 |
|---|---|
| `date` | date (pk) |
| `total_kcal` | integer |
| `protein_g` / `carb_g` / `fat_g` | numeric |
| `meal_count` | integer |

### `foods` — (Phase 6, 확정) 전역 공유 음식 DB
음식 영양정보는 개인정보가 아니라 객관적 사실이므로, 멀티유저(D16)의 "각자 독립 데이터" 원칙과 무관하게 **전역으로 공유**한다 — 한 사용자가 추정/등록/검색한 음식을 다른 사용자도 즉시 재사용.
**범위(D19 보강, 2026-06-28):** 처음엔 "AI 추정 결과만 저장"으로 좁게 설계했으나, 그러면 식약처 DB에 잘 매칭되는 흔한 한식(김치찌개·비빔밥 등 — 사실상 가장 자주 반복되는 음식)이 즐겨찾기/자주먹는 목록에 영영 안 뜨는 문제가 있어 확장: **수동 검색으로 끼니에 추가한 음식은 출처(식약처/AI/직접등록) 상관없이 저장 시점에 모두 upsert.** "AI 재호출 회피"는 그중 AI 추정 항목에서만 의미 있는 효과일 뿐, 저장 자체는 출처를 안 가림. 사진 분석(비전 인식) 항목은 범위 밖(Phase 7+ "하이브리드 매칭" 참고).
**저장(캐싱) 시점(D19):** 별도 캐싱 동작이 아니라 저장 흐름에 포함됨 — 추정/검색 직후가 아니라 **끼니를 실제로 저장하는 시점**(보정 화면에서 사용자가 고친 최종값)에 upsert(이름 매칭, 기존 있으면 `usage_count`만 +1). 즐겨찾기 토글 시점에도 아직 없으면 upsert(식약처 결과를 한 번도 끼니로 저장 안 하고 바로 즐겨찾기만 누르는 경우 대응).
| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | uuid (pk) | |
| `name` | text unique | 검색 키(정규화된 음식명, 정확히 일치하는 이름끼리만 upsert — 별칭/유사어 매칭은 범위 밖) |
| `source` | text | `gov`(식약처 검색으로 추가) \| `ai`(AI 추정으로 추가) \| `user`(직접 등록) |
| `basis_amount` | numeric | 영양값 기준 양(기존 `FoodHit.basisAmount`와 동일 패턴) |
| `unit` | text | `g` \| `ml` 등 — 기준량 단위 |
| `kcal` / `protein_g` / `carb_g` / `fat_g` | numeric | `basis_amount`+`unit` 기준 영양정보 |
| `sodium_mg` / `sugar_g` / `fiber_g` | numeric nullable | 확장 영양정보(있으면, 현재 입력 경로 없음 — Phase 7+) |
| `created_by` | text nullable (fk users) | 처음 upsert한 사용자. 조회/재사용엔 권한 제어 아님(전역 공유라 누구나 재사용)이지만, **삭제는 예외** — `source: user`(직접 등록)인 행만 `created_by` 일치 시 본인이 지울 수 있음(2026-06-28 추가, 등록 실수 교정용). `gov`/`ai` 출처는 삭제 UI 없음. 수정 기능은 없음 — 지우고 다시 등록하는 방식으로 대체(이미 저장된 끼니는 스냅샷이라 영향 없음) |
| `created_at` | timestamptz default now | |

### `user_foods` — (Phase 6, 확정) 사용자별 사용횟수 + 즐겨찾기
**`user_favorite_foods`에서 확장(2026-06-28).** 처음엔 즐겨찾기 토글만 담는 테이블로 설계했는데, "사용횟수"를 `foods`에 전역 컬럼으로 두면 멀티유저(D16) 환경에서 다른 사용자의 사용량이 내 "자주 먹는 음식" 목록에 섞여 들어가는 문제가 있어 — `foods`(전역 영양정보)와 분리해 **사용횟수도 사용자별로** `user_foods`에 둠. `foods`는 객관적 사실(영양정보)만 전역 공유, "얼마나 자주/즐겨 먹는지"는 사용자마다 다른 개인 데이터.
| 컬럼 | 타입 | 설명 |
|---|---|---|
| `user_id` | text (fk users) | |
| `food_id` | uuid (fk foods) | |
| `usage_count` | integer default 0 | 이 사용자가 끼니에 추가할 때마다 +1 |
| `is_favorite` | boolean default false | 즐겨찾기 토글 |
| `created_at` | timestamptz default now | |
(PK는 `user_id`+`food_id` 복합). "자주 먹는 음식" 목록 = `user_foods` 기준 `is_favorite desc, usage_count desc`.

### `user_profiles` — (제안, 백로그) 목표 칼로리 계산용 신체 정보
BMR/TDEE 계산용. 체중은 `weight_logs` 최신값을 그대로 쓰고 중복 저장 안 함.
| 컬럼 | 타입 | 설명 |
|---|---|---|
| `user_id` | text (pk, fk users) | |
| `birth_year` | integer nullable | 나이 계산용 |
| `height_cm` | numeric nullable | |
| `gender` | text nullable | BMR 공식 분기용 |
| `activity_level` | text nullable | 좌식~매우활동적 등급(TDEE 계수) |
| `goal_type` | text nullable | `감량` \| `유지` \| `증량` |
| `target_weight_kg` | numeric nullable | |
| `weekly_rate_kg` | numeric nullable | 목표 변화 속도(예: 주 0.5kg 감량) — 목표 kcal 조정에 사용 |
| `updated_at` | timestamptz default now | |

### `reward_ledger` — (제안, 백로그) 보상(딸기) 적립 내역
사용처는 미정이지만(`01` 미해결) 적립 로직은 선제로 준비. 단일 카운터 컬럼 대신 ledger로 둬서, 나중에 "사용"(차감)이 생겨도 스키마 변경 없이 음수 row만 추가하면 됨.
| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | uuid (pk) | |
| `user_id` | text (fk users) | |
| `amount` | integer | 적립 +1, 사용 시 음수 |
| `reason` | text | 예: `meal_record` |
| `created_at` | timestamptz default now | |
잔액 = `SUM(amount) WHERE user_id = ?`.

### `exercise_logs` — (제안, 백로그, 낮은 우선순위) 운동/활동 기록
2026-06-24 사용자 확인 — 도입하기로 하되 우선순위는 낮음. "오늘 소모량"을 TDEE 정적 추정에서 실측으로 보강하는 용도.
| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | uuid (pk) | |
| `user_id` | text (fk users) | |
| `logged_at` | timestamptz | 운동 시각(기본 now) |
| `duration_min` | integer | 운동 시간(분) |
| `activity_type` | text nullable | 운동 종류(있으면 MET 계수 적용, 없으면 기본 계수) |
| `kcal_burned` | integer | 소모 칼로리(직접 입력 또는 MET×시간×체중 계산) |
| `note` | text nullable | |
| `created_at` | timestamptz default now | |

## 계산값 (저장 안 함, 매번 파생)
아래는 테이블에 안 두고 `meals`/`weight_logs`/`user_profiles`에서 즉석 계산 (`01` 미해결 — 목표 칼로리/대사량 참고):
- **BMR**(Mifflin-St Jeor): 남 `10×kg + 6.25×cm − 5×age + 5`, 여 `10×kg + 6.25×cm − 5×age − 161`
- **TDEE** = BMR × `activity_level` 계수(좌식 1.2 ~ 매우활동적 1.9 등)
- **목표 kcal** = TDEE + (목표 방향에 따른 일일 조정. 1kg ≈ 7700kcal → `weekly_rate_kg × 7700 / 7`만큼 가감)
- **매크로 목표(g)** = 목표 kcal × 매크로 비율 ÷ (탄수·단백 4kcal/g, 지방 9kcal/g)
- **순탄수** = `carb_g − fiber_g`
- **BMI** = `weight_kg / (height_m)^2`
- **체중 변화량** = 최근 두 `weight_logs` 차이
- **오늘 남은 칼로리** = 목표 kcal − 오늘 섭취 kcal + 오늘 `exercise_logs` 합계(있으면, 낮은 우선순위)

## 사진 저장 정책
- **확정(D17):** 영구 보관, 저장소는 Cloudflare R2(egress 무료). 업로드는 서버(`/api/*`)에서만, 공개 URL을 `meals.photo_url`에 기록.
- 사진이 없는 기록(수동 입력 등)은 `photo_url` null 허용.

## 인덱스
- `meals(eaten_at)` — 기간 조회용.
- `weight_logs(logged_at)`.
- `push_subscriptions(user_id)`.

## 마이그레이션
- drizzle-kit 사용. `drizzle.config.ts`에 Neon 연결.
- 스키마 변경 시 `09-roadmap` 단계와 무관하게 즉시 마이그레이션 + 이 문서 갱신.
