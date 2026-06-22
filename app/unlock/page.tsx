"use client";

import { useActionState } from "react";
import { unlock } from "./actions";

export default function UnlockPage() {
  const [error, action, pending] = useActionState(unlock, undefined);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-xl font-semibold">밥로그</h1>
      <form action={action} className="flex w-full max-w-xs flex-col gap-3">
        <input
          type="password"
          name="passcode"
          placeholder="패스코드"
          autoFocus
          required
          className="rounded border px-3 py-2"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-black px-3 py-2 text-white disabled:opacity-50"
        >
          입장
        </button>
      </form>
    </main>
  );
}
