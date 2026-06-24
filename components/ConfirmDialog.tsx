// 되돌릴 수 없는 동작(삭제) 전 확인. 화면 중앙 오버레이.
export default function ConfirmDialog({
  title,
  description,
  confirmLabel = "삭제",
  busy,
  onCancel,
  onConfirm,
}: {
  title: string;
  description?: string;
  confirmLabel?: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 px-6">
      <div className="w-full max-w-xs rounded-3xl bg-rice p-5 shadow-lg">
        <p className="font-display text-lg text-ink">{title}</p>
        {description && <p className="mt-1.5 text-sm text-ink/60">{description}</p>}
        <div className="mt-5 flex gap-2">
          <button
            onClick={onCancel}
            disabled={busy}
            className="flex-1 rounded-2xl bg-coral-soft py-2.5 text-sm font-medium text-ink/70 disabled:opacity-60"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="flex-1 rounded-2xl bg-coral py-2.5 text-sm font-medium text-white transition active:scale-95 disabled:opacity-60"
          >
            {busy ? "처리 중…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
