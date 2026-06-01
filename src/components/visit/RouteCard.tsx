import { computeScore } from "../../lib/scoring";
import { caseMeta } from "../../lib/caseMeta";
import type { Household } from "../../lib/types";
import {
  Navigation,
  ChevronUp,
  ChevronDown,
  X,
  ArrowUpRight,
} from "lucide-react";

const sc = (h: Household) => computeScore(h.signals, h.profileGroup).score;

// 우측 하단 — '오늘의 동선' 카드. 순서 변경·제외는 담당자가 한다(원칙 4: 사람이 최종 결정).
export default function RouteCard({
  dong,
  stops,
  onMove,
  onRemove,
  onGotoCase,
}: {
  dong: string;
  stops: Household[];
  onMove: (i: number, dir: -1 | 1) => void;
  onRemove: (id: string) => void;
  onGotoCase: (id: string) => void;
}) {
  return (
    <div className="card overflow-hidden">
      <div className="card-head">
        <span className="card-title flex items-center gap-1.5">
          <Navigation size={15} className="text-brand-600" /> 오늘의 동선
        </span>
        <span className="chip bg-brand-50 text-brand-700">
          {dong} 일대 {stops.length}가구
        </span>
      </div>

      {stops.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-slate-400">
          이 묶음에 포함된 가구가 없습니다
        </div>
      ) : (
        <ol className="divide-y divide-slate-100">
          {stops.map((h, i) => {
            const m = caseMeta(h, sc(h));
            return (
              <li key={h.id} className="flex items-center gap-2.5 px-4 py-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold tabular-nums text-white">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs text-slate-600">{h.id}</span>
                    <span className="text-xs text-slate-400">{h.dong}</span>
                  </div>
                  <div className="truncate text-[11px] text-slate-400">
                    {m.maskedAddress}
                  </div>
                </div>
                <span className="shrink-0 text-sm font-bold tabular-nums text-slate-700">
                  {sc(h)}
                </span>
                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    onClick={() => onMove(i, -1)}
                    disabled={i === 0}
                    aria-label="위로"
                    className="icon-circle-sm !h-7 !w-7 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30"
                  >
                    <ChevronUp size={15} />
                  </button>
                  <button
                    onClick={() => onMove(i, 1)}
                    disabled={i === stops.length - 1}
                    aria-label="아래로"
                    className="icon-circle-sm !h-7 !w-7 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30"
                  >
                    <ChevronDown size={15} />
                  </button>
                  <button
                    onClick={() => onRemove(h.id)}
                    aria-label="동선에서 제외"
                    className="icon-circle-sm !h-7 !w-7 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                  >
                    <X size={15} />
                  </button>
                  <button
                    onClick={() => onGotoCase(h.id)}
                    aria-label="케이스 상세"
                    className="icon-circle-sm !h-7 !w-7 text-slate-400 transition-colors hover:bg-brand-50 hover:text-brand-600"
                  >
                    <ArrowUpRight size={15} />
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-2.5 text-[11px] leading-relaxed text-slate-500">
        ※ 순서·포함 여부는 담당자가 최종 결정합니다. 동선은 거리 기반 권고일 뿐이며,
        시스템은 강제하지 않습니다 (책임 분리·원칙 4).
      </div>
    </div>
  );
}
