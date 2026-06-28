// 임계값 방식 vs 조합 방식 — 5단계. 극복지점 ①② 증명.
//
// 기존(임계값 OR): 신호 하나라도 임계를 넘으면 발굴, 아니면 누락.
// 우리(조합): 가중합 점수가 기준 이상이면 발굴.
// → 개별 신호는 임계 미달이라 OR 규칙엔 안 걸리지만, 동시에 임계 근처면 조합으로 건진다.
//
// ⚠️ 합성 데이터이므로 '몇 배 더 발굴' 같은 절대수치는 의미가 없다(기획서 6.1).
//    이 비교가 증명하는 것은 발굴량이 아니라 '조합으로 보면 임계 미달도 후보가 된다'는 메커니즘이다.

import { computeScore, SIGNAL_META } from "./scoring";
import { weeklyDelta } from "./history";
import { anomalyScore, isRapidDecline } from "./ml";
import type { Household, Signals } from "./types";

export const COMBINATION_CUTOFF = 50;

/** 기존 임계값 OR 방식: 단일 신호 임계 초과 시 발굴 */
export function thresholdMethod(s: Signals): boolean {
  return (
    s.powerDropPct >= SIGNAL_META.power.threshold! ||
    s.daysSinceMedical >= SIGNAL_META.medical.threshold! ||
    s.mailUncollectedWeeks >= SIGNAL_META.mail.threshold! ||
    s.telecomOverdueMonths >= SIGNAL_META.telecom.threshold!
  );
}

/** 우리 조합 방식: 집단 가중합 점수가 cutoff 이상이면 발굴 */
export function combinationMethod(
  h: Household,
  cutoff: number = COMBINATION_CUTOFF
): boolean {
  return computeScore(h.signals, h.profileGroup).score >= cutoff;
}

export interface MethodComparison {
  /** 거짓음성(놓침) 관점 집계 — groundTruth high 기준. 기획서 6.2의 1순위 지표 */
  groundTruthHigh: number;
  thresholdMissedHigh: number; // 임계값이 놓친 high 가구
  combinationMissedHigh: number; // 조합이 놓친 high 가구
  recoveredHigh: number; // 임계값은 놓쳤지만 조합이 회수한 high 가구
}

export interface PriorityResult {
  cutoff: number;
  thresholdFound: Household[];
  combinationFound: Household[];
  /** 조합으로만 발굴(임계값은 누락) — 추가로 보게 되는 케이스 */
  onlyCombination: Household[];
  /** 임계값으로만 발굴(조합은 보류) — 오탐 후보. 단일 신호만 높은 경우 */
  onlyThreshold: Household[];
  comparison: MethodComparison;
}

export function compareMethods(
  residual: Household[],
  cutoff: number = COMBINATION_CUTOFF
): PriorityResult {
  const thresholdFound = residual.filter((h) => thresholdMethod(h.signals));
  const combinationFound = residual.filter((h) => combinationMethod(h, cutoff));

  const thresholdSet = new Set(thresholdFound.map((h) => h.id));
  const combinationSet = new Set(combinationFound.map((h) => h.id));

  const onlyCombination = combinationFound.filter(
    (h) => !thresholdSet.has(h.id)
  );
  const onlyThreshold = thresholdFound.filter((h) => !combinationSet.has(h.id));

  const high = residual.filter((h) => h.groundTruthRisk === "high");
  const thresholdMissedHigh = high.filter(
    (h) => !thresholdSet.has(h.id)
  ).length;
  const combinationMissedHigh = high.filter(
    (h) => !combinationSet.has(h.id)
  ).length;
  const recoveredHigh = high.filter(
    (h) => !thresholdSet.has(h.id) && combinationSet.has(h.id)
  ).length;

  return {
    cutoff,
    thresholdFound,
    combinationFound,
    onlyCombination,
    onlyThreshold,
    comparison: {
      groundTruthHigh: high.length,
      thresholdMissedHigh,
      combinationMissedHigh,
      recoveredHigh,
    },
  };
}

// ── ★ 투명 우선순위 융합 (작업 B-3) ────────────────────────────────
// 단순 점수순이 아니라 4개 투명 항을 *명시적 가중*으로 합산한다:
//   priority = 위험점수(가중) + 급속악화(ML 이상점수) + 최근 추세상승 + 반복 통보
// ⚠️ 블랙박스 랭커 금지(합성 라벨 지도학습 랭킹은 순환적·G1 위반). 가중·규칙은 전부 명시·조정가능.
//    ML(anomalyScore)은 *판정*이 아니라 우선순위의 한 *입력*일 뿐이다(G2·G4). 최종 결정은 사람.

/** 우선순위 융합 가중치 — 전부 명시·조정가능(가정). */
export const PRIORITY_WEIGHTS = {
  /** 위험점수(0~100) 계수 */
  risk: 1.0,
  /** 급속·다변량 악화 이상점수(0~1)에 곱하는 가산점 */
  anomaly: 25,
  /** 최근 1주 상승폭(양수만)에 곱하는 가산점 */
  rise: 1.2,
  /** 반복 통보 1회당 가산점 (수원 모녀 모티프 — 반복·누적 가구를 위로) */
  repeat: 1.5,
} as const;

/** 추세 반영 점수(0~100+) — caseMeta의 P1/P2/P3 구간 판정에 쓰는 가벼운 보정 점수 */
export const RISING_WEIGHT = PRIORITY_WEIGHTS.rise;
export function priorityScore(h: Household): number {
  const base = computeScore(h.signals, h.profileGroup).score;
  return base + Math.max(0, weeklyDelta(h)) * RISING_WEIGHT;
}

export interface PriorityBreakdown {
  /** 위험점수(가중) */
  riskTerm: number;
  /** 급속악화(ML 이상) 가산 */
  anomalyTerm: number;
  /** 추세상승 가산 */
  riseTerm: number;
  /** 반복통보 가산 */
  repeatTerm: number;
  /** 합 (정렬 기준) */
  total: number;
  /** "왜 위로 왔나" 설명 칩 */
  reasons: string[];
}

/** 투명 융합 우선순위 분해 — UI가 "왜 위로 왔나"를 그대로 보여줄 수 있게 */
export function priorityBreakdown(h: Household): PriorityBreakdown {
  const base = computeScore(h.signals, h.profileGroup).score;
  const rise = Math.max(0, weeklyDelta(h));
  const anom = anomalyScore(h); // 0~1
  const repeat = h.repeatedFlags;

  const riskTerm = base * PRIORITY_WEIGHTS.risk;
  const anomalyTerm = anom * PRIORITY_WEIGHTS.anomaly;
  const riseTerm = rise * PRIORITY_WEIGHTS.rise;
  const repeatTerm = repeat * PRIORITY_WEIGHTS.repeat;

  const reasons: string[] = [];
  if (isRapidDecline(h)) reasons.push("급속·다변량 악화");
  else if (anom >= 0.5) reasons.push("이상 추세 감지");
  if (rise > 0) reasons.push(`최근 +${rise}점`);
  if (repeat >= 3) reasons.push(`반복 통보 ${repeat}회`);
  if (reasons.length === 0) reasons.push(`위험점수 ${base}점`);

  return {
    riskTerm,
    anomalyTerm,
    riseTerm,
    repeatTerm,
    total: riskTerm + anomalyTerm + riseTerm + repeatTerm,
    reasons,
  };
}

export interface RankedHousehold {
  household: Household;
  /** 1-based 순위 */
  rank: number;
  /** 현재 위험점수(가중) */
  score: number;
  /** 최근 1주 상승폭(부호 포함) */
  delta: number;
  /** ML 다변량 이상점수 0~1 */
  anomaly: number;
  /** 급속·다변량 악화 플래그 */
  rapid: boolean;
  /** 융합 우선순위 점수(정렬 기준) */
  priority: number;
  /** 융합 분해(설명용) */
  breakdown: PriorityBreakdown;
}

/**
 * 우선순위 정렬: 융합 점수 내림차순.
 * 동점이면 반복 통보(repeatedFlags) → 위험점수 순으로 우대.
 */
export function rankByPriority(households: Household[]): RankedHousehold[] {
  return [...households]
    .map((h) => {
      const breakdown = priorityBreakdown(h);
      return {
        household: h,
        score: computeScore(h.signals, h.profileGroup).score,
        delta: weeklyDelta(h),
        anomaly: anomalyScore(h),
        rapid: isRapidDecline(h),
        priority: breakdown.total,
        breakdown,
      };
    })
    .sort(
      (a, b) =>
        b.priority - a.priority ||
        b.household.repeatedFlags - a.household.repeatedFlags ||
        b.score - a.score
    )
    .map((r, i) => ({ ...r, rank: i + 1 }));
}
