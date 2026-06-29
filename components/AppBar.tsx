"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";

// 4개 메인 탭(기록/히스토리/체중/보고서)이 공유하는 상단 앱바. 제목만 페이지별로 다름.
export default function AppBar({ title }: { title: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="flex items-center justify-between pt-2">
      <h1 className="font-display text-2xl text-ink">{title}</h1>
      <div className="relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="설정 메뉴"
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
                설정
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
