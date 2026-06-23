import { NextResponse } from "next/server";
import { auth } from "@/auth";

// dev 우회(헬퍼와 동일 조건): 켜지면 인증 게이트를 통째로 통과시켜
// 로그인 없이 모든 화면 접근 가능. 배포(NODE_ENV=production)에선 항상 꺼짐.
const DEV_BYPASS =
  process.env.NODE_ENV !== "production" &&
  process.env.DEV_AUTH_BYPASS === "true";

// 1차 필터(optimistic): 로그인 안 했으면 /login으로. 실제 보호는 서버 액션/route의
// 데이터 접근 계층에서 한 번 더 한다(Next 16 인증 가이드 권고).
const authGate = auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const isAuthRoute =
    pathname === "/login" || pathname.startsWith("/api/auth");

  if (!isLoggedIn && !isAuthRoute) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }
  if (isLoggedIn && pathname === "/login") {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }
  return NextResponse.next();
});

export default DEV_BYPASS ? () => NextResponse.next() : authGate;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest.webmanifest|sw.js).*)",
  ],
};
