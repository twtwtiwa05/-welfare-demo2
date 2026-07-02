import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

// 접근성 바텀시트 — role="dialog" + aria-modal + 포커스 트랩 + Escape + 포커스 복원.
// 프로필·알림·긴급 SOS·iOS 설치 안내 시트가 공유한다. (그래버 + 스프링 모션 = 네이티브 감각)
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
  // 인라인 onClose가 부모 리렌더마다 새로 생겨도 트랩 effect는 마운트 1회만 돌게 ref로 격리
  // (매 커밋 cleanup→재실행되면 시트 내부 포커스를 패널 루트로 빼앗는다)
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const items = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
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
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px] animate-fadeIn"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`relative max-h-[88vh] overflow-auto rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)] shadow-card-hover animate-sheetUp focus-visible:outline-none dark:bg-night-850 ${
          accent === "danger"
            ? "border-t-4 border-danger-500"
            : "border-t border-slate-200 dark:border-night-700"
        }`}
      >
        {/* 그래버 — 시트임을 알리는 시각 단서 */}
        <div className="flex justify-center pt-2" aria-hidden="true">
          <span className="h-1 w-9 rounded-full bg-slate-300 dark:bg-night-600" />
        </div>
        <div className="flex items-center justify-between px-4 pb-2 pt-1.5">
          <span
            id={titleId}
            className={`flex items-center gap-1.5 text-[0.95rem] font-bold ${
              accent === "danger"
                ? "text-danger-500 dark:text-danger-300"
                : "text-slate-800 dark:text-slate-100"
            }`}
          >
            {title}
          </span>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-slate-400 active:bg-slate-100 active:text-slate-600 dark:active:bg-night-700 dark:active:text-slate-300"
          >
            <X size={20} aria-hidden />
          </button>
        </div>
        <div className="border-t border-slate-100 dark:border-night-700">{children}</div>
      </div>
    </div>
  );
}
