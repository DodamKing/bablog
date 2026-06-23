import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

// 데이터 접근 계층(DAL): 서버 액션·route·서버 컴포넌트에서 호출해
// 현재 로그인한 사용자의 id를 얻는다. 없으면 로그인으로 보냄.
// 모든 도메인 쿼리는 이 id로 스코프해서 다른 사용자 데이터에 접근 못 하게 한다.
export async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  return session.user.id;
}

// API route용: 리다이렉트 대신 null 반환 (호출부에서 401 처리).
export async function getUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}
