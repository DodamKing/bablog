# 08 · 푸시 알림 (Push Notifications) — Phase 4

> "식단 기록하셨어요? 📸" 같은 정시 알림. **이미 기록했으면 안 보냄(스마트 스킵).**
> 핵심 앱이 잘 돌아간 뒤에 얹는다 (곁가지 많음).

## 조각 4개
1. **VAPID 키** — 웹 푸시 인증용 공개/비공개 키 한 쌍. `web-push generate-vapid-keys`로 1회 생성 → env에 `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_SUBJECT`.
2. **구독 저장** — 클라이언트에서 권한 허용 → `registration.pushManager.subscribe({ applicationServerKey: VAPID_PUBLIC_KEY })` → 받은 구독을 `/api/push/subscribe`로 보내 `push_subscriptions`에 저장.
3. **스케줄** — `vercel.json`의 Cron으로 정시에 `/api/push/send` 호출.
4. **발송** — `/api/push/send`가 `web-push`로 구독에 알림 전송. 서비스 워커의 `push` 핸들러가 받아 `showNotification`.

## 안드로이드 전제
- 안드로이드 크롬은 PWA 푸시에 관대 (iOS 같은 "설치 필수" 제약 부담 없음).
- 사용자가 권한을 **한 번 허용**해야 함 (본인 1회 설정).

## Vercel Cron (`vercel.json` 예)
```json
{
  "crons": [
    { "path": "/api/push/send?slot=lunch",  "schedule": "30 3 * * *" },
    { "path": "/api/push/send?slot=dinner", "schedule": "30 10 * * *" }
  ]
}
```
- **주의:** Vercel Cron schedule은 **UTC**. KST 12:30 = UTC 03:30, KST 19:30 = UTC 10:30. (위 예시 반영.)
- `/api/push/send`는 `CRON_SECRET`(Vercel이 보내는 Authorization 헤더)로 보호.

## 스마트 스킵 로직 (`/api/push/send`)
```
1. (보호) Authorization 헤더 검증.
2. slot에 해당하는 "기대 식사 시간대"에 오늘 meals 기록이 있는지 Neon 조회.
   - lunch slot이면 오늘 11~15시 기록 존재?  dinner slot이면 17~21시 기록 존재?
3. 이미 있으면 → 발송 스킵 (잔소리 안 함).
4. 없으면 → 모든 구독에 web-push 발송: "점심 기록하셨어요? 📸"
```

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
- [ ] VAPID 키 생성·env 등록
- [ ] 권한 허용 → 구독 DB 저장 확인
- [ ] 수동으로 /api/push/send 호출 시 알림 수신
- [ ] 오늘 기록 있을 때 스킵 동작 확인
- [ ] Cron이 UTC 기준 정시에 트리거되는지 확인
