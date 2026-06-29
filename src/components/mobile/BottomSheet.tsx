import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

// 접근성 바텀시트 — role="dialog" + aria-modal + 포커스 트랩 + Escape + 포커스 복원.
// 프로필·알림·긴급 SOS 시트가 공유한다.
export default function BottomSheet({
  title,
  accent = "default",
  onClose,
  children,
}: {
  title: ReactNode;
  accent?: "default" | "danger";
  onClose: () => void;
  children: ReactNode;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const items = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])'
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`relative max-h-[88vh] overflow-auto rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)] shadow-card-hover animate-fadeIn focus-visible:outline-none ${
          accent === "danger" ? "border-t-4 border-red-500" : "border-t border-slate-200"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <span
            id={titleId}
            className={`flex items-center gap-1.5 text-sm font-bold ${
              accent === "danger" ? "text-red-600" : "text-slate-700"
            }`}
          >
            {title}
          </span>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="flex h-11 w-11 items-center justify-center rounded-full text-slate-400 active:bg-slate-100 active:text-slate-600"
          >
            <X size={20} aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
