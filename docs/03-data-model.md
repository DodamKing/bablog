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

### `foods` — (제안, 백로그) 전역 공유 음식 DB (캐시 아니라 영구 DB로 확정, 2026-06-24)
음식 영양정보는 개인정보가 아니라 객관적 사실이므로, 멀티유저(D16)의 "각자 독립 데이터" 원칙과 무관하게 **전역으로 공유**한다 — 한 사용자가 추정/등록한 음식을 다른 사용자도 즉시 재사용. 목적은 같은 음식을 매번 AI에게 다시 추정시키는 비효율 제거(`06` 조회 우선순위 참고). 식약처 API 결과는 매번 라이브 호출(D18)이라 여기 안 들어가고, **AI 폴백 추정**과 **사용자 직접 등록/수정값**만 영구 저장.
| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | uuid (pk) | |
| `name` | text | 검색 키(정규화된 음식명) |
| `source` | text | `ai`(AI 추정 후 저장) \| `user`(직접 등록/수정) |
| `kcal` / `protein_g` / `carb_g` / `fat_g` | numeric | 기준량(1인분 또는 100g) 당 영양정보 |
| `sodium_mg` / `sugar_g` / `fiber_g` | numeric nullable | 확장 영양정보(있으면) |
| `serving_desc` | text nullable | "1공기(210g)" 등 기준량 설명 |
| `usage_count` | integer default 0 | 기록될 때마다 +1 — 자주 쓰는 음식 정렬/즐겨찾기 기본값에 사용 |
| `created_by` | text nullable (fk users) | 직접 등록한 사용자(AI 추정 결과는 null) |
| `created_at` | timestamptz default now | |

### `user_favorite_foods` — (제안, 백로그) 사용자별 즐겨찾기
`foods`는 전역이지만 즐겨찾기는 사용자별 — `users`↔`foods` 다대다.
| 컬럼 | 타입 |
|---|---|
| `user_id` | text (fk users) |
| `food_id` | uuid (fk foods) |
| `created_at` | timestamptz default now |
(PK는 `user_id`+`food_id` 복합)

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
