import type { MetadataRoute } from "next";

// PWA 매니페스트 (Phase 1.5). 안드로이드 전용(D2)이라 apple 관련은 생략.
// 색은 D14 디자인 시스템: 배경/테마 크림 #FFF8F0.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "밥로그",
    short_name: "밥로그",
    description: "사진 한 장으로 끼니를 기록하는 개인용 식단 트래커",
    start_url: "/",
    display: "standalone",
    lang: "ko",
    background_color: "#FFF8F0",
    theme_color: "#FFF8F0",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
