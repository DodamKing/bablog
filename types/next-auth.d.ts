import type { DefaultSession } from "next-auth";

// session.user.id 를 타입에 추가 (auth.ts의 session 콜백에서 채움).
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
  }
}
