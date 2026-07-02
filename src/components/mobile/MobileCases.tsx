import { useMemo, useState } from "react";
import { Search, Zap, ChevronRight, Siren, SearchX } from "lucide-react";
import { regionCandidates, brief } from "../../lib/mobileData";
import { rankByPriority } from "../../lib/priority";
import { isRapidDecline } from "../../lib/ml";
import { riskBand, BAND_STYLES, type Band } from "../../lib/scoring";
import { useCaseState } from "../../lib/caseState";
import { radioGroupNav } from "../../lib/radioNav";
import StatusBadge from "../StatusBadge";

type QuickFilter = "all" | "high" | "rapid";

// 모바일 케이스 목록 — 검색 + 빠른 필터(통계 타일이 곧 필터) + 탭하면 풀스크린 상세.
// 위계: 점수 타일(색+라벨)이 위험도를 한 번만 말한다 — 중복 배지 없음.
export default function MobileCases({
  region,
  myOnly,
  onOpenCase,
}: {
  region: string;
  myOnly: boolean;
  onOpenCase: (id: string) => void;
}) {
  const { getStatus, isEmergency } = useCaseState();
  const [q, setQ] = useState("");
  const [quick, setQuick] = useState<QuickFilter>("all");

  const ranked = useMemo(
    () => rankByPriority(regionCandidates(region, myOnly)),
    [region, myOnly]
  );

  const high = ranked.filter((r) => r.score >= 80).length;
  const rapid = ranked.filter((r) => r.rapid).length;
  const emergCount = ranked.filter((r) => isEmergency(r.household.id)).length;

  const k = q.trim().toLowerCase();
  const filtered = ranked
    .filter((r) => {
      if (quick === "high" && r.score < 80) return false;
      if (quick === "rapid" && !r.rapid) return false;
      if (k && !`${r.household.id} ${r.household.dong}`.toLowerCase().includes(k))
        return false;
      return true;
    })
    // 긴급 SOS는 항상 최상단
    .sort(
      (a, b) =>
        (isEmergency(b.household.id) ? 1 : 0) -
        (isEmergency(a.household.id) ? 1 : 0)
    );

  return (
    <div className="px-4 pb-2">
      {/* 긴급 SOS 배너 */}
      {emergCount > 0 && (
        <div
          role="alert"
          className="mb-3 flex items-center gap-2 rounded-lg bg-danger-500 px-3.5 py-3 text-white shadow-card"
        >
          <Siren size={18} className="shrink-0 animate-pulse" aria-hidden />
          <span className="flex-1 text-sm font-bold">
            긴급 SOS {emergCount}건 — 즉시 확인 필요
          </span>
        </div>
      )}

      {/* 빠른 필터 = 미니 통계 (탭하면 그 조건으로 걸러짐) */}
      <div
        role="radiogroup"
        aria-label="빠른 필터"
        onKeyDown={radioGroupNav}
        className="mb-3 grid grid-cols-3 gap-2"
      >
        <StatFilter
          label="발굴 후보"
          value={ranked.length}
          tone="slate"
          active={quick === "all"}
          onClick={() => setQuick("all")}
        />
        <StatFilter
          label="고위험"
          value={high}
          tone="danger"
          active={quick === "high"}
          onClick={() => setQuick("high")}
        />
        <StatFilter
          label="급속악화"
          value={rapid}
          tone="danger"
          icon={<Zap size={11} aria-hidden />}
          active={quick === "rapid"}
          onClick={() => setQuick("rapid")}
        />
      </div>

      {/* 검색 */}
      <div className="relative mb-3">
        <Search
          size={16}
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="대상자 ID·행정동 검색"
          aria-label="대상자 ID 또는 행정동 검색"
          className="min-h-[2.75rem] w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus-visible:border-brand-400 dark:border-night-600 dark:bg-night-850 dark:text-slate-200 dark:placeholder:text-slate-500"
        />
      </div>

      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        케이스 {filtered.length}건 표시
      </p>

      {/* 케이스 카드 목록 */}
      <ul className="space-y-2">
        {filtered.map((r) => {
          const h = r.household;
          const status = getStatus(h.id);
          const emerg = isEmergency(h.id);
          return (
            <li key={h.id}>
              <button
                onClick={() => onOpenCase(h.id)}
                className={`press flex w-full items-center gap-3 rounded-lg border p-3 text-left shadow-card transition-colors ${
                  emerg
                    ? "border-danger-500 bg-danger-50 active:bg-danger-50/70 dark:border-danger-500 dark:bg-danger-500/10"
                    : "border-slate-200 bg-white active:bg-slate-50 dark:border-night-700 dark:bg-night-850 dark:active:bg-night-800"
                }`}
              >
                <ScoreTile score={r.score} emergency={emerg} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="font-mono text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {h.id}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      {h.dong}
                    </span>
                    {emerg ? (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-danger-500 px-1.5 py-0.5 text-[0.65rem] font-bold text-white">
                        <Siren size={9} aria-hidden /> 긴급 SOS
                      </span>
                    ) : (
                      isRapidDecline(h) && (
                        <span className="inline-flex items-center gap-0.5 rounded-full border border-danger-500/30 bg-danger-50 px-1.5 py-0.5 text-[0.65rem] font-bold text-danger-500 dark:bg-danger-500/10 dark:text-danger-300">
                          <Zap size={9} aria-hidden /> 급속악화
                        </span>
                      )
                    )}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">
                    {brief(h)}
                  </span>
                  <span className="mt-1.5 block">
                    <StatusBadge status={status} size="sm" />
                  </span>
                </span>
                <ChevronRight
                  size={18}
                  className="shrink-0 text-slate-300 dark:text-night-600"
                  aria-hidden
                />
              </button>
            </li>
          );
        })}
        {filtered.length === 0 && (
          <li className="rounded-lg border border-dashed border-slate-300 bg-white/60 py-12 text-center dark:border-night-600 dark:bg-night-850/60">
            <SearchX
              size={26}
              className="mx-auto text-slate-300 dark:text-night-600"
              aria-hidden
            />
            <p className="mt-3 text-sm font-semibold text-slate-500 dark:text-slate-400">
              조건에 맞는 케이스가 없습니다
            </p>
            <button
              onClick={() => {
                setQ("");
                setQuick("all");
              }}
              className="mt-2 text-xs font-semibold text-brand-600 underline underline-offset-2 dark:text-brand-300"
            >
              검색·필터 초기화
            </button>
          </li>
        )}
      </ul>
    </div>
  );
}

// 점수 타일 — 숫자 + 구간 라벨을 한 곳에서(색만으로 전달 금지 원칙).
function ScoreTile({ score, emergency }: { score: number; emergency: boolean }) {
  const band: Band = riskBand(score);
  const label = BAND_STYLES[band].label;
  const tone =
    band === "high"
      ? "bg-danger-50 text-danger-700 dark:bg-danger-500/15 dark:text-danger-300"
      : band === "mid"
        ? "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-500"
        : "bg-slate-100 text-slate-500 dark:bg-night-800 dark:text-slate-400";
  if (emergency) {
    return (
      <span
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-danger-500 text-white"
        aria-label="긴급 SOS 등록됨"
      >
        <Siren size={20} aria-hidden />
      </span>
    );
  }
  return (
    <span
      className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg tabular-nums ${tone}`}
      aria-label={`위험 ${score}점 · ${label}`}
    >
      <span className="text-lg font-bold leading-none">{score}</span>
      <span className="mt-0.5 text-[0.6rem] font-semibold">{label}</span>
    </span>
  );
}

function StatFilter({
  label,
  value,
  tone,
  icon,
  active,
  onClick,
}: {
  label: string;
  value: number;
  tone: "slate" | "danger";
  icon?: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  const num =
    tone === "danger"
      ? "text-danger-500 dark:text-danger-300"
      : "text-slate-800 dark:text-slate-100";
  return (
    <button
      onClick={onClick}
      role="radio"
      aria-checked={active}
      tabIndex={active ? 0 : -1}
      className={`press rounded-lg border p-2.5 text-center shadow-card transition-colors ${
        active
          ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500 dark:bg-brand-950/50"
          : "border-slate-200 bg-white dark:border-night-700 dark:bg-night-850"
      }`}
    >
      <span className={`block text-xl font-bold tabular-nums leading-none ${num}`}>
        {value}
      </span>
      <span className="mt-1 flex items-center justify-center gap-0.5 text-[0.7rem] font-medium text-slate-500 dark:text-slate-400">
        {icon}
        {label}
      </span>
    </button>
  );
}
