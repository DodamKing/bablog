import type { Metadata, Viewport } from "next";
import "./globals.css";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  metadataBase: new URL("https://bablog.dimad.kr"),
  title: "밥로그",
  description: "사진 한 장으로 끼니를 기록하는 개인용 식단 트래커",
  openGraph: {
    title: "밥로그",
    description: "사진 한 장으로 끼니를 기록하는 개인용 식단 트래커",
    type: "website",
    // 공유 미리보기 이미지는 app/opengraph-image 에서 생성(Jua 합성).
  },
};

// 모바일 주소창/상태바 색 (D14 크림). PWA standalone에서도 일관.
export const viewport: Viewport = {
  themeColor: "#FFF8F0",
  // 안전영역(env safe-area-inset) 사용하려면 cover 필요 — 하단 제스처바 회피.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
