"use client";

import { usePathname } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import NotificationOptIn from "@/components/NotificationOptIn";

// /settings는 헤더 ← 로 들어가는 드릴인 화면이라 하단 탭 없이 앱바만 — 탭 자체를 숨기고
// 탭 높이만큼의 하단 패딩도 같이 빼서 빈 공간이 안 남게 한다.
export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideNav = pathname === "/settings";

  return (
    <div
      className={`mx-auto flex w-full max-w-md flex-1 flex-col ${
        hideNav ? "" : "pb-[calc(4rem+env(safe-area-inset-bottom))]"
      }`}
    >
      <NotificationOptIn />
      {children}
      {!hideNav && <BottomNav />}
    </div>
  );
}
