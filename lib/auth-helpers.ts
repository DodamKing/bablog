import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

// 개발 편의: NODE_ENV가 production이 아니고 DEV_AUTH_BYPASS=true 일 때만,
// 카카오 로그인 없이 고정 dev 사용자로 동작 (모바일 LAN 테스트용).
// 배포는 항상 NODE_ENV=production이라 절대 활성화되지 않음.
const DEV_BYPASS =
  process.env.NODE_ENV !== "production" &&
  process.env.DEV_AUTH_BYPASS === "true";
const DEV_USER_ID = "dev-user";

let devUserEnsured = false;
async function ensureDevUser() {
  if (devUserEnsured) return;
  await db
    .insert(users)
    .values({ id: DEV_USER_ID, name: "개발자(dev)" })
    .onConflictDoNothing();
  devUserEnsured = true;
}

// 데이터 접근 계층(DAL): 서버 액션·route·서버 컴포넌트에서 호출해
// 현재 로그인한 사용자의 id를 얻는다. 없으면 로그인으로 보냄.
// 모든 도메인 쿼리는 이 id로 스코프해서 다른 사용자 데이터에 접근 못 하게 한다.
export async function requireUserId(): Promise<string> {
  if (DEV_BYPASS) {
    await ensureDevUser();
    return DEV_USER_ID;
  }
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  return session.user.id;
}

// API route용: 리다이렉트 대신 null 반환 (호출부에서 401 처리).
export async function getUserId(): Promise<string | null> {
  if (DEV_BYPASS) {
    await ensureDevUser();
    return DEV_USER_ID;
  }
  const session = await auth();
  return session?.user?.id ?? null;
}
