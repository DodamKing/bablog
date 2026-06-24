"use client";

import { useEffect, useState } from "react";

const DISMISSED_KEY = "bablog:push-dismissed";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

// 알림 권한 요청 배너 (Phase 4). 아직 권한을 묻지 않은 상태에서만, "다음에" 누르면 다신 안 보임.
export default function NotificationOptIn() {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (() => {
      if (process.env.NODE_ENV !== "production") return;
      if (!("Notification" in window) || !("serviceWorker" in navigator)) return;
      if (Notification.permission !== "default") return;
      if (localStorage.getItem(DISMISSED_KEY)) return;
      setShow(true);
    })();
  }, []);

  async function subscribe() {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setShow(false);
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
        ),
      });
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      setShow(false);
    } catch {
      /* 실패해도 앱은 정상 동작 — 알림만 못 받음 */
    } finally {
      setBusy(false);
    }
  }

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="mx-4 mt-2 flex items-center justify-between gap-3 rounded-2xl bg-coral-soft px-4 py-3">
      <p className="text-sm text-ink/80">기록 시간에 알림을 받아볼까요? 🔔</p>
      <div className="flex shrink-0 gap-2">
        <button onClick={dismiss} className="text-xs text-ink/45">
          다음에
        </button>
        <button
          onClick={subscribe}
          disabled={busy}
          className="rounded-xl bg-coral px-3 py-1.5 text-xs font-medium text-white transition active:scale-95 disabled:opacity-60"
        >
          허용
        </button>
      </div>
    </div>
  );
}
