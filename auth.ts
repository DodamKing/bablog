import NextAuth from "next-auth";
import Kakao from "next-auth/providers/kakao";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import { accounts, sessions, users, verificationTokens } from "@/lib/db/schema";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // 어댑터: 사용자/카카오 계정을 Neon에 영구 저장 (D16).
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  // 세션은 JWT(쿠키) 전략 — proxy(Node 런타임)에서 DB 조회 없이 가볍게 검사.
  session: { strategy: "jwt" },
  // 카카오 자격증명은 AUTH_KAKAO_ID / AUTH_KAKAO_SECRET 환경변수에서 자동으로 읽음.
  providers: [Kakao],
  pages: { signIn: "/login" },
  // 폰(LAN IP)·프리뷰 등 다양한 호스트에서 접근해도 막히지 않게.
  trustHost: true,
  callbacks: {
    // 최초 로그인 시 user.id를 토큰에 실어 이후 요청에서 소유자 식별에 사용.
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      return session;
    },
  },
});
