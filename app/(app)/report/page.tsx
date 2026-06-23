// Phase 3에서 구현 (기간 집계 + "밥로그의 한마디").
export default function ReportPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
      <span className="animate-bob text-5xl">🍚</span>
      <p className="font-display text-lg text-ink">이번 주 돌아보기</p>
      <p className="text-sm text-muted">
        한 주를 정리해 밥로그가 한마디 건네줄게요. (곧 들어와요)
      </p>
    </main>
  );
}
