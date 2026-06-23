import { NextResponse } from "next/server";
import { auth } from "@/auth";

// 1차 필터(optimistic): 로그인 안 했으면 /login으로. 실제 보호는 서버 액션/route의
// 데이터 접근 계층에서 한 번 더 한다(Next 16 인증 가이드 권고).
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const isAuthRoute =
    pathname === "/login" || pathname.startsWith("/api/auth");

  // 로그인 안 했는데 보호된 경로 → 로그인 페이지로
  if (!isLoggedIn && !isAuthRoute) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  // 이미 로그인했는데 /login 방문 → 홈으로
  if (isLoggedIn && pathname === "/login") {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  // 정적 자산·PWA 파일은 proxy 제외. 나머지 전 경로에서 인증 검사.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest.webmanifest|sw.js).*)",
  ],
};
