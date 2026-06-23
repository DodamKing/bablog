import BottomNav from "@/components/BottomNav";

// 하단 탭이 붙는 메인 앱 영역. /login 은 이 그룹 밖이라 네비 없음.
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col pb-16">
      {children}
      <BottomNav />
    </div>
  );
}
