import { HOUSEHOLDS } from "../lib/data";
import { computeScore } from "../lib/scoring";
import { weeklyDelta } from "../lib/history";
import { caseMeta } from "../lib/caseMeta";
import { useCaseState } from "../lib/caseState";
import type { Household } from "../lib/types";
import RiskBadge from "./RiskBadge";
import { ClipboardList, Clock, TrendingUp, AlertTriangle, CalendarClock } from "lucide-react";

const RESIDUAL = HOUSEHOLDS.filter((h) => !h.haengbokFlagged);
const sc = (h: Household) => computeScore(h.signals, h.profileGroup).score;

type Reason = "overdue" | "rising" | "newHigh" | "visit";
const REASON_META: Record<
  Reason,
  { label: string; icon: React.ReactNode; chip: string; weight: number }
> = {
  newHigh: {
    label: "신규 고위험",
    icon: <AlertTriangle size={12} />,
    chip: "bg-red-50 text-red-700",
    weight: 4,
  },
  overdue: {
    label: "30일+ 미접촉",
    icon: <Clock size={12} />,
    chip: "bg-amber-50 text-amber-700",
    weight: 3,
  },
  visit: {
    label: "방문 예정",
    icon: <CalendarClock size={12} />,
    chip: "bg-brand-50 text-brand-700",
    weight: 2,
  },
  rising: {
    label: "급상승",
    icon: <TrendingUp size={12} />,
    chip: "bg-red-50 text-red-600",
    weight: 1,
  },
};

// '오늘의 업무' 워크리스트 — 담당자가 먼저 봐야 할 케이스를 자동 수집.
export default function TodayWork({
  selectedId,
  onSelect,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const { getStatus } = useCaseState();

  const items = RESIDUAL.map((h) => {
    const score = sc(h);
    const status = getStatus(h.id);
    const delta = weeklyDelta(h);
    const lastContact = caseMeta(h, score).lastContactDays;

    let reason: Reason | null = null;
    let detail = "";
    if (status === "new" && score >= 65) {
      reason = "newHigh";
      detail = `${score}점 · 미배정 검토`;
    } else if (status === "visit") {
      reason = "visit";
      detail = "방문 일정 확정 필요";
    } else if (lastContact > 30 && score >= 45) {
      reason = "overdue";
      detail = `${lastContact}일째 미접촉`;
    } else if (delta > 0 && score >= 45) {
      reason = "rising";
      detail = `이번 주 +${delta}점`;
    }
    return reason ? { h, score, reason, detail } : null;
  })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort(
      (a, b) =>
        REASON_META[b.reason].weight - REASON_META[a.reason].weight ||
        b.score - a.score
    );

  const top = items.slice(0, 6);

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-1.5 card-title">
          <ClipboardList size={16} className="text-brand-600" />
          오늘의 업무
        </div>
        <span className="chip bg-brand-50 text-brand-700">
          처리 권장 {items.length}건
        </span>
      </div>
      <div className="divide-y divide-slate-100">
        {top.map(({ h, score, reason, detail }) => {
          const rm = REASON_META[reason];
          return (
            <button
              key={h.id}
              onClick={() => onSelect(h.id)}
              className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors ${
                h.id === selectedId
                  ? "bg-brand-50 ring-1 ring-inset ring-brand-200"
                  : "hover:bg-slate-50"
              }`}
            >
              <span className="w-7 shrink-0 text-center tabular-nums text-base font-bold text-slate-800">
                {score}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs text-slate-500">{h.id}</span>
                  <span className="text-xs text-slate-400">{h.dong}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span className={`chip ${rm.chip} text-[10px]`}>
                    {rm.icon}
                    {rm.label}
                  </span>
                  <span className="truncate text-[11px] text-slate-400">
                    {detail}
                  </span>
                </div>
              </div>
              <RiskBadge score={score} size="sm" />
            </button>
          );
        })}
        {top.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-slate-400">
            오늘 처리할 권장 업무가 없습니다
          </div>
        )}
      </div>
    </div>
  );
}
