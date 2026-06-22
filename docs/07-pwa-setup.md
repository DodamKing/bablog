# 07 · PWA 설정 (PWA Setup)

> 목표: 안드로이드 홈 화면에 설치하면 **전체화면 네이티브 앱처럼** 뜨고, 오프라인에서도 열리고, 푸시를 받을 수 있게.
> PWA = 모바일 퍼스트 웹 + **매니페스트** + **서비스 워커**.

## 1. 매니페스트 (`public/manifest.webmanifest`)
홈 화면 설치 시 주소창·탭을 없애 앱처럼 보이게 하는 핵심 파일.
```json
{
  "name": "밥로그",
  "short_name": "밥로그",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```
- `display: standalone` 이 "앱처럼 전체화면"의 핵심.
- 아이콘은 192/512 + maskable 1종 준비. (안드로이드 적응형 아이콘 대응.)
- `<head>`에 `<link rel="manifest" href="/manifest.webmanifest">` 와 `theme-color` 메타 추가.

## 2. 서비스 워커
역할: 오프라인 셸 캐싱 + 푸시 수신.
- **방식 결정:** `next-pwa` 플러그인으로 자동 생성 vs 수동 `public/sw.js`.
  - 권장: 푸시 핸들러를 직접 제어해야 하므로(커스텀 알림 클릭 동작) **수동 sw.js** 또는 next-pwa의 커스텀 워커 주입. Phase 1엔 캐싱만, Phase 4에 push/notificationclick 핸들러 추가.
- Phase 1 sw 역할: 앱 셸(정적 자산) 캐시 → 오프라인에서 화면은 뜨게. (데이터는 온라인 필요.)
- Phase 4 sw 역할: `push` 이벤트 → `showNotification`, `notificationclick` → 앱 열어 기록 화면으로.

## 3. 설치 흐름 (안드로이드)
- 크롬에서 사이트 접속 → 메뉴 "홈 화면에 추가" 또는 설치 배너.
- 매니페스트 + sw 등록 + HTTPS(=Vercel) 조건 충족 시 설치형 PWA로 동작.
- 설치 후 홈 아이콘 실행 = standalone 전체화면.
- (선택) `beforeinstallprompt` 이벤트를 잡아 "설치" 버튼을 직접 노출해도 됨.

## 4. 카메라 입력
- 가장 간단: `<input type="file" accept="image/*" capture="environment">` → 후면 카메라 바로 호출. MVP엔 이걸로 충분.
- 더 정교한 실시간 프리뷰가 필요하면 `getUserMedia`로 커스텀 카메라 — 후순위.

## 5. 체크리스트 (설치 동작 검증)
- [ ] HTTPS (Vercel 기본 충족)
- [ ] manifest 링크됨 + 아이콘 200 OK
- [ ] 서비스 워커 등록 성공
- [ ] 크롬 Lighthouse PWA 통과 / "설치 가능" 표시
- [ ] 홈 화면 설치 후 standalone로 뜸
