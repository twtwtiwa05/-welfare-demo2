import { useState } from "react";
import {
  computeScore,
  riskBand,
  BAND_STYLES,
  SIGNAL_META,
  SIGNAL_KEYS,
} from "../lib/scoring";
import { thresholdMethod, COMBINATION_CUTOFF } from "../lib/priority";
import {
  PROFILES,
  PROFILE_KEYS,
  PROFILE_LABELS,
  PROFILE_NOTES,
} from "../lib/profiles";
import type { Household, Signals, ProfileKey } from "../lib/types";
import { Check, X } from "lucide-react";

// ★ 데모의 심장 (5-A.2). 슬라이더를 움직이면 네 가지가 동시 즉시 반응한다:
//   ① 기여도 막대  ② 큰 점수 숫자  ③ 색·뱃지  ④ ⑤단계 발굴/누락 판정.
// + 집단 프로파일 토글로 같은 가구의 점수가 재배열된다(②).
export default function Step3Score({ household }: { household: Household }) {
  const [profile, setProfile] = useState<ProfileKey>(household.profileGroup);
  const [signals, setSignals] = useState<Signals>({ ...household.signals });

  const { score, breakdown } = computeScore(signals, profile);
  const band = riskBand(score);
  const bandStyle = BAND_STYLES[band];

  // ④ 5단계 판정 — 실시간
  const passesThreshold = thresholdMethod(signals);
  const passesCombination = score >= COMBINATION_CUTOFF;
  const isResidualCatch = passesCombination && !passesThreshold; // 조합만 발굴

  const weights = PROFILES[profile];

  function setSignal(field: keyof Signals, value: number) {
    setSignals((prev) => ({ ...prev, [field]: value })); // 불변 갱신
  }

  return (
    <div className="space-y-4">
      {/* 집단 프로파일 토글 (②) */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-brand-200 bg-brand-50/70 p-3">
        <span className="text-sm font-bold text-brand-800">집단 모형</span>
        <div className="flex gap-1 rounded-lg bg-white/70 p-1 ring-1 ring-brand-100">
          {PROFILE_KEYS.map((key) => (
            <button
              key={key}
              onClick={() => setProfile(key)}
              aria-pressed={profile === key}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-all duration-300 ${
                profile === key
                  ? "bg-brand-600 text-white shadow-sm"
                  : "bg-transparent text-brand-700 hover:bg-brand-100"
              }`}
            >
              {PROFILE_LABELS[key]}
            </button>
          ))}
        </div>
        <span className="text-xs leading-snug text-slate-500">
          {PROFILE_NOTES[profile]} · 같은 가구도 집단 모형에 따라 점수가
          달라집니다 (②&nbsp;집단특화)
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* 좌: 신호 슬라이더 */}
        <div className="card card-pad">
          <h4 className="mb-4 card-title">
            위험 신호{" "}
            <span className="font-normal text-slate-400">
            — 슬라이더로 조절 (미리 정해둔 화면이 아닙니다)
            </span>
          </h4>
          <div className="space-y-4">
            {SIGNAL_KEYS.map((key) => {
              const meta = SIGNAL_META[key];
              const value = signals[meta.field];
              const overThreshold =
                meta.threshold != null && value >= meta.threshold;
              return (
                <div key={key}>
                  <div className="mb-1.5 flex items-baseline justify-between">
                    <span className="text-sm font-medium text-slate-700">
                      {meta.label}
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
          {/* ② 큰 점수 + ③ 색 뱃지 */}
          <div
            className={`rounded-xl border p-5 shadow-card transition-colors duration-300 ${bandStyle.bg} ${bandStyle.border}`}
          >
            <div className="flex items-end justify-between">
              <div>
                <div className="section-label">위험 점수</div>
                <div
                  className={`mt-1 text-7xl font-bold tabular-nums leading-none tracking-tight transition-colors duration-300 ${bandStyle.text}`}
                >
                  {score}
                  <span className="ml-1.5 text-2xl font-semibold text-slate-400">
                    / 100
                  </span>
                </div>
              </div>
              <RiskBadgeInline band={band} />
            </div>
          </div>

          {/* ① 기여도 막대 */}
          <div className="card card-pad">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="card-title">
                점수 기여도{" "}
                <span className="font-normal text-slate-400">
                  = 정규화 신호 × 가중치
                </span>
              </h4>
              <span className="tabular-nums text-xs font-semibold text-slate-500">
                합계 {score}점
              </span>
            </div>
            <div className="space-y-2.5">
              {breakdown.map((b) => (
                <div key={b.key}>
                  <div className="mb-1 flex items-baseline justify-between text-sm">
                    <span className="text-slate-600">
                      {b.label}
                      <span className="ml-1.5 text-xs text-slate-400">
                        가중치 {b.weight}
                      </span>
                    </span>
                    <span className="tabular-nums font-semibold text-slate-800">
                      {b.contribution.toFixed(1)}점
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 shadow-inset">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ease-out ${bandStyle.bar}`}
                      style={{ width: `${b.contribution}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            {/* 가중치 표 — "블랙박스 아님"을 눈으로 증명 */}
            <div className="mt-3.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 border-t border-slate-100 pt-3 text-xs text-slate-500">
              <span className="font-semibold text-slate-600">
                {PROFILE_LABELS[profile]} 가중치
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

      {/* ④ 5단계 판정 — 실시간 역전 */}
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
          title="우리 · 조합 방식 (가중합)"
          found={passesCombination}
          foundLabel="발굴"
          missLabel="보류"
          note={`점수 ${score} ${
            passesCombination ? "≥" : "<"
          } 기준 ${COMBINATION_CUTOFF}`}
        />
      </div>
      {isResidualCatch && (
        <div className="flex items-start gap-2.5 rounded-xl border border-brand-300 bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-800 shadow-card animate-popIn">
          <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs text-white">
            ⓘ
          </span>
          <span className="leading-relaxed">
            이 가구는 <span className="text-brand-700">조합 방식으로는 발굴</span>
            되지만 <span className="text-slate-600">임계값 방식이라면 누락</span>될
            케이스입니다 — 슬라이더를 움직여 판정이 뒤집히는 지점을 확인하세요.
          </span>
        </div>
      )}
    </div>
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
        found
          ? "border-brand-300 bg-brand-50"
          : "border-slate-200 bg-slate-50"
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
