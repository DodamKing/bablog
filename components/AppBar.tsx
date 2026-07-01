"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

// 4개 메인 탭(홈/히스토리/체중/보고서) + 내 정보(드릴인)가 공유하는 상단 앱바.
// 제목만 페이지별로 다름. sticky+배경+elevation으로 하단탭과 대칭되는 고정감을 준다.
export default function AppBar({
  title,
  showBack = false,
}: {
  title: React.ReactNode;
  showBack?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  return (
    <header className="sticky top-0 z-20 -mx-4 flex items-center justify-between border-b border-line bg-rice/95 px-4 pt-[calc(0.5rem+env(safe-area-inset-top))] pb-2 backdrop-blur">
      <div className="flex items-center gap-2">
        {showBack && (
          <button
            onClick={() => router.back()}
            aria-label="뒤로"
            className="text-xl leading-none text-ink/70"
          >
            ←
          </button>
        )}
        <h1 className="font-display text-2xl text-ink">{title}</h1>
      </div>
      <div className="relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="내 정보 메뉴"
          className="text-xl leading-none text-muted"
        >
          ⚙️
        </button>
        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-20"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute right-0 top-full z-30 mt-1 w-28 overflow-hidden rounded-2xl border border-line bg-rice shadow-lg">
              <Link
                href="/settings"
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-2.5 text-sm text-ink/70 transition active:bg-coral-soft"
              >
                내 정보
              </Link>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  signOut();
                }}
                className="block w-full px-4 py-2.5 text-left text-sm text-ink/70 transition active:bg-coral-soft"
              >
                로그아웃
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
