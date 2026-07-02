import { useMemo, useRef, useState } from "react";
import {
  Phone,
  Check,
  Route as RouteIcon,
  ChevronRight,
  Zap,
  Siren,
  Navigation,
  PenLine,
} from "lucide-react";
import { regionCandidates, brief } from "../../lib/mobileData";
import { rankByPriority } from "../../lib/priority";
import { groupByProximity } from "../../lib/routing";
import { computeScore } from "../../lib/scoring";
import { isRapidDecline } from "../../lib/ml";
import { caseMeta } from "../../lib/caseMeta";
import { useCaseState } from "../../lib/caseState";
import { mapRouteUrl } from "../../lib/geo";
import {
  loadVisitLog,
  saveVisitLog,
  todayKey,
  EMPTY_LOG,
  type VisitLog,
} from "../../lib/visitLog";
import { radioGroupNav } from "../../lib/radioNav";
import RiskBadge from "../RiskBadge";
import RouteMap from "../visit/RouteMap";
import MobileSosSheet from "./MobileSosSheet";
import { getHousehold } from "../../lib/data";

// 모바일 방문계획 — 현장용 "오늘의 동선".
// 위계: 카드의 主액션은 '방문 완료 체크' 하나. 전화·길찾기는 보조, 상세는 카드 탭.
// 방문 체크·메모는 로컬에 남아 앱을 닫아도 오늘 안에는 이어진다.
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
    () =>
      rankByPriority(regionCandidates(region, myOnly))
        .slice(0, 12)
        .map((r) => r.household),
    [region, myOnly]
  );
  const groups = useMemo(
    () => groupByProximity(candidates, { maxGroupSize: 5, radius: 0.25 }),
    [candidates]
  );
  const [gi, setGi] = useState(0);
  const [log, setLog] = useState(loadVisitLog);
  const dayKey = useRef(todayKey());
  const [sosFor, setSosFor] = useState<string | null>(null);
  const { isEmergency, setEmergency } = useCaseState();

  const visited = useMemo(() => new Set(log.visited), [log.visited]);
  // 권역 전환으로 groups가 줄면 선택 인덱스를 0으로 클램프(표시·칩 활성 일치)
  const safeGi = gi < groups.length ? gi : 0;
  const group = groups[safeGi];
  const stops = group?.ordered ?? [];
  const doneCount = stops.filter((s) => visited.has(s.id)).length;
  const sosHousehold = sosFor ? getHousehold(sosFor) : null;

  // 자정 롤오버 방어 — 어제 로드한 기록이 오늘 키로 이월되지 않게 저장 전 날짜를 확인
  function mutateLog(fn: (base: VisitLog) => VisitLog) {
    setLog((prev) => {
      let base = prev;
      const k = todayKey();
      if (k !== dayKey.current) {
        dayKey.current = k;
        base = EMPTY_LOG;
      }
      const next = fn(base);
      saveVisitLog(next, dayKey.current);
      return next;
    });
  }
  function toggleVisited(id: string) {
    mutateLog((base) => ({
      ...base,
      visited: base.visited.includes(id)
        ? base.visited.filter((v) => v !== id)
        : [...base.visited, id],
    }));
  }
  function setMemo(id: string, text: string) {
    mutateLog((base) => ({ ...base, memos: { ...base.memos, [id]: text } }));
  }

  if (stops.length === 0) {
    return (
      <div className="px-4">
        <div className="rounded-lg border border-dashed border-slate-300 bg-white/60 py-14 text-center dark:border-night-600 dark:bg-night-850/60">
          <RouteIcon
            size={28}
            className="mx-auto text-slate-300 dark:text-night-600"
            aria-hidden
          />
          <p className="mt-3 text-sm font-semibold text-slate-500 dark:text-slate-400">
            오늘 방문할 대상이 없습니다
          </p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            권역 필터를 '전 권역'으로 바꾸면 더 볼 수 있어요.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pb-2">
      {/* 동선 요약 */}
      <section
        aria-label="오늘의 동선 요약"
        className="mb-3 rounded-lg border border-brand-100 bg-brand-50 p-4 shadow-card dark:border-brand-900 dark:bg-brand-950/40"
      >
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-300">
              <RouteIcon size={13} aria-hidden /> 오늘의 동선
            </div>
            <div className="mt-0.5 text-xl font-bold text-slate-800 dark:text-slate-100">
              {group.dong} 일대 {stops.length}곳
            </div>
            <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              인접 가구를 한 번에 — 위에서부터 순서대로
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-[0.7rem] text-slate-400 dark:text-slate-500">
              방문 완료
            </div>
            <div className="text-2xl font-bold tabular-nums leading-none text-brand-700 dark:text-brand-300">
              {doneCount}
              <span className="text-base text-slate-400 dark:text-slate-500">
                /{stops.length}
              </span>
            </div>
          </div>
        </div>
        <div
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-white shadow-inset dark:bg-night-800"
          role="progressbar"
          aria-valuenow={doneCount}
          aria-valuemin={0}
          aria-valuemax={stops.length}
          aria-valuetext={`${stops.length}곳 중 ${doneCount}곳 방문 완료`}
          aria-label="방문 진행률"
        >
          <div
            className="h-full rounded-full bg-brand-500 transition-all duration-300"
            style={{ width: `${(doneCount / stops.length) * 100}%` }}
          />
        </div>
      </section>

      {/* 동선 묶음 선택 */}
      {groups.length > 1 && (
        <div
          role="radiogroup"
          aria-label="동선 묶음 선택"
          onKeyDown={radioGroupNav}
          className="mb-3 flex gap-1.5 overflow-x-auto pb-1"
        >
          {groups.map((g, i) => (
            <button
              key={g.ordered[0]?.id ?? `${g.dong}-${i}`}
              onClick={() => setGi(i)}
              role="radio"
              aria-checked={i === safeGi}
              tabIndex={i === safeGi ? 0 : -1}
              className={`press min-h-[2.25rem] shrink-0 rounded-full border px-3.5 text-xs font-semibold transition-colors ${
                i === safeGi
                  ? "border-brand-500 bg-brand-500 text-white"
                  : "border-slate-200 bg-white text-slate-500 dark:border-night-600 dark:bg-night-850 dark:text-slate-400"
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
      <ol className="space-y-2.5">
        {stops.map((h, i) => {
          const score = computeScore(h.signals, h.profileGroup).score;
          const meta = caseMeta(h, score);
          const isVisited = visited.has(h.id);
          const emerg = isEmergency(h.id);
          const tel = "010-0000-" + meta.maskedPhone.slice(-4);
          return (
            <li
              key={h.id}
              className={`relative rounded-lg border p-3.5 shadow-card transition-colors ${
                emerg
                  ? "border-danger-500 bg-danger-50 dark:border-danger-500 dark:bg-danger-500/10"
                  : isVisited
                    ? "border-success-500/40 bg-success-50/50 dark:border-success-700 dark:bg-success-500/10"
                    : "border-slate-200 bg-white dark:border-night-700 dark:bg-night-850"
              }`}
            >
              {/* 카드 전체 = 상세로 (stretched link) */}
              <button
                onClick={() => onOpenCase(h.id)}
                aria-label={`${h.id} 상세 보기`}
                className="absolute inset-0 z-0 rounded-lg"
              />
              <div className="pointer-events-none relative z-10 flex items-start gap-3">
                {/* 主액션: 방문 완료 체크 */}
                <button
                  onClick={() => toggleVisited(h.id)}
                  aria-pressed={isVisited}
                  aria-label={
                    isVisited
                      ? `${h.id} 방문 완료됨 — 탭하면 취소`
                      : `${h.id} 방문 완료로 표시`
                  }
                  className={`press pointer-events-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[0.95rem] font-bold tabular-nums transition-colors ${
                    emerg
                      ? "bg-danger-500 text-white"
                      : isVisited
                        ? "bg-success-500 text-white"
                        : "border-2 border-brand-500 bg-white text-brand-600 dark:bg-night-850 dark:text-brand-300"
                  }`}
                >
                  {emerg ? (
                    <Siren size={18} aria-hidden />
                  ) : isVisited ? (
                    <Check size={20} aria-hidden />
                  ) : (
                    i + 1
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 pr-5">
                    <span
                      className={`font-mono text-[0.95rem] font-semibold ${
                        isVisited && !emerg
                          ? "text-slate-400 dark:text-slate-500"
                          : "text-slate-800 dark:text-slate-100"
                      }`}
                    >
                      {h.id}
                    </span>
                    {emerg ? (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-danger-500 px-1.5 py-0.5 text-[0.65rem] font-bold text-white">
                        <Siren size={9} aria-hidden /> 긴급 SOS
                      </span>
                    ) : (
                      <RiskBadge score={score} size="sm" />
                    )}
                    {!emerg && isRapidDecline(h) && (
                      <span className="inline-flex items-center gap-0.5 rounded-full border border-danger-500/30 bg-danger-50 px-1.5 py-0.5 text-[0.65rem] font-bold text-danger-500 dark:bg-danger-500/10 dark:text-danger-300">
                        <Zap size={9} aria-hidden /> 급속악화
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {meta.maskedAddress}
                  </p>
                  <p className="mt-0.5 truncate text-xs font-medium text-slate-600 dark:text-slate-300">
                    {brief(h)}
                  </p>

                  {/* 보조 액션: 전화 · 길찾기 · (긴급) */}
                  <div className="mt-2.5 flex items-center gap-1.5">
                    <a
                      href={`tel:${tel}`}
                      aria-label={`${h.id} 전화 걸기`}
                      className="press pointer-events-auto inline-flex min-h-[2.5rem] items-center gap-1.5 rounded-md bg-brand-500 px-3.5 text-xs font-semibold text-white active:bg-brand-700"
                    >
                      <Phone size={13} aria-hidden /> 전화
                    </a>
                    <a
                      href={mapRouteUrl(h)}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`${h.id} 길찾기 — 외부 지도 앱(예시 위치)`}
                      className="press pointer-events-auto inline-flex min-h-[2.5rem] items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3.5 text-xs font-semibold text-slate-600 active:bg-slate-50 dark:border-night-600 dark:bg-night-800 dark:text-slate-300 dark:active:bg-night-700"
                    >
                      <Navigation size={13} aria-hidden /> 길찾기
                    </a>
                    <button
                      onClick={() => setSosFor(h.id)}
                      aria-label={emerg ? `${h.id} 긴급 상황 관리` : `${h.id} 긴급 SOS`}
                      className={`press pointer-events-auto ml-auto flex h-10 w-10 items-center justify-center rounded-md transition-colors ${
                        emerg
                          ? "bg-danger-500 text-white active:bg-danger-700"
                          : "border border-danger-500/30 bg-white text-danger-500 active:bg-danger-50 dark:bg-night-800 dark:text-danger-300 dark:active:bg-danger-500/10"
                      }`}
                    >
                      <Siren size={17} aria-hidden />
                    </button>
                  </div>

                  {/* 방문 후 한 줄 메모 (로컬 저장) */}
                  {isVisited && (
                    <div className="pointer-events-auto mt-2 flex items-center gap-1.5 rounded-md border border-success-500/30 bg-white px-2.5 dark:border-success-700/50 dark:bg-night-800">
                      <PenLine
                        size={13}
                        className="shrink-0 text-success-500"
                        aria-hidden
                      />
                      <input
                        value={log.memos[h.id] ?? ""}
                        onChange={(e) => setMemo(h.id, e.target.value)}
                        placeholder="한 줄 메모 — 예: 부재, 저녁 재방문"
                        aria-label={`${h.id} 방문 메모`}
                        className="min-h-[2.35rem] w-full bg-transparent text-xs text-slate-700 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-0 dark:text-slate-200 dark:placeholder:text-slate-500"
                      />
                    </div>
                  )}
                </div>

                <ChevronRight
                  size={17}
                  className="absolute right-0 top-1 shrink-0 text-slate-300 dark:text-night-600"
                  aria-hidden
                />
              </div>
            </li>
          );
        })}
      </ol>

      <p className="mt-3 px-1 text-center text-[0.7rem] text-slate-400 dark:text-slate-500">
        순서·포함 여부는 담당자가 조정합니다. 좌표는 합성 데이터입니다.
      </p>

      {sosHousehold && (
        <MobileSosSheet
          household={sosHousehold}
          registered={isEmergency(sosHousehold.id)}
          onToggle={() => {
            setEmergency(sosHousehold.id, !isEmergency(sosHousehold.id));
            setSosFor(null);
          }}
          onClose={() => setSosFor(null)}
        />
      )}
    </div>
  );
}
