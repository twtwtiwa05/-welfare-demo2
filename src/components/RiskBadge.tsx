import { riskBand, BAND_STYLES, type Band } from "../lib/scoring";

// 위험 구간 뱃지 — 색 + 라벨 병행(색약·프로젝터 대비, 5-A.5).
// 다크 변형은 여기(표현 계층)에서만 관리한다 — scoring.ts(로직)는 건드리지 않는다.
const DARK: Record<Band, string> = {
  high: "dark:bg-red-950/60 dark:border-red-800 dark:text-red-300",
  mid: "dark:bg-amber-950/60 dark:border-amber-800 dark:text-amber-300",
  low: "dark:bg-night-800 dark:border-night-600 dark:text-slate-400",
};

export default function RiskBadge({
  score,
  size = "md",
}: {
  score: number;
  size?: "sm" | "md";
}) {
  const band = riskBand(score);
  const s = BAND_STYLES[band];
  const pad = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm";
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border font-semibold shadow-sm ${pad} ${s.bg} ${s.border} ${s.text} ${DARK[band]}`}
    >
      <span className={`h-2 w-2 rounded-full ${s.dot}`} aria-hidden />
      {s.label}
    </span>
  );
}
