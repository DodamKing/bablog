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
| `items` | jsonb | AI가 인식한 음식 항목 배열 `[{name, qty}]` |
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

### `push_subscriptions` — 푸시 구독 (Phase 4)
| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | uuid (pk) | |
| `endpoint` | text unique | PushSubscription endpoint |
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

## 사진 저장 정책
- MVP: 사진을 굳이 영구 저장하지 않아도 됨(분석만 하고 버리기 가능) → `photo_url` null 허용.
- 사진을 보관하고 싶으면 Vercel Blob 또는 외부 스토리지에 올리고 URL만 `meals.photo_url`에 기록.
- **결정 보류:** 사진 보관 여부는 Phase 1 착수 시 정한다 (보관하면 히스토리에서 사진도 보임 = 좋지만 스토리지 비용/관리 추가).

## 인덱스
- `meals(eaten_at)` — 기간 조회용.
- `weight_logs(logged_at)`.

## 마이그레이션
- drizzle-kit 사용. `drizzle.config.ts`에 Neon 연결.
- 스키마 변경 시 `09-roadmap` 단계와 무관하게 즉시 마이그레이션 + 이 문서 갱신.
