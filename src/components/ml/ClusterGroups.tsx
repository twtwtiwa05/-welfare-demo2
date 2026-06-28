import { Layers3, Zap, Users } from "lucide-react";
import type { Household } from "../../lib/types";
import { computeScore } from "../../lib/scoring";
import { groupByCluster, clusterStyle, isRapidDecline } from "../../lib/ml";
import RiskBadge from "../RiskBadge";

// 궤적 군집 그룹 카드 (작업 B-5 / 방문계획). 비슷한 악화 패턴끼리 묶어 우선순위 그룹화.
// ⚠️ ML은 그룹화·정렬까지만. 누구를 방문할지 최종 결정은 담당자(G4).
const sc = (h: Household) => computeScore(h.signals, h.profileGroup).score;

export default function ClusterGroups({
  households,
  onPick,
}: {
  households: Household[];
  onPick: (id: string) => void;
}) {
  const groups = groupByCluster(households).filter((g) => g.label !== "안정·관찰 (저위험군)");

  return (
    <div className="card overflow-hidden">
      <div className="card-head flex-wrap gap-2">
        <span className="card-title flex items-center gap-1.5">
          <Layers3 size={15} className="text-brand-600" /> 궤적 군집 (우선순위 그룹)
        </span>
        <span className="text-[11px] text-slate-400">k-means · 비슷한 악화 패턴끼리</span>
      </div>
      <p className="border-b border-slate-100 bg-slate-50/50 px-4 py-2 text-[11px] leading-relaxed text-slate-400">
        대량 가구를 패턴별로 묶어 담당자가 집중할 그룹을 가립니다. ‘급속 다변량 악화’가 우선 점검
        1순위입니다.
      </p>
      <div className="divide-y divide-slate-100">
        {groups.map((g) => {
          const cs = clusterStyle(g.label);
          const top = [...g.members].sort((a, b) => sc(b) - sc(a)).slice(0, 4);
          const isRapidGroup = g.label === "급속 다변량 악화";
          return (
            <div
              key={g.label}
              className={`p-3 ${isRapidGroup ? "bg-rose-50/40" : ""}`}
            >
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <span className={`chip border !py-0.5 text-[11px] font-bold ${cs.chip}`}>
                  {isRapidGroup ? <Zap size={11} /> : <Layers3 size={11} />}
                  {g.label}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                  <Users size={11} /> {g.members.length}가구
                </span>
                {g.rapidCount > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-rose-600">
                    <Zap size={11} /> 급속악화 {g.rapidCount}
                  </span>
                )}
                <span className="ml-auto text-[10px] text-slate-400">
                  평균 이상도 {Math.round(g.avgAnomaly * 100)}
                </span>
              </div>
              <p className="mb-2 text-[11px] leading-relaxed text-slate-500">{cs.blurb}</p>
              <div className="flex flex-wrap gap-1.5">
                {top.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => onPick(h.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] transition-colors hover:border-brand-300 hover:bg-brand-50"
                  >
                    <span className="font-mono text-slate-600">{h.id}</span>
                    <span className="tabular-nums font-bold text-slate-700">{sc(h)}</span>
                    {isRapidDecline(h) && (
                      <>
                        <Zap size={10} className="text-rose-500" aria-hidden />
                        <span className="sr-only">급속악화</span>
                      </>
                    )}
                    <RiskBadge score={sc(h)} size="sm" />
                  </button>
                ))}
                {g.members.length > top.length && (
                  <span className="inline-flex items-center px-1 text-[11px] text-slate-400">
                    +{g.members.length - top.length}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
