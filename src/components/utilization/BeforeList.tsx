import { computeScore } from "../../lib/scoring";
import type { Household } from "../../lib/types";

// Before — 행복e음식 명단 통보. 점수순 목록만 있고 '왜·무엇을 먼저'가 없다.
export default function BeforeList({ list }: { list: Household[] }) {
  const sc = (h: Household) => computeScore(h.signals, h.profileGroup).score;
  return (
    <div className="divide-y divide-slate-100">
      {list.map((h) => (
        <div
          key={h.id}
          className="flex items-center justify-between px-4 py-3 text-sm"
        >
          <span className="font-mono text-slate-500">{h.id}</span>
          <span className="font-bold tabular-nums text-slate-700">
            {sc(h)}점
          </span>
        </div>
      ))}
    </div>
  );
}
