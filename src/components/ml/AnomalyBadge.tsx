import { Activity, Zap } from "lucide-react";
import type { Household } from "../../lib/types";
import { ml, anomalyLevel, ANOMALY_STYLES, isRapidDecline } from "../../lib/ml";

// ML 다변량 이상도 배지 (작업 B). 급속악화면 강조 배지, 아니면 이상도 구간.
// ⚠️ 이건 위험 '판정'이 아니라 보조 선별 신호다 — 헤드라인 점수는 별도(투명 공식).
export default function AnomalyBadge({
  household,
  size = "md",
}: {
  household: Household;
  size?: "sm" | "md";
}) {
  const m = ml(household);
  const rapid = isRapidDecline(household);
  const lvl = anomalyLevel(m.anomalyScore);
  const s = ANOMALY_STYLES[lvl];
  const pad = size === "sm" ? "px-1.5 py-0 text-[10px]" : "px-2 py-0.5 text-[11px]";

  if (rapid) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full border border-rose-300 bg-rose-50 font-bold text-rose-700 ${pad}`}
        title={`다변량 이상점수 ${m.anomalyScore.toFixed(2)} · 상위 ${Math.round(100 - m.anomalyPercentile)}%`}
      >
        <Zap size={size === "sm" ? 10 : 12} className="shrink-0" /> 급속악화
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-semibold ${s.text} ${s.bg} ${s.border} ${pad}`}
      title={`다변량 이상점수 ${m.anomalyScore.toFixed(2)}`}
    >
      <Activity size={size === "sm" ? 10 : 12} className="shrink-0" />
      이상도 {Math.round(m.anomalyScore * 100)}
    </span>
  );
}
