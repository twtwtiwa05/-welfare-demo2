import { useMemo, useState } from "react";
import { Phone, Check, Route as RouteIcon, ChevronRight, Zap } from "lucide-react";
import { regionCandidates, brief } from "../../lib/mobileData";
import { rankByPriority } from "../../lib/priority";
import { groupByProximity } from "../../lib/routing";
import { computeScore } from "../../lib/scoring";
import { isRapidDecline } from "../../lib/ml";
import { caseMeta } from "../../lib/caseMeta";
import RiskBadge from "../RiskBadge";
import RouteMap from "../visit/RouteMap";

// 모바일 방문계획 — 실제 현장용 "오늘의 동선". 터치 친화 경로 + 방문 체크리스트.
// ⚠️ 발표용 설명 카피 없음. 담당자가 외근에서 바로 참고하는 화면.
export default function MobileVisit({
  region,
  myOnly,
  onOpenCase,
}: {
  region: string;
  myOnly: boolean;
  onOpenCase: (id: string) => void;
}) {
  const candidates = useMemo(
    () => rankByPriority(regionCandidates(region, myOnly)).slice(0, 12).map((r) => r.household),
    [region, myOnly]
  );
  const groups = useMemo(
    () => groupByProximity(candidates, { maxGroupSize: 5, radius: 0.25 }),
    [candidates]
  );
  const [gi, setGi] = useState(0);
  const [visited, setVisited] = useState<Set<string>>(new Set());

  const group = groups[gi] ?? groups[0];
  const stops = group?.ordered ?? [];
  const doneCount = stops.filter((s) => visited.has(s.id)).length;

  function toggleVisited(id: string) {
    setVisited((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  if (stops.length === 0) {
    return (
      <div className="px-3">
        <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-400">
          오늘 방문할 대상이 없습니다.
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 pb-2">
      {/* 동선 요약 */}
      <div className="mb-3 rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 to-white p-4 shadow-card">
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-brand-600">
              <RouteIcon size={13} /> 오늘의 동선
            </div>
            <div className="mt-0.5 text-xl font-bold text-slate-800">
              {group.dong} 일대 {stops.length}곳
            </div>
            <div className="mt-0.5 text-xs text-slate-500">
              인접 가구를 한 번에 — 위에서부터 순서대로
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-slate-400">방문 완료</div>
            <div className="text-2xl font-bold tabular-nums leading-none text-brand-700">
              {doneCount}
              <span className="text-base text-slate-400">/{stops.length}</span>
            </div>
          </div>
        </div>
        {/* 진행 바 */}
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white shadow-inset">
          <div
            className="h-full rounded-full bg-brand-500 transition-all duration-300"
            style={{ width: `${(doneCount / stops.length) * 100}%` }}
          />
        </div>
      </div>

      {/* 동선 묶음 선택 */}
      {groups.length > 1 && (
        <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
          {groups.map((g, i) => (
            <button
              key={i}
              onClick={() => setGi(i)}
              aria-pressed={i === gi}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                i === gi
                  ? "border-brand-300 bg-brand-50 text-brand-700"
                  : "border-slate-200 bg-white text-slate-500"
              }`}
            >
              {g.dong} {g.ordered.length}곳
            </button>
          ))}
        </div>
      )}

      {/* 지도 (경로) */}
      <div className="mb-3">
        <RouteMap all={candidates} stops={stops} onPick={onOpenCase} />
      </div>

      {/* 방문 순서 (체크리스트) */}
      <ol className="relative space-y-2">
        {stops.map((h, i) => {
          const score = computeScore(h.signals, h.profileGroup).score;
          const meta = caseMeta(h, score);
          const isVisited = visited.has(h.id);
          const tel = "010-0000-" + meta.maskedPhone.slice(-4);
          return (
            <li
              key={h.id}
              className={`rounded-2xl border p-3 shadow-card transition-all ${
                isVisited ? "border-emerald-200 bg-emerald-50/40" : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={() => toggleVisited(h.id)}
                  aria-pressed={isVisited}
                  aria-label={isVisited ? "방문 취소" : "방문 완료 표시"}
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums transition-colors ${
                    isVisited ? "bg-emerald-500 text-white" : "bg-brand-600 text-white"
                  }`}
                >
                  {isVisited ? <Check size={18} /> : i + 1}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`font-mono text-sm font-semibold ${
                        isVisited ? "text-slate-400 line-through" : "text-slate-800"
                      }`}
                    >
                      {h.id}
                    </span>
                    <RiskBadge score={score} size="sm" />
                    {isRapidDecline(h) && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-600">
                        <Zap size={9} aria-hidden /> 급속악화
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{meta.maskedAddress}</p>
                  <p className="mt-0.5 text-xs font-medium text-slate-600">{brief(h)}</p>

                  <div className="mt-2.5 flex items-center gap-2">
                    <a
                      href={`tel:${tel}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white active:bg-brand-700"
                    >
                      <Phone size={13} /> 전화
                    </a>
                    <button
                      onClick={() => onOpenCase(h.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 active:bg-slate-50"
                    >
                      상세 <ChevronRight size={13} />
                    </button>
                    <button
                      onClick={() => toggleVisited(h.id)}
                      className={`ml-auto rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                        isVisited
                          ? "bg-emerald-100 text-emerald-700"
                          : "border border-slate-200 bg-white text-slate-500 active:bg-slate-50"
                      }`}
                    >
                      {isVisited ? "방문함 ✓" : "방문 완료"}
                    </button>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <p className="mt-3 px-1 text-center text-[11px] text-slate-400">
        순서·포함 여부는 담당자가 조정합니다. 좌표는 합성 데이터입니다.
      </p>
    </div>
  );
}
