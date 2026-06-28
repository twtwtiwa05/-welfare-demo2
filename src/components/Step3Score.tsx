import { useState } from "react";
import {
  computeScore,
  computeFI,
  computeByMode,
  riskBand,
  BAND_STYLES,
  BAND_QUANTILE_NOTE,
  SIGNAL_META,
  SIGNAL_KEYS,
  type ScoreMode,
} from "../lib/scoring";
import { thresholdMethod, COMBINATION_CUTOFF } from "../lib/priority";
import {
  PROFILES,
  UNIFORM_WEIGHTS,
  PROFILE_KEYS,
  PROFILE_LABELS,
  PROFILE_NOTES,
} from "../lib/profiles";
import type { Household, Signals, ProfileKey } from "../lib/types";
import { Check, X, BookOpen } from "lucide-react";

// ★ 데모의 심장. 슬라이더를 움직이면 점수·기여도·색·발굴판정이 동시 반응한다.
// ② 집단 프로파일 토글 + ★작업 A: 무가중 FI(베이스라인) ↔ 집단 가중 토글로 가중치 유무 차이를 시연.
export default function Step3Score({
  household,
  onOpenRefs,
}: {
  household: Household;
  onOpenRefs?: () => void;
}) {
  const [profile, setProfile] = useState<ProfileKey>(household.profileGroup);
  const [mode, setMode] = useState<ScoreMode>("weighted");
  const [signals, setSignals] = useState<Signals>({ ...household.signals });

  const { score, breakdown } = computeByMode(signals, profile, mode);
  const weightedScore = computeScore(signals, profile).score;
  const fiScore = computeFI(signals).score;
  const band = riskBand(score);
  const bandStyle = BAND_STYLES[band];

  const passesThreshold = thresholdMethod(signals);
  const passesCombination = score >= COMBINATION_CUTOFF;
  const isResidualCatch = passesCombination && !passesThreshold;

  const weights = mode === "fi" ? UNIFORM_WEIGHTS : PROFILES[profile];

  function setSignal(field: keyof Signals, value: number) {
    setSignals((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <div className="space-y-4">
      {/* 토글 행: 집단 모형(②) + 점수 모형(작업 A) */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-brand-200 bg-brand-50/70 p-3">
          <span className="text-sm font-bold text-brand-800">집단 모형</span>
          <div className="flex gap-1 rounded-lg bg-white/70 p-1 ring-1 ring-brand-100">
            {PROFILE_KEYS.map((key) => (
              <button
                key={key}
                onClick={() => setProfile(key)}
                aria-pressed={profile === key}
                disabled={mode === "fi"}
                className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-all duration-300 disabled:opacity-40 ${
                  profile === key
                    ? "bg-brand-600 text-white shadow-sm"
                    : "bg-transparent text-brand-700 hover:bg-brand-100"
                }`}
              >
                {PROFILE_LABELS[key]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
          <span className="text-sm font-bold text-slate-700">점수 모형</span>
          <div className="flex gap-1 rounded-lg bg-white/70 p-1 ring-1 ring-slate-200">
            <button
              onClick={() => setMode("fi")}
              aria-pressed={mode === "fi"}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-all duration-300 ${
                mode === "fi"
                  ? "bg-slate-700 text-white shadow-sm"
                  : "bg-transparent text-slate-600 hover:bg-slate-100"
              }`}
            >
              무가중 FI
            </button>
            <button
              onClick={() => setMode("weighted")}
              aria-pressed={mode === "weighted"}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-all duration-300 ${
                mode === "weighted"
                  ? "bg-brand-600 text-white shadow-sm"
                  : "bg-transparent text-brand-700 hover:bg-brand-100"
              }`}
            >
              집단 가중
            </button>
          </div>
        </div>
      </div>
      <p className="-mt-1 text-xs leading-snug text-slate-500">
        {mode === "fi" ? (
          <>
            <b>무가중 FI(베이스라인)</b> — Rockwood 결핍누적의 단순 평균(가중치 없음). “가중치를 막
            정했다”는 비판에서 자유로운 근거 기반 출발점입니다.
          </>
        ) : (
          <>
            {PROFILE_NOTES[profile]} · 같은 가구도 집단 모형에 따라 점수가 달라집니다 (②&nbsp;집단특화).
            가중치는 근거 강도로 상한이 제약됩니다 — 우편(약)은 최저.
          </>
        )}
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* 좌: 신호 슬라이더 */}
        <div className="card card-pad">
          <h4 className="mb-4 card-title">
            위험 신호{" "}
            <span className="font-normal text-slate-400">— 슬라이더로 조절 (미리 정해둔 화면이 아닙니다)</span>
          </h4>
          <div className="space-y-4">
            {SIGNAL_KEYS.map((key) => {
              const meta = SIGNAL_META[key];
              const value = signals[meta.field];
              const overThreshold = meta.threshold != null && value >= meta.threshold;
              return (
                <div key={key}>
                  <div className="mb-1.5 flex items-baseline justify-between">
                    <span className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                      {meta.label}
                      {meta.auxiliary && (
                        <span
                          className="rounded bg-amber-50 px-1.5 py-px text-[10px] font-semibold text-amber-600 ring-1 ring-amber-200"
                          title="확립된 근거가 약한 보조신호 — 단독 트리거 지양, 최저 가중"
                        >
                          보조신호
                        </span>
                      )}
                    </span>
                    <span
                      className={`tabular-nums text-sm font-bold ${
                        overThreshold ? "text-red-600" : "text-slate-900"
                      }`}
                    >
                      {meta.format(value)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={meta.min}
                    max={meta.max}
                    step={meta.step}
                    value={value}
                    onChange={(e) => setSignal(meta.field, Number(e.target.value))}
                    aria-label={meta.label}
                    className="range-brand"
                  />
                  {meta.threshold != null && (
                    <div className="mt-1 text-xs text-slate-400">
                      임계값 {meta.format(meta.threshold)}
                      {overThreshold && (
                        <span className="ml-1.5 rounded bg-red-100 px-1.5 py-px text-[11px] font-semibold text-red-700">
                          초과
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 우: 점수 + 기여도 막대 + 가중치 표 */}
        <div className="space-y-4">
          <div
            className={`rounded-xl border p-5 shadow-card transition-colors duration-300 ${bandStyle.bg} ${bandStyle.border}`}
          >
            <div className="flex items-end justify-between">
              <div>
                <div className="section-label">
                  위험 점수 {mode === "fi" ? "· 무가중 FI" : "· 집단 가중"}
                </div>
                <div
                  className={`mt-1 text-7xl font-bold tabular-nums leading-none tracking-tight transition-colors duration-300 ${bandStyle.text}`}
                >
                  {score}
                  <span className="ml-1.5 text-2xl font-semibold text-slate-400">/ 100</span>
                </div>
              </div>
              <RiskBadgeInline band={band} />
            </div>
            {/* 무가중 FI ↔ 집단 가중 비교 (작업 A) */}
            <div className="mt-3 flex items-center gap-2 border-t border-white/60 pt-2.5 text-xs">
              <ComparePill label="무가중 FI" value={fiScore} active={mode === "fi"} />
              <span className="text-slate-300">vs</span>
              <ComparePill label="집단 가중" value={weightedScore} active={mode === "weighted"} />
              <span className="ml-auto text-[11px] text-slate-400">
                Δ {Math.abs(weightedScore - fiScore)}점
              </span>
            </div>
          </div>

          <div className="card card-pad">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="card-title">
                점수 기여도{" "}
                <span className="font-normal text-slate-400">
                  = 결핍 × {mode === "fi" ? "균등 가중" : "집단 가중"}
                </span>
              </h4>
              <span className="tabular-nums text-xs font-semibold text-slate-500">합계 {score}점</span>
            </div>
            <div className="space-y-2.5">
              {breakdown.map((b) => {
                const aux = SIGNAL_META[b.key].auxiliary;
                return (
                  <div key={b.key}>
                    <div className="mb-1 flex items-baseline justify-between text-sm">
                      <span className="text-slate-600">
                        {b.label}
                        {aux && (
                          <span className="ml-1 rounded bg-amber-50 px-1 text-[9px] font-semibold text-amber-600">
                            보조
                          </span>
                        )}
                        <span className="ml-1.5 text-xs text-slate-400">가중치 {b.weight}</span>
                      </span>
                      <span className="tabular-nums font-semibold text-slate-800">
                        {b.contribution.toFixed(1)}점
                      </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 shadow-inset">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ease-out ${
                          aux ? "bg-amber-400" : bandStyle.bar
                        }`}
                        style={{ width: `${b.contribution}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 border-t border-slate-100 pt-3 text-xs text-slate-500">
              <span className="font-semibold text-slate-600">
                {mode === "fi" ? "균등(무가중)" : PROFILE_LABELS[profile]} 가중치
              </span>
              {SIGNAL_KEYS.map((key) => (
                <span
                  key={key}
                  className="rounded bg-slate-50 px-1.5 py-0.5 tabular-nums ring-1 ring-slate-200/70"
                >
                  {SIGNAL_META[key].short} {weights[key]}
                </span>
              ))}
              <span className="font-semibold text-slate-600">= 합 100</span>
            </div>
          </div>
        </div>
      </div>

      {/* ④ 발굴 방식 판정 */}
      <div className="grid gap-3 sm:grid-cols-2">
        <MethodCard
          title="기존 · 임계값 방식 (OR)"
          found={passesThreshold}
          foundLabel="발굴"
          missLabel="누락"
          note={
            passesThreshold
              ? "단일 신호가 임계를 초과했습니다."
              : "어떤 신호도 단일 임계를 넘지 못해 규칙에서 누락됩니다."
          }
        />
        <MethodCard
          title={`우리 · 조합 방식 (${mode === "fi" ? "무가중 FI" : "가중합"})`}
          found={passesCombination}
          foundLabel="발굴"
          missLabel="보류"
          note={`점수 ${score} ${passesCombination ? "≥" : "<"} 기준 ${COMBINATION_CUTOFF}`}
        />
      </div>
      {isResidualCatch && (
        <div className="flex items-start gap-2.5 rounded-xl border border-brand-300 bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-800 shadow-card animate-popIn">
          <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs text-white">
            ⓘ
          </span>
          <span className="leading-relaxed">
            이 가구는 <span className="text-brand-700">조합 방식으로는 발굴</span>되지만{" "}
            <span className="text-slate-600">임계값 방식이라면 누락</span>될 케이스입니다 — 슬라이더를
            움직여 판정이 뒤집히는 지점을 확인하세요.
          </span>
        </div>
      )}

      {/* 근거 출처 줄 (작업 A) */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs leading-relaxed text-slate-500 shadow-card">
        <span>
          이 점수는 <b className="text-slate-700">Rockwood Frailty Index(결핍누적)</b> 형식 + 한국 복지
          발굴 <b className="text-slate-700">위기정보 체계·실서비스</b>에 근거. {BAND_QUANTILE_NOTE}.
        </span>
        {onOpenRefs && (
          <button
            onClick={onOpenRefs}
            className="inline-flex shrink-0 items-center gap-1 font-semibold text-brand-600 hover:text-brand-700"
          >
            <BookOpen size={12} /> 근거 보기
          </button>
        )}
      </div>
    </div>
  );
}

function ComparePill({
  label,
  value,
  active,
}: {
  label: string;
  value: number;
  active: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${
        active ? "bg-white text-slate-800 ring-1 ring-slate-300" : "text-slate-500"
      }`}
    >
      {label} <span className="tabular-nums">{value}</span>
    </span>
  );
}

function RiskBadgeInline({ band }: { band: "high" | "mid" | "low" }) {
  const s = BAND_STYLES[band];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-base font-bold shadow-sm ${s.bg} ${s.border} ${s.text}`}
    >
      <span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} aria-hidden />
      {s.label}
    </span>
  );
}

function MethodCard({
  title,
  found,
  foundLabel,
  missLabel,
  note,
}: {
  title: string;
  found: boolean;
  foundLabel: string;
  missLabel: string;
  note: string;
}) {
  return (
    <div
      className={`rounded-xl border p-4 shadow-card transition-colors duration-300 ${
        found ? "border-brand-300 bg-brand-50" : "border-slate-200 bg-slate-50"
      }`}
    >
      <div className="mb-1.5 text-xs font-semibold text-slate-500">{title}</div>
      <div className="flex items-center gap-2.5">
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-full shadow-sm transition-colors duration-300 ${
            found ? "bg-brand-600 text-white" : "bg-slate-300 text-white"
          }`}
        >
          {found ? <Check size={17} strokeWidth={2.5} /> : <X size={17} strokeWidth={2.5} />}
        </span>
        <span
          className={`text-lg font-bold transition-colors duration-300 ${
            found ? "text-brand-700" : "text-slate-500"
          }`}
        >
          {found ? foundLabel : missLabel}
        </span>
      </div>
      <div className="mt-1.5 text-xs leading-relaxed text-slate-500">{note}</div>
    </div>
  );
}
