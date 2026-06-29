import { useMemo, useState } from "react";
import { Search, Zap, ChevronRight } from "lucide-react";
import { regionCandidates, brief } from "../../lib/mobileData";
import { rankByPriority } from "../../lib/priority";
import { isRapidDecline } from "../../lib/ml";
import {
  useCaseState,
  STATUS_META,
  STATUS_ORDER,
  type CaseStatus,
} from "../../lib/caseState";
import RiskBadge from "../RiskBadge";
import StatusBadge from "../StatusBadge";

// 모바일 케이스 목록 — 검색·상태 필터·탭하면 풀스크린 상세. 발표 카피 없음.
export default function MobileCases({
  region,
  myOnly,
  onOpenCase,
}: {
  region: string;
  myOnly: boolean;
  onOpenCase: (id: string) => void;
}) {
  const { getStatus } = useCaseState();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<CaseStatus | "all">("all");

  const ranked = useMemo(
    () => rankByPriority(regionCandidates(region, myOnly)),
    [region, myOnly]
  );

  const high = ranked.filter((r) => r.score >= 80).length;
  const rapid = ranked.filter((r) => r.rapid).length;

  const k = q.trim().toLowerCase();
  const filtered = ranked.filter((r) => {
    if (statusFilter !== "all" && getStatus(r.household.id) !== statusFilter)
      return false;
    if (k && !`${r.household.id} ${r.household.dong}`.toLowerCase().includes(k))
      return false;
    return true;
  });

  return (
    <div className="px-3 pb-2">
      {/* 미니 통계 */}
      <div className="mb-3 grid grid-cols-3 gap-2">
        <Stat label="발굴 후보" value={ranked.length} tone="slate" />
        <Stat label="고위험" value={high} tone="red" />
        <Stat label="급속악화" value={rapid} tone="rose" />
      </div>

      {/* 검색 */}
      <div className="relative mb-2.5">
        <Search
          size={16}
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="대상자 ID·행정동 검색"
          aria-label="대상자 ID 또는 행정동 검색"
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus-visible:border-brand-400"
        />
      </div>

      {/* 상태 필터 칩 */}
      <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
        <FilterChip active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>
          전체 {ranked.length}
        </FilterChip>
        {STATUS_ORDER.map((s) => {
          const n = ranked.filter((r) => getStatus(r.household.id) === s).length;
          return (
            <FilterChip key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)}>
              {STATUS_META[s].label} {n}
            </FilterChip>
          );
        })}
      </div>

      {/* 케이스 카드 목록 */}
      <ul className="space-y-2">
        {filtered.map((r) => {
          const h = r.household;
          const status = getStatus(h.id);
          return (
            <li key={h.id}>
              <button
                onClick={() => onOpenCase(h.id)}
                className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-card transition-colors active:bg-slate-50"
              >
                <div
                  className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl tabular-nums ${
                    r.score >= 80
                      ? "bg-red-50 text-red-700"
                      : r.score >= 50
                        ? "bg-amber-50 text-amber-700"
                        : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <span className="text-lg font-bold leading-none">{r.score}</span>
                  <span className="text-[9px] font-semibold opacity-70">점</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-sm font-semibold text-slate-800">
                      {h.id}
                    </span>
                    <span className="text-xs text-slate-400">{h.dong}</span>
                    {isRapidDecline(h) && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-600">
                        <Zap size={9} aria-hidden /> 급속악화
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-slate-500">{brief(h)}</p>
                  <div className="mt-1">
                    <StatusBadge status={status} size="sm" />
                  </div>
                </div>
                <RiskBadge score={r.score} size="sm" />
                <ChevronRight size={18} className="shrink-0 text-slate-300" aria-hidden />
              </button>
            </li>
          );
        })}
        {filtered.length === 0 && (
          <li className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">
            조건에 맞는 케이스가 없습니다.
          </li>
        )}
      </ul>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "slate" | "red" | "rose";
}) {
  const color =
    tone === "red" ? "text-red-600" : tone === "rose" ? "text-rose-600" : "text-slate-800";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-2.5 text-center shadow-card">
      <div className={`text-xl font-bold tabular-nums leading-none ${color}`}>{value}</div>
      <div className="mt-1 text-[11px] text-slate-500">{label}</div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
        active
          ? "border-brand-300 bg-brand-50 text-brand-700"
          : "border-slate-200 bg-white text-slate-500"
      }`}
    >
      {children}
    </button>
  );
}
