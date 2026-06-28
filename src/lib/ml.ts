// ML 보조신호 접근·표현 헬퍼 (작업 B).
//
// ⚠️ 가드레일: 여기서 다루는 anomalyScore·cluster·changePoint는 *보조 신호*다(G2).
//    헤드라인 위험점수가 아니다(그건 scoring.ts). ML은 판정하지 않는다(G4) — 선별·정렬까지만.
//    값은 scripts/run_ml.py가 오프라인에서 구운 것을 *표시만* 한다.

import type { Household, MlSignals, SignalKey } from "./types";
import { SIGNAL_META } from "./scoring";

/** ml 미산출(파이프라인 미실행) 시 안전 폴백 */
export const EMPTY_ML: MlSignals = {
  anomalyScore: 0,
  anomalyPercentile: 0,
  lofScore: 0,
  mahalanobis: 0,
  isRapidDecline: false,
  clusterId: -1,
  clusterLabel: "미분류",
  trendSlopes: { power: 0, medical: 0, mail: 0, telecom: 0, isolation: 0 },
  changePoints: [],
  topSignals: [],
};

export function ml(h: Household): MlSignals {
  return h.ml ?? EMPTY_ML;
}

export function isRapidDecline(h: Household): boolean {
  return ml(h).isRapidDecline;
}

export function anomalyScore(h: Household): number {
  return ml(h).anomalyScore;
}

/** 이상도 구간 (배지 색용) — 명시적 가정 컷 */
export type AnomalyLevel = "high" | "mid" | "low";
export function anomalyLevel(score: number): AnomalyLevel {
  if (score >= 0.66) return "high";
  if (score >= 0.4) return "mid";
  return "low";
}

export const ANOMALY_STYLES: Record<
  AnomalyLevel,
  { text: string; bg: string; border: string; dot: string }
> = {
  high: { text: "text-rose-700", bg: "bg-rose-50", border: "border-rose-300", dot: "bg-rose-500" },
  mid: { text: "text-amber-700", bg: "bg-amber-50", border: "border-amber-300", dot: "bg-amber-500" },
  low: { text: "text-slate-500", bg: "bg-slate-50", border: "border-slate-200", dot: "bg-slate-400" },
};

/** 궤적 군집 라벨 → 표현 메타 (run_ml.py가 내는 라벨 문자열 기준) */
export interface ClusterStyle {
  tone: "rapid" | "chronic" | "econ" | "health" | "stable" | "other";
  chip: string;
  ring: string;
  blurb: string;
}

export const CLUSTER_STYLES: Record<string, ClusterStyle> = {
  "급속 다변량 악화": {
    tone: "rapid",
    chip: "bg-rose-100 text-rose-700 border-rose-200",
    ring: "ring-rose-200",
    blurb: "여러 신호가 동시에 최근 급격히 악화 — 우선 점검 1순위",
  },
  "만성 고위험 (다신호 누적)": {
    tone: "chronic",
    chip: "bg-red-100 text-red-700 border-red-200",
    ring: "ring-red-200",
    blurb: "다신호가 높은 수준으로 누적·정체 — 이미 위험, 지속 관리",
  },
  "초기 변화 감지군": {
    tone: "other",
    chip: "bg-sky-100 text-sky-700 border-sky-200",
    ring: "ring-sky-200",
    blurb: "위험 점수는 아직 낮으나 최근 신호 변화 감지 — 조기 관찰",
  },
  "경제·고립 중심 악화": {
    tone: "econ",
    chip: "bg-amber-100 text-amber-700 border-amber-200",
    ring: "ring-amber-200",
    blurb: "통신 연체·사회적 고립이 두드러짐 — 경제·관계망 점검",
  },
  "전력·진료 중심 악화": {
    tone: "health",
    chip: "bg-orange-100 text-orange-700 border-orange-200",
    ring: "ring-orange-200",
    blurb: "전력 급감·진료 단절 중심 — 건강·생활반응 확인",
  },
  "안정·관찰 (저위험군)": {
    tone: "stable",
    chip: "bg-slate-100 text-slate-600 border-slate-200",
    ring: "ring-slate-200",
    blurb: "현재 변화·수준 모두 낮음 — 경과 관찰",
  },
};

export function clusterStyle(label: string): ClusterStyle {
  return (
    CLUSTER_STYLES[label] ?? {
      tone: "other",
      chip: "bg-slate-100 text-slate-600 border-slate-200",
      ring: "ring-slate-200",
      blurb: "혼합 패턴",
    }
  );
}

/** 변화점/급락 신호의 사람이 읽는 짧은 설명 */
export function topSignalLabels(h: Household): string[] {
  return ml(h).topSignals.map((k: SignalKey) => SIGNAL_META[k].short);
}

/** 잔여 모집단을 군집별로 묶어 대표 통계와 함께 반환 (방문계획 그룹 카드용) */
export interface ClusterGroup {
  clusterId: number;
  label: string;
  members: Household[];
  rapidCount: number;
  avgAnomaly: number;
}

export function groupByCluster(households: Household[]): ClusterGroup[] {
  // 사람이 읽는 라벨(패턴) 기준으로 묶는다 — 같은 패턴의 k-means 군집을 한 카드로.
  const byLabel = new Map<string, Household[]>();
  for (const h of households) {
    const label = ml(h).clusterLabel;
    if (!byLabel.has(label)) byLabel.set(label, []);
    byLabel.get(label)!.push(h);
  }
  const groups: ClusterGroup[] = [];
  for (const [label, members] of byLabel) {
    const rapidCount = members.filter(isRapidDecline).length;
    const avgAnomaly =
      members.reduce((a, h) => a + anomalyScore(h), 0) / (members.length || 1);
    groups.push({
      clusterId: ml(members[0]).clusterId,
      label,
      members,
      rapidCount,
      avgAnomaly,
    });
  }
  // 급속악화 그룹 우선, 그다음 평균 이상도 높은 순
  return groups.sort((a, b) => {
    const ar = a.label === "급속 다변량 악화" ? 1 : 0;
    const br = b.label === "급속 다변량 악화" ? 1 : 0;
    return br - ar || b.avgAnomaly - a.avgAnomaly;
  });
}
