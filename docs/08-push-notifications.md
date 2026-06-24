# 08 · 푸시 알림 (Push Notifications) — Phase 4 (구현됨)

> "식단 기록하셨어요? 📸" 같은 정시 알림. **이미 기록했으면 안 보냄(스마트 스킵).**
> 핵심 앱이 잘 돌아간 뒤에 얹는다 (곁가지 많음).

## 조각 4개
1. **VAPID 키** — 웹 푸시 인증용 공개/비공개 키 한 쌍. `npx web-push generate-vapid-keys`로 1회 생성 → env에 `NEXT_PUBLIC_VAPID_PUBLIC_KEY`(클라이언트 subscribe에서도 필요해 `NEXT_PUBLIC_` 접두)/`VAPID_PRIVATE_KEY`/`VAPID_SUBJECT`. `lib/push/send.ts`에서 `webpush.setVapidDetails`로 설정.
2. **구독 저장** — `components/NotificationOptIn.tsx`(레이아웃에 마운트, prod 빌드에서만 노출): 권한이 `default`일 때 배너 표시 → "허용" 클릭 시 `Notification.requestPermission()` → `registration.pushManager.subscribe({ applicationServerKey })` → `/api/push/subscribe`(POST)로 `push_subscriptions`에 upsert(endpoint unique). "다음에"는 localStorage 플래그로 영구 숨김.
3. **스케줄** — `vercel.json`의 `crons`로 정시에 `/api/push/send?slot=lunch|dinner` 호출(GET).
4. **발송** — `/api/push/send`가 `lib/push/send.ts`의 `sendPush()`(`web-push` 래핑)로 구독에 알림 전송. 서비스 워커(`public/sw.js`)의 `push` 핸들러가 받아 `showNotification`, `notificationclick`이 탭 열기 처리.

## 안드로이드 전제
- 안드로이드 크롬은 PWA 푸시에 관대 (iOS 같은 "설치 필수" 제약 부담 없음).
- 사용자가 권한을 **한 번 허용**해야 함 (본인 1회 설정).

## Vercel Cron (`vercel.json`, 적용됨)
```json
{
  "crons": [
    { "path": "/api/push/send?slot=lunch",  "schedule": "30 3 * * *" },
    { "path": "/api/push/send?slot=dinner", "schedule": "30 10 * * *" }
  ]
}
```
- **주의:** Vercel Cron schedule은 **UTC**. KST 12:30 = UTC 03:30, KST 19:30 = UTC 10:30. (위 예시 반영.)
- Hobby 플랜은 cron당 하루 1회만 가능(분 단위 보장 X, 지정 시각이 속한 1시간 내 어딘가에 실행될 수 있음) — 개수 제한은 없음(2026 기준 프로젝트당 최대 100개).
- `/api/push/send`는 `CRON_SECRET`(Vercel이 같은 이름의 env가 있으면 자동으로 Authorization: Bearer 헤더에 넣어 보냄)으로 보호. `proxy.ts`의 인증 게이트 matcher에서 이 경로는 제외(세션이 아니라 이 시크릿으로 인증하므로).

## 스마트 스킵 로직 (`/api/push/send/route.ts`, 구현됨)
```
1. (보호) Authorization 헤더가 `Bearer ${CRON_SECRET}`인지 검증.
2. slot(lunch|dinner) → meal_type(점심|저녁) 매핑. 시간대(11~15시 등)를 따로 재추정하지 않고
   기존 meals.meal_type(D18, 사용자가 보정 화면에서 고친 최종 분류)을 그대로 기준으로 씀.
3. push_subscriptions에 구독이 있는 모든 사용자에 대해: 오늘(dayKey 기준) meal_type이 일치하는
   기록이 있으면 스킵, 없으면 그 사용자의 구독 전체에 발송.
4. 발송 중 410/404(구독 만료/취소) 받으면 해당 endpoint를 push_subscriptions에서 삭제.
```
- 멀티유저(D16) 전제로 사용자별로 독립 판단 — 한 명이 기록해도 다른 사용자에겐 그대로 알림 감.

## 서비스 워커 핸들러 (Phase 4 추가)
```js
self.addEventListener('push', (e) => {
  const data = e.data?.json() ?? {};
  e.waitUntil(self.registration.showNotification(data.title, {
    body: data.body, icon: '/icons/icon-192.png', data: { url: '/' }
  }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data.url));
});
```

## 검증 체크리스트
- [x] VAPID 키 생성·`.env` 등록(로컬). **(사용자) Vercel 프로젝트 env에도 동일하게 등록 필요**: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_SUBJECT`/`CRON_SECRET`.
- [ ] (사용자) 폰에서 권한 허용 → 구독 DB(`push_subscriptions`) 저장 확인
- [ ] (사용자) 배포 후 수동으로 `/api/push/send?slot=lunch`에 `Authorization: Bearer $CRON_SECRET` 헤더로 호출 → 알림 수신 확인
- [ ] (사용자) 오늘 점심/저녁 기록 있을 때 스킵(`skipped` 응답) 동작 확인
- [ ] (사용자) Cron이 실제 트리거되는지 확인 (Vercel 대시보드 Cron 로그)
