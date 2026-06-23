import { signIn } from "@/auth";

export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-10 p-6">
      <div className="flex flex-col items-center gap-2">
        <span className="animate-bob text-6xl">🍚</span>
        <h1 className="font-display text-3xl text-ink">밥로그</h1>
        <p className="text-sm text-muted">사진 한 장이면 끝.</p>
      </div>

      <form
        action={async () => {
          "use server";
          await signIn("kakao", { redirectTo: "/" });
        }}
      >
        <button
          type="submit"
          className="rounded-2xl bg-[#FEE500] px-7 py-3.5 font-display text-lg text-[#191600] shadow-sm transition active:scale-95"
        >
          카카오로 시작하기
        </button>
      </form>
    </main>
  );
}
