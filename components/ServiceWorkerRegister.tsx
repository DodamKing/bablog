"use client";

import { useEffect } from "react";

// /sw.js 등록 (Phase 1.5). 개발 중엔 캐시 혼란 방지로 끔.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch(() => {
        /* 등록 실패해도 앱은 정상 동작 */
      });
  }, []);
  return null;
}
