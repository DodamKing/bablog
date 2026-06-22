import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "bablog_auth";

export function proxy(request: NextRequest) {
  const passcode = request.cookies.get(COOKIE_NAME)?.value;

  if (passcode === process.env.APP_PASSCODE) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL("/unlock", request.url));
}

export const config = {
  matcher: ["/((?!unlock|_next/static|_next/image|favicon.ico).*)"],
};
