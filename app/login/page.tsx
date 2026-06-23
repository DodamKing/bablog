import { signIn } from "@/auth";

export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 p-6">
      <div className="flex flex-col items-center gap-2">
        <span className="text-5xl">🍚</span>
        <h1 className="text-2xl font-bold">밥로그</h1>
        <p className="text-sm text-neutral-500">사진 한 장이면 끝.</p>
      </div>

      <form
        action={async () => {
          "use server";
          await signIn("kakao", { redirectTo: "/" });
        }}
      >
        <button
          type="submit"
          className="rounded-xl bg-[#FEE500] px-6 py-3 font-medium text-[#191600] shadow-sm transition active:scale-95"
        >
          카카오로 시작하기
        </button>
      </form>
    </main>
  );
}
