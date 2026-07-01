import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // StrictMode의 개발모드 mount→cleanup→mount 이중 실행이 history-트랩 오버레이
  // (MealEditOverlay/AddMealOverlay)와 레이스를 일으켜 열리자마자 닫히는 버그의
  // 원인으로 지목돼 옴(2026-06-25 최초 발견, 2026-07-01 재발). 프로덕션에서는
  // 애초에 재현 안 됨(StrictMode는 dev 전용) — 꺼서 dev도 프로덕션과 일치시킴.
  reactStrictMode: false,
  allowedDevOrigins: ['192.168.137.1', '192.168.219.108'],
  async headers() {
    return [
      {
        // 서비스 워커는 항상 최신으로 (캐시 금지) + JS MIME 보장
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
