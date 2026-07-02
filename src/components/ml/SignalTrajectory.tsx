import { SIGNAL_META, type SignalKey } from "../../lib/scoring";
import type { Household } from "../../lib/types";

// 신호별 8주 결핍 궤적 스파크라인 (작업 B). 임계선·변화점 마커 포함.
// 결합 급락 시연: 각 신호는 임계 미만이지만 동시에 막판에 꺾이는 모습을 작은 다중도로 보여준다.

const W = 120;
const H = 34;
const PADX = 3;
const PADY = 4;

/** signalHistory에서 한 신호의 원시값 8주 추출 */
function rawSeries(h: Household, key: SignalKey): number[] {
  return h.signalHistory.map((p) => p[key]);
}

/** 원시값을 결핍 0~1로 (scoring.deficits와 동일 변환) */
function toDeficit(key: SignalKey, v: number): number {
  switch (key) {
    case "power": return Math.min(v / 100, 1);
    case "medical": return Math.min(v / 365, 1);
    case "mail": return Math.min(v / 4, 1);
    case "telecom": return Math.min(v / 3, 1);
    case "isolation": return v === 0 ? 1 : 0;
  }
}

export default function SignalTrajectory({
  household,
  signalKey,
  changeWeek,
}: {
  household: Household;
  signalKey: SignalKey;
  changeWeek?: number;
}) {
  const meta = SIGNAL_META[signalKey];
  const raw = rawSeries(household, signalKey);
  const deficits = raw.map((v) => toDeficit(signalKey, v));
  const last = raw[raw.length - 1];
  const overThreshold = meta.threshold != null && last >= meta.threshold;

  const x = (i: number) => PADX + (i / (raw.length - 1)) * (W - 2 * PADX);
  const y = (d: number) => PADY + (1 - d) * (H - 2 * PADY);
  const path = deficits.map((d, i) => `${x(i)},${y(d)}`).join(" ");

  // 임계선(결핍 환산) — isolation은 임계 개념 없음
  const thrDeficit =
    meta.threshold != null ? toDeficit(signalKey, meta.threshold) : null;

  // 스크린리더용 대체텍스트 — 추세·임계·변화점(차트의 핵심 정보)을 텍스트로 (SC 1.1.1)
  const firstDef = deficits[0];
  const lastDef = deficits[deficits.length - 1];
  const trend =
    lastDef > firstDef + 0.05 ? "악화" : lastDef < firstDef - 0.05 ? "개선" : "유지";
  const ariaLabel =
    `${meta.label} 8주 추이: ${trend}, 현재 ${meta.format(last)}` +
    (meta.threshold != null
      ? ` (임계 ${meta.format(meta.threshold)} ${overThreshold ? "초과" : "미만"})`
      : "") +
    (changeWeek != null ? `, ${changeWeek}주차 변화점` : "");

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2 dark:border-night-700 dark:bg-night-850">
      <div className="mb-0.5 flex items-baseline justify-between">
        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
          {meta.label}
          {meta.auxiliary && (
            <span className="ml-1 rounded bg-amber-50 px-1 text-[9px] font-semibold text-amber-600 dark:bg-amber-950/60 dark:text-amber-300">
              보조
            </span>
          )}
        </span>
        <span
          className={`tabular-nums text-[11px] font-bold ${
            overThreshold
              ? "text-rose-600 dark:text-rose-400"
              : "text-slate-700 dark:text-slate-200"
          }`}
        >
          {meta.format(last)}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label={ariaLabel}
      >
        <title>{ariaLabel}</title>
        {thrDeficit != null && (
          <line
            x1={PADX}
            x2={W - PADX}
            y1={y(thrDeficit)}
            y2={y(thrDeficit)}
            className="stroke-slate-300 dark:stroke-night-600"
            strokeWidth={0.6}
            strokeDasharray="2 2"
          />
        )}
        <polyline
          points={path}
          fill="none"
          stroke={overThreshold ? "#DE3412" : "#256EF4"}
          strokeWidth={1.4}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* 변화점 마커 */}
        {changeWeek != null && changeWeek >= 1 && changeWeek <= raw.length && (
          <circle
            cx={x(changeWeek - 1)}
            cy={y(deficits[changeWeek - 1])}
            r={2.2}
            fill="#DE3412"
            stroke="#fff"
            strokeWidth={0.8}
          />
        )}
        {/* 마지막 점 */}
        <circle
          cx={x(raw.length - 1)}
          cy={y(deficits[deficits.length - 1])}
          r={1.8}
          fill={overThreshold ? "#DE3412" : "#256EF4"}
        />
      </svg>
      <div className="mt-0.5 flex items-center justify-between text-[9px] text-slate-400 dark:text-slate-500">
        <span>8주 전</span>
        {meta.threshold != null && (
          <span className={overThreshold ? "text-rose-500 dark:text-rose-400" : ""}>
            임계 {meta.format(meta.threshold)} {overThreshold ? "초과" : "미만"}
          </span>
        )}
        <span>현재</span>
      </div>
    </div>
  );
}
