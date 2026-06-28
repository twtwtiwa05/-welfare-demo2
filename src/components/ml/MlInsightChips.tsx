import { Layers3, TrendingUp } from "lucide-react";
import type { Household } from "../../lib/types";
import { ml, clusterStyle } from "../../lib/ml";
import { priorityBreakdown } from "../../lib/priority";

// "왜 위로 왔나" + 궤적 군집 칩 (작업 B). 투명 융합 우선순위의 사유를 그대로 노출.
export default function MlInsightChips({
  household,
  showCluster = true,
}: {
  household: Household;
  showCluster?: boolean;
}) {
  const m = ml(household);
  const { reasons } = priorityBreakdown(household);
  const cs = clusterStyle(m.clusterLabel);

  return (
    <div className="flex flex-wrap items-center gap-1">
      {showCluster && m.clusterId >= 0 && (
        <span
          className={`chip border !px-1.5 !py-0 text-[10px] ${cs.chip}`}
          title={cs.blurb}
        >
          <Layers3 size={10} /> {m.clusterLabel}
        </span>
      )}
      {reasons.map((r, i) => (
        <span
          key={i}
          className="chip border border-slate-200 bg-slate-50 !px-1.5 !py-0 text-[10px] text-slate-600"
        >
          {r.startsWith("최근 +") && <TrendingUp size={10} className="text-rose-500" />}
          {r}
        </span>
      ))}
    </div>
  );
}
