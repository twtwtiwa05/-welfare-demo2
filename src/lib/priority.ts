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

// ── ★ 추세 반영 우선순위 (plan 9.3) ────────────────────────────────
// 단순 점수순이 아니라 '최근 추세 상승폭'을 함께 반영한다.
// ⚠️ 이 순서는 투명 공식이 만든다 — AI(근거 서술 모듈)가 만들지 않는다.
//    LLM은 "왜 이 순서인지"를 서술만 한다.

/** 우선순위 가중치: 최근 1주 상승폭에 곱해 '급격히 악화 중'인 가구를 끌어올린다. */
export const RISING_WEIGHT = 1.2;

/**
 * 우선순위 점수 = 현재 위험점수 + max(0, 최근 1주 상승폭) × RISING_WEIGHT
 * 상승만 가산한다(하강은 불이익 없음).
 */
export function priorityScore(h: Household): number {
  const base = computeScore(h.signals, h.profileGroup).score;
  return base + Math.max(0, weeklyDelta(h)) * RISING_WEIGHT;
}

export interface RankedHousehold {
  household: Household;
  /** 1-based 순위 */
  rank: number;
  /** 현재 위험점수 */
  score: number;
  /** 최근 1주 상승폭(부호 포함) */
  delta: number;
  /** 우선순위 점수(정렬 기준) */
  priority: number;
}

/**
 * 우선순위 정렬: priorityScore 내림차순.
 * 동점이면 반복 통보(repeatedFlags) 우대 → 수원 모녀처럼 반복·누적된 가구가 위로.
 */
export function rankByPriority(households: Household[]): RankedHousehold[] {
  return [...households]
    .map((h) => ({
      household: h,
      score: computeScore(h.signals, h.profileGroup).score,
      delta: weeklyDelta(h),
      priority: priorityScore(h),
    }))
    .sort(
      (a, b) =>
        b.priority - a.priority ||
        b.household.repeatedFlags - a.household.repeatedFlags ||
        b.score - a.score
    )
    .map((r, i) => ({ ...r, rank: i + 1 }));
}
