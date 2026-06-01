// ★ 투명 위험 점수 — 데모의 심장 (plan 0절 원칙 1)
//
// 점수는 가중합 공식이 계산한다. 신경망/LLM이 아니다.
// 식이 전부 보이고, 입력이 바뀌면 즉시 재계산된다. 블랙박스가 아니다.

import { PROFILES } from "./profiles";
import type { Signals, ProfileKey } from "./types";

export const SIGNAL_KEYS = [
  "power",
  "medical",
  "mail",
  "telecom",
  "isolation",
] as const;
export type SignalKey = (typeof SIGNAL_KEYS)[number];

export interface SignalMeta {
  key: SignalKey;
  field: keyof Signals;
  label: string;
  /** 칩/막대용 짧은 이름 */
  short: string;
  unit: string;
  /** 슬라이더 범위 */
  min: number;
  max: number;
  step: number;
  /** 임계값 방식(OR)에서 쓰는 단일 기준. isolation은 단일 임계 없음 */
  threshold: number | null;
  /** 정규화 0~1 결과를 사람이 읽는 문자열로 */
  format: (v: number) => string;
}

export const SIGNAL_META: Record<SignalKey, SignalMeta> = {
  power: {
    key: "power",
    field: "powerDropPct",
    label: "전력 사용 급감",
    short: "전력↓",
    unit: "%",
    min: 0,
    max: 100,
    step: 1,
    threshold: 80,
    format: (v) => `${v}%`,
  },
  medical: {
    key: "medical",
    field: "daysSinceMedical",
    label: "진료 단절",
    short: "진료단절",
    unit: "일",
    min: 0,
    max: 500,
    step: 5,
    threshold: 365,
    format: (v) => `${v}일`,
  },
  mail: {
    key: "mail",
    field: "mailUncollectedWeeks",
    label: "우편 미수령",
    short: "우편미수령",
    unit: "주",
    min: 0,
    max: 6,
    step: 1,
    threshold: 4,
    format: (v) => `${v}주`,
  },
  telecom: {
    key: "telecom",
    field: "telecomOverdueMonths",
    label: "통신비 연체",
    short: "통신연체",
    unit: "개월",
    min: 0,
    max: 4,
    step: 1,
    threshold: 3,
    format: (v) => `${v}개월`,
  },
  isolation: {
    key: "isolation",
    field: "welfareCenterVisits6mo",
    label: "복지관 이용 부재",
    short: "사회적고립",
    unit: "회",
    min: 0,
    max: 5,
    step: 1,
    threshold: null,
    format: (v) => `6개월 ${v}회`,
  },
};

/** 각 신호를 0~1로 정규화. 식이 전부 보인다(plan 4.2). */
export function normalize(s: Signals): Record<SignalKey, number> {
  return {
    power: Math.min(s.powerDropPct / 100, 1),
    medical: Math.min(s.daysSinceMedical / 365, 1),
    mail: Math.min(s.mailUncollectedWeeks / 4, 1),
    telecom: Math.min(s.telecomOverdueMonths / 3, 1),
    isolation: s.welfareCenterVisits6mo === 0 ? 1 : 0,
  };
}

export interface BreakdownItem {
  key: SignalKey;
  label: string;
  short: string;
  weight: number;
  normalized: number;
  /** 이 신호가 점수에 기여한 값 = normalized × weight */
  contribution: number;
}

export interface ScoreResult {
  score: number;
  breakdown: BreakdownItem[];
}

/** 위험 점수 = Σ (정규화 신호 × 집단 가중치). profile에 따라 가중치가 달라진다(②). */
export function computeScore(s: Signals, profile: ProfileKey): ScoreResult {
  const w = PROFILES[profile];
  const n = normalize(s);
  const breakdown: BreakdownItem[] = SIGNAL_KEYS.map((key) => ({
    key,
    label: SIGNAL_META[key].label,
    short: SIGNAL_META[key].short,
    weight: w[key],
    normalized: n[key],
    contribution: n[key] * w[key],
  }));
  const score = Math.round(
    breakdown.reduce((acc, b) => acc + b.contribution, 0)
  );
  return { score, breakdown };
}

// ── 위험 구간(색·라벨). 색만으로 구분하지 않고 라벨 병행(5-A.5) ──────
export type Band = "high" | "mid" | "low";

export const BAND_CUTOFFS = { high: 65, mid: 45 } as const;

export function riskBand(score: number): Band {
  if (score >= BAND_CUTOFFS.high) return "high";
  if (score >= BAND_CUTOFFS.mid) return "mid";
  return "low";
}

export interface BandStyle {
  label: string;
  text: string;
  bg: string;
  border: string;
  bar: string;
  dot: string;
  chipBg: string;
}

export const BAND_STYLES: Record<Band, BandStyle> = {
  high: {
    label: "고위험",
    text: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-300",
    bar: "bg-red-500",
    dot: "bg-red-500",
    chipBg: "bg-red-100 text-red-700",
  },
  mid: {
    label: "주의",
    text: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-300",
    bar: "bg-amber-500",
    dot: "bg-amber-500",
    chipBg: "bg-amber-100 text-amber-700",
  },
  low: {
    label: "관찰",
    text: "text-slate-600",
    bg: "bg-slate-50",
    border: "border-slate-300",
    bar: "bg-slate-400",
    dot: "bg-slate-400",
    chipBg: "bg-slate-100 text-slate-600",
  },
};
