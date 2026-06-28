import type { RankedHousehold } from "../../lib/priority";
import RiskBadge from "../RiskBadge";
import AnomalyBadge from "../ml/AnomalyBadge";
import { History, ArrowUpRight, TrendingUp } from "lucide-react";

// 좌측 — 우선순위 리스트. 추세 반영 공식이 만든 순서(AI 아님).
export default function PriorityList({
  ranked,
  selectedIds,
  onPick,
  onGotoCase,
}: {
  ranked: RankedHousehold[];
  selectedIds: Set<string>;
  onPick: (id: string) => void;
  onGotoCase: (id: string) => void;
}) {
  return (
    <div className="card flex min-h-0 flex-col overflow-hidden">
      <div className="card-head">
        <span className="card-title">우선순위</span>
        <span className="chip bg-brand-50 text-brand-700">{ranked.length}건</span>
      </div>
      <p className="border-b border-slate-100 bg-slate-50/50 px-4 py-2 text-[11px] leading-relaxed text-slate-400">
        우선순위 = 위험점수 + <b className="text-rose-500">급속악화(ML)</b> + 최근 상승폭 + 반복 통보 ·
        투명 융합(블랙박스 아님)
      </p>
      <div className="scroll-slim min-h-0 flex-1 divide-y divide-slate-100 overflow-auto">
        {ranked.map((r) => {
          const h = r.household;
          const inRoute = selectedIds.has(h.id);
          const motif = h.repeatedFlags >= 8;
          const top3 = r.rank <= 3;
          return (
            <div
              key={h.id}
              className={`flex items-center gap-1 pr-2 transition-colors ${
                inRoute ? "bg-brand-50" : "hover:bg-slate-50"
              }`}
            >
              <button
                onClick={() => onPick(h.id)}
                className="flex flex-1 items-center gap-2.5 px-4 py-2.5 text-left"
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold tabular-nums ${
                    top3 ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {r.rank}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs text-slate-600">{h.id}</span>
                    <span className="text-xs text-slate-400">{h.dong}</span>
                    {motif && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-brand-600">
                        <History size={10} /> {h.repeatedFlags}회
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
                    <span className="font-bold tabular-nums text-slate-700">
                      {r.score}점
                    </span>
                    {r.delta > 0 && (
                      <span className="inline-flex items-center gap-0.5 font-semibold text-red-600">
                        <TrendingUp size={11} /> +{r.delta}
                      </span>
                    )}
                    {(r.rapid || r.anomaly >= 0.4) && (
                      <AnomalyBadge household={h} size="sm" />
                    )}
                  </div>
                </div>
                <RiskBadge score={r.score} size="sm" />
              </button>
              <button
                onClick={() => onGotoCase(h.id)}
                title="케이스 상세 보기"
                aria-label={`${h.id} 케이스 상세`}
                className="icon-circle-sm text-slate-300 transition-colors hover:bg-brand-50 hover:text-brand-600"
              >
                <ArrowUpRight size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
