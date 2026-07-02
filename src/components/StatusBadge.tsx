import { STATUS_META, type CaseStatus } from "../lib/caseState";

// 케이스 처리 상태 배지 — 색 + 라벨 병행.
// 다크 변형은 표현 계층(여기)에서만 관리 — caseState.tsx(로직)는 건드리지 않는다.
const DARK: Record<CaseStatus, string> = {
  new: "dark:bg-night-800 dark:text-slate-400 dark:border-night-600",
  checking: "dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
  visit: "dark:bg-brand-900/60 dark:text-brand-300 dark:border-brand-800",
  done: "dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
};

export default function StatusBadge({
  status,
  size = "md",
}: {
  status: CaseStatus;
  size?: "sm" | "md";
}) {
  const s = STATUS_META[status];
  const pad = size === "sm" ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-0.5 text-xs";
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border font-semibold ${pad} ${s.chip} ${DARK[status]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} aria-hidden />
      {s.label}
    </span>
  );
}
