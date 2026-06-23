import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://bablog.dimad.kr"),
  title: "밥로그",
  description: "사진 한 장으로 끼니를 기록하는 개인용 식단 트래커",
  openGraph: {
    title: "밥로그",
    description: "사진 한 장으로 끼니를 기록하는 개인용 식단 트래커",
    type: "website",
    // 공유 미리보기 이미지(opengraph-image)는 Phase 1.5 브랜딩 패스에서 추가.
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
