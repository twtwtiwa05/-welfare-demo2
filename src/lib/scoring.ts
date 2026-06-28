// ★ 투명 위험 점수 — 데모의 심장 (가드레일 G1·G5)
//
// ┌─ 모델 출처(provenance) ──────────────────────────────────────────────┐
// │ 점수의 *형식*은 임상 노쇠지수(Frailty Index, 결핍누적 모델)에서 가져온다.   │
// │   · Mitnitski AB, Mogilner AJ, Rockwood K. "Accumulation of deficits  │
// │     as a proxy measure of aging." ScientificWorldJournal 2001;1:323-336.│
// │   · 원장원. "노쇠의 최신지견." 대한의사협회지 2022;65(2):108-114.            │
// │     doi:10.5124/jkma.2022.65.2.108                                     │
// │   핵심: 여러 결핍 항목을 각각 0~1로 만들고 그 *비율/평균*으로 0~1 지수를 낸다. │
// │   고전 FI는 가중치 없는 단순 평균(결핍 개수 / 전체 항목). → 무가중 베이스라인.  │
// │                                                                        │
// │ 점수의 *신호 선택*은 한국 복지 발굴 위기정보 체계 + 실서비스로 정당화한다.     │
// │   · 보건복지부 복지 사각지대 발굴시스템(사회보장급여법): 위기정보(단전·단수·    │
// │     건보료/공공요금 체납·금융연체·임차료 체납 등)로 위기 가능성 상위 분위수를    │
// │     빅데이터로 선별 → 지자체 통보. (우리 신호는 이 공식 체계의 proxy)         │
// │   · 한국전력+이동통신3사 'AI 안부살핌' / 서울시 스마트플러그: 전력·통신 패턴으로  │
// │     1인가구 이상징후 자동 포착 → 담당자 알림. (power·telecom 신호의 실서비스 근거)│
// │                                                                        │
// │ 모든 상수는 (a)근거 있음 / (b)데이터로 학습됨 / (c)명시적 가정 중 하나로        │
// │ 분류·주석화한다(G5). 자세한 출처·강도·한계는 레포 루트 REFERENCES.md 참조.     │
// └────────────────────────────────────────────────────────────────────┘
//
// ⚠️ 점수는 아래 결정론 공식이 계산한다. 신경망/LLM/ML이 "위험점수"를 직접 출력하지 않는다(G1).
//    ML(scripts/run_ml.py)은 *별도 보조 신호*(급속·다변량 악화 선별)만 만든다(G2).

import { PROFILES, UNIFORM_WEIGHTS } from "./profiles";
import type { Signals, ProfileKey, SignalKey } from "./types";

export type { SignalKey };

export const SIGNAL_KEYS: readonly SignalKey[] = [
  "power",
  "medical",
  "mail",
  "telecom",
  "isolation",
] as const;

/** 근거 강도 — 가중치 상한 결정에 쓴다(A-5). 약한 신호에 강한 가중 금지. */
export type EvidenceStrength = "강" | "중상" | "중" | "약";

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
  /** 근거 강도(A-5) — UI 신뢰 표시·가중 상한 제약 */
  strength: EvidenceStrength;
  /** 보조신호 여부(약한 근거) — 단독 트리거 지양, UI에서 시각 구분 */
  auxiliary: boolean;
  /** 근거 한 줄 (REFERENCES.md 키와 연결) */
  basis: string;
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
    // 근거: 한전·통신3사 안부살핌·서울시 스마트플러그(실서비스) + arXiv:2407.00524(비침습 모니터링)
    strength: "강",
    auxiliary: false,
    basis: "한전·통신3사 안부살핌 등 실서비스 + 전력 기반 비침습 모니터링 연구",
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
    // 근거: 박채린·김현우(2025) 1인가구 미충족 의료 결정요인 (보건사회연구 45(1))
    strength: "중",
    auxiliary: false,
    basis: "1인가구 미충족 의료 실증연구(박채린·김현우 2025)",
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
    // ⚠️ 확립된 근거 없음: 위기정보 44종·실서비스에 미사용 확인. 가짜 인용 금지.
    //    → 낮은 가중 강제 + 보조신호. "외부 관찰 가능한 생활관리 실패 징후"로만 약하게.
    strength: "약",
    auxiliary: true,
    basis: "확립된 출처 없는 보조 지표 — 단독 트리거 지양(다른 신호와 동반 시 보조 가산)",
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
    // 근거: 위기정보 체계의 '요금 체납류 경제신호' 계열 + 실서비스의 통신 데이터 활용.
    //   ⚠️ 통신비 체납이 44종에 명시적 포함이라 단정하지 않음(위기정보의 통신요소는 주로 연락처 연계).
    strength: "중",
    auxiliary: false,
    basis: "요금 체납류 경제 위기신호 + 실서비스의 통신 데이터 활용",
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
    // 근거: Holt-Lunstad et al.(2010) 사회적 단절↑→사망위험↑.
    //   ⚠️ 단순 이분지표(혼자/0회)는 메타분석상 효과 최약 → 과도 가중 금지.
    strength: "중",
    auxiliary: false,
    basis: "사회적 단절–사망위험 메타분석(Holt-Lunstad 2010). 단순 이분지표는 약함→과도 가중 금지",
  },
};

/**
 * 각 신호를 0~1 결핍(deficit)으로 정규화. 0=결핍없음, 1=완전결핍.
 * Rockwood Frailty Index의 결핍 항목화와 동형(isomorphic).
 * 변환식의 분모(임계 상수)는 임의값 → 각 신호 주석에 가정/근거 표기(G5).
 */
export function deficits(s: Signals): Record<SignalKey, number> {
  return {
    // 가정: 급감률 100%를 완전결핍으로 선형 스케일 (실서비스는 패턴변화로 발전 → §4 이상탐지 입력)
    power: clamp01(s.powerDropPct / 100),
    // 가정: 진료 단절 365일(1년)을 완전결핍으로. 임계 365는 임의값(근거 아님).
    medical: clamp01(s.daysSinceMedical / 365),
    // 가정: 우편 미수령 4주를 완전결핍으로. ⚠️ 보조신호(약): 단독 해석 지양.
    mail: clamp01(s.mailUncollectedWeeks / 4),
    // 가정: 통신 연체 3개월을 완전결핍으로.
    telecom: clamp01(s.telecomOverdueMonths / 3),
    // 가정: 6개월 복지관 이용 0회를 결핍 1, 그 외 0. ⚠️ 이분지표는 효과 약(Holt-Lunstad).
    isolation: s.welfareCenterVisits6mo === 0 ? 1 : 0,
  };
}

/** 하위호환 별칭 (기존 호출부) */
export const normalize = deficits;

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export interface BreakdownItem {
  key: SignalKey;
  label: string;
  short: string;
  weight: number;
  /** 결핍 0~1 */
  normalized: number;
  /** 이 신호가 점수에 기여한 값 = deficit × weight × (100/Σweight) */
  contribution: number;
}

export interface ScoreResult {
  score: number;
  breakdown: BreakdownItem[];
}

/** 점수 산출 모드 — 무가중 FI 베이스라인 vs 집단특화 가중(헤드라인) */
export type ScoreMode = "weighted" | "fi";

/** 임의 가중치 셋으로 정규화 가중평균 점수 산출 (핵심 엔진). */
function computeWith(
  s: Signals,
  weights: Record<SignalKey, number>
): ScoreResult {
  const d = deficits(s);
  const sumW = SIGNAL_KEYS.reduce((a, k) => a + weights[k], 0);
  const norm = sumW > 0 ? 100 / sumW : 0; // Σw가 100이 아니어도 0~100 스케일 유지
  const breakdown: BreakdownItem[] = SIGNAL_KEYS.map((key) => ({
    key,
    label: SIGNAL_META[key].label,
    short: SIGNAL_META[key].short,
    weight: weights[key],
    normalized: d[key],
    contribution: d[key] * weights[key] * norm,
  }));
  const score = Math.round(
    breakdown.reduce((acc, b) => acc + b.contribution, 0)
  );
  return { score, breakdown };
}

/**
 * (1) 베이스라인 = 인용 가능한 순수 Frailty Index (가중치 없음).
 *   riskBase = round(100 × mean(deficit_i))  — Rockwood 결핍누적의 단순 평균.
 *   임의 가중치 0개 → "근거 없는 가중치" 비판에서 자유로운 근거 기반 베이스라인.
 */
export function computeFI(s: Signals): ScoreResult {
  return computeWith(s, UNIFORM_WEIGHTS);
}

/**
 * (2) 집단특화 확장 = 문헌/제도로 *방향·상한이 제약된* 가중치(프로젝트 차별점 ②).
 *   riskWeighted = round(100 × Σ(deficit_i × w_i^group) / Σ w_i^group)
 *   w_i는 "막 정한 값"이 아니라 A-5 근거표의 근거 강도가 상한을 제약한다
 *   (강=높은 가중 허용, 약=낮은 가중 강제). 약한 신호(우편)는 최저 가중.
 */
export function computeScore(s: Signals, profile: ProfileKey): ScoreResult {
  return computeWith(s, PROFILES[profile]);
}

/** 모드에 따라 점수 산출 — UI 토글(무가중 FI ↔ 집단 가중)용 */
export function computeByMode(
  s: Signals,
  profile: ProfileKey,
  mode: ScoreMode
): ScoreResult {
  return mode === "fi" ? computeFI(s) : computeScore(s, profile);
}

// ── 위험 구간(밴드) ───────────────────────────────────────────────
// ⚠️ 기존 65/45는 임의값이었다 → 합성 잔여 모집단의 *분위수*로 교체(G5).
//   근거: 실제 복지부 발굴 시스템도 "위기 가능성 상위 약 4%"식 분위수 선별을 쓴다
//        (분위수 컷의 제도적 선례). 데모 모집단은 큐레이션됐으므로 4%가 아니라
//        잔여 모집단 분포의 상위 분위수(아래 주석의 백분위)로 밴드를 가른다.
//   값 산출: scripts/compute-bands.mjs (시드 고정 데이터에서 결정론적). 데이터 재생성 시 재계산.
export type Band = "high" | "mid" | "low";

export const BAND_CUTOFFS = {
  // 근거(데이터+운영): 고위험 80 ≈ 합성 잔여 모집단 가중점수 상위 약 38%(score≥80) 수준.
  //   compute-bands.mjs 분위수 참고(상위25%→83, 상위30%→82). 80은 발굴 티어 상단의 운영 조정값.
  high: 80,
  // 근거(운영): 주의 50 = 조합 발굴 임계(COMBINATION_CUTOFF)와 정렬 → "주의 이상 = 발굴 후보 진입".
  mid: 50,
} as const;

/** 밴드 근거 메타 (UI 설명용) — compute-bands.mjs 결과 기준 */
export const BAND_QUANTILE_NOTE =
  "고위험 80 = 잔여 모집단 상위 약 38% 수준 · 주의 50 = 발굴 임계와 정렬 (복지부 '상위 약 4%' 분위수 선별이 제도적 선례)";

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
