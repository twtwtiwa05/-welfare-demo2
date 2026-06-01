import { riskBand, BAND_STYLES } from "../lib/scoring";

// 위험 구간 뱃지 — 색 + 라벨 병행(색약·프로젝터 대비, 5-A.5).
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
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold shadow-sm ${pad} ${s.bg} ${s.border} ${s.text}`}
    >
      <span className={`h-2 w-2 rounded-full ${s.dot}`} aria-hidden />
      {s.label}
    </span>
  );
}
