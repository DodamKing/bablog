"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE_NAME = "bablog_auth";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export async function unlock(_prevState: string | undefined, formData: FormData) {
  const passcode = formData.get("passcode");

  if (typeof passcode !== "string" || passcode !== process.env.APP_PASSCODE) {
    return "패스코드가 올바르지 않습니다.";
  }

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, passcode, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: ONE_YEAR_SECONDS,
    path: "/",
  });

  redirect("/");
}
