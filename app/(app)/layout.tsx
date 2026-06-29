import AppShell from "@/components/AppShell";

// 하단 탭이 붙는 메인 앱 영역. /login 은 이 그룹 밖이라 네비 없음.
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
