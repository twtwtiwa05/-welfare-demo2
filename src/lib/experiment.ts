// ═══════════════════════════════════════════════════════════════════════════
// 실증 실험 데이터 레이어 — experiment/ 의 산출물을 앱으로 이식
//
// 원천: experiment/reports/figure_data/{summary.json, shap_lam08.json}
//   · summary.json  = 3개 λ 시나리오 × 10개 모형의 지표·부트스트랩 CI·ablation·클래스별 사망률
//   · shap_lam08.json = 궤적구동(λ0.8) 세계에서의 SHAP 특징중요도
//
// 핵심 명제(정직): "위험과정이 궤적구동(λ↑)일 때, 다변량 시계열의 변화 궤적을
//   학습한 ML(LightGBM)·DL(1D-CNN)이 신호의 현재 수준만 보는 단일변수 임계값(OR)
//   방식을 유의하게 능가한다" — λ 조건부 명제(무조건 이긴다가 아님).
// ═══════════════════════════════════════════════════════════════════════════

import SUMMARY from "../data/experiment-summary.json";
import SHAP from "../data/experiment-shap.json";

// ── 타입 ────────────────────────────────────────────────────────────────────
export type MethodKey =
  | "OR_fixed"
  | "OR_tuned"
  | "Level_LR"
  | "Oracle_latent"
  | "Random"
  | "Tier1_full"
  | "Tier1_levels"
  | "Tier1_power"
  | "Tier1_DL"
  | "Oracle_window";

export type ClassKey =
  | "stable"
  | "rapid_decline"
  | "early_change"
  | "chronic_high"
  | "single_spike";

export type LamKey = "lam03" | "lam05" | "lam08";

export interface Metric {
  auroc: number;
  auprc: number;
  prevalence: number;
  "prec@5": number;
  "rec@5": number;
  "prec@10": number;
  "rec@10": number;
  "prec@20": number;
  "rec@20": number;
}
export interface CIPoint {
  point: number;
  lo: number;
  hi: number;
}
export interface CIDiff extends CIPoint {
  p_gt0: number;
}
export interface CIBlock {
  metric: Record<MethodKey, CIPoint>;
  diff_vs_OR_tuned: Record<MethodKey, CIDiff>;
}
export interface Ablation {
  full: number;
  levels: number;
  power: number;
  or: number;
  temporal_gain: number;
}
export interface LamScenario {
  lam: number;
  prevalence: number;
  n_test: number;
  n_pos: number;
  metrics: Record<MethodKey, Metric>;
  ci_auprc: CIBlock;
  ci_prec10: CIBlock;
  ablation: Ablation;
  class_death_rate: Record<ClassKey, number>;
}

export const EXPERIMENT = SUMMARY as Record<LamKey, LamScenario>;

// ── λ 시나리오 메타 (인터랙티브 스위처의 3단계) ──────────────────────────────
export const LAMBDAS: {
  key: LamKey;
  lam: number;
  label: string;
  regime: string;
  blurb: string;
}[] = [
  {
    key: "lam03",
    lam: 0.3,
    label: "λ 0.3",
    regime: "수준 구동",
    blurb: "위험이 신호의 ‘현재 수준’에 좌우되는 세계 — 임계값 방식에 유리. 시계열 우위가 사라짐(정직성).",
  },
  {
    key: "lam05",
    lam: 0.5,
    label: "λ 0.5",
    regime: "중간",
    blurb: "수준과 궤적이 반씩 섞인 세계 — 우위가 나타나기 시작하는 교차 구간.",
  },
  {
    key: "lam08",
    lam: 0.8,
    label: "λ 0.8",
    regime: "궤적 구동",
    blurb: "위험이 신호의 ‘변화 궤적’에 좌우되는 세계 — 이음누리 모델이 겨냥하는 실제 위기 발생 구조.",
  },
];

// ── 모형 메타 (한국어 라벨·그룹·색) ──────────────────────────────────────────
export type MethodGroup = "baseline" | "proposed" | "ablation" | "oracle" | "random";

export const METHODS: Record<
  MethodKey,
  { ko: string; short: string; group: MethodGroup; color: string; desc: string }
> = {
  OR_tuned: {
    ko: "단일변수 임계값 (최적)",
    short: "임계값(OR)",
    group: "baseline",
    color: "#64748b", // slate-500 — 비교 기준선
    desc: "각 신호가 임계값을 넘는지 개별 판정 후 OR 결합. 훈련자료로 임계 최적화한 steelman 기준.",
  },
  OR_fixed: {
    ko: "단일변수 임계값 (고정)",
    short: "임계값(고정)",
    group: "baseline",
    color: "#94a3b8", // slate-400
    desc: "고정 임계값 OR 규칙.",
  },
  Level_LR: {
    ko: "수준 기반 로지스틱",
    short: "수준 LR",
    group: "baseline",
    color: "#a8b3c2",
    desc: "신호의 현재 수준만 입력한 로지스틱 회귀 baseline.",
  },
  Tier1_full: {
    ko: "경사부스팅 (제안·주력)",
    short: "ML(부스팅)",
    group: "proposed",
    color: "#256EF4", // brand-500 — 주인공
    desc: "LightGBM + 시계열 파생특징(기울기·변화량·야간부하·일주기·무변화·동조). 이음누리 주력 모형.",
  },
  Tier1_DL: {
    ko: "1D-CNN (제안·딥러닝)",
    short: "DL(1D-CNN)",
    group: "proposed",
    color: "#0B78CB", // info-500 — 제안 딥러닝
    desc: "TCN 구조. 수기 파생특징 없이 원자료 다변량 시퀀스를 직접 학습.",
  },
  Tier1_levels: {
    ko: "부스팅·수준만 (ablation)",
    short: "부스팅(수준만)",
    group: "ablation",
    color: "#B1CEFB", // brand-200
    desc: "동일 부스팅에서 시계열 파생특징을 뺀 대조 — 수준 정보만.",
  },
  Tier1_power: {
    ko: "전력-only (ablation)",
    short: "전력만",
    group: "ablation",
    color: "#cbd5e1",
    desc: "실측 채널(전력)만으로 학습 — 순환논증 방어용 대조.",
  },
  Oracle_latent: {
    ko: "이상적 상한 (미래 천장)",
    short: "오라클(미래)",
    group: "oracle",
    color: "#FFB114", // warning-500
    desc: "자료생성에 쓰인 잠재 위험을 직접 사용한 이론적 상한. 실제 모형은 접근 불가.",
  },
  Oracle_window: {
    ko: "이상적 상한 (정보 천장)",
    short: "오라클(정보)",
    group: "oracle",
    color: "#ffcf6b",
    desc: "기준시점까지 관측된 정보만으로 달성 가능한 상한. 우리 모형이 도달하려는 천장.",
  },
  Random: {
    ko: "무작위",
    short: "무작위",
    group: "random",
    color: "#e2e8f0",
    desc: "무작위 우선순위 — 하한 기준.",
  },
};

// ── 잠재 위험 유형 메타 (레벨 트랩 서사) ─────────────────────────────────────
export const CLASSES: Record<
  ClassKey,
  { ko: string; color: string; desc: string; highlight?: "target" | "trap" }
> = {
  rapid_decline: {
    ko: "급속 악화형",
    color: "#DE3412", // danger-500
    desc: "여러 신호가 함께 꺾이는 유형 — 이음누리 모델이 겨냥하는 실제 고위험.",
    highlight: "target",
  },
  chronic_high: {
    ko: "만성 고위험형",
    color: "#FFB114", // warning-500
    desc: "수준은 높으나 변화가 없는 유형 — 임계값 방식이 위험으로 오탐(레벨 트랩).",
    highlight: "trap",
  },
  early_change: {
    ko: "조기 변화형",
    color: "#0B78CB",
    desc: "관측 초반에 변화가 나타나는 유형.",
  },
  single_spike: {
    ko: "단발 스파이크",
    color: "#86AFF9",
    desc: "일시적 급등 후 회복 — 관측층 미끼.",
  },
  stable: {
    ko: "안정형",
    color: "#94a3b8",
    desc: "신호가 안정적으로 유지되는 저위험 유형.",
  },
};

// ── SHAP 특징 한국어 라벨 (experiment/figures/make_figures.py: FEAT_KO) ───────
export const FEAT_KO: Record<string, string> = {
  pw_recent_mean: "전력 최근평균",
  pw_drop_pct: "전력 급감률",
  age: "연령",
  pw_slope: "전력 추세기울기",
  pw_cv: "전력 변동계수",
  pw_night_recent: "야간 기저부하(최근)",
  pw_night_drop: "야간부하 감소율",
  pw_IS: "일주기 규칙성(IS)",
  pw_IV: "일주기 변동성(IV)",
  pw_RA: "일주기 진폭(RA)",
  pw_flatstreak: "무변화 지속시간",
  pw_entropy: "활동 엔트로피",
  pw_amp: "일 전력진폭",
  medical_days_last: "진료단절 현재수준",
  medical_days_slope: "진료단절 상승기울기",
  medical_days_delta: "진료단절 최근변화",
  medical_days_max: "진료단절 최대",
  telecom_months_last: "통신연체 현재수준",
  telecom_months_slope: "통신연체 상승기울기",
  telecom_months_delta: "통신연체 최근변화",
  telecom_months_max: "통신연체 최대",
  mail_weeks_last: "우편미수령 현재수준",
  mail_weeks_slope: "우편미수령 상승기울기",
  mail_weeks_delta: "우편미수령 최근변화",
  mail_weeks_max: "우편미수령 최대",
  isolation_visits_last: "사회활동 현재수준",
  isolation_visits_slope: "사회활동 변화기울기",
  isolation_visits_delta: "사회활동 최근변화",
  isolation_visits_max: "사회활동 최대",
  syn_rising: "동시악화 신호수(동조)",
  codrop_mag: "공동악화 크기",
};

// ═══ 차트 성형 헬퍼 ══════════════════════════════════════════════════════════

export const K_METRIC: MetricKey[] = ["prec@5", "prec@10", "prec@20"];
type MetricKey = keyof Pick<
  Metric,
  "prec@5" | "prec@10" | "prec@20" | "auroc" | "auprc"
>;

/** precision@K 그룹막대: 선별 비율(5/10/20%)별로 여러 모형의 정밀도 */
export function precisionAtKData(lam: LamKey, methods: MethodKey[]) {
  const s = EXPERIMENT[lam];
  return (["prec@5", "prec@10", "prec@20"] as const).map((k) => {
    const row: Record<string, number | string> = {
      k: k === "prec@5" ? "상위 5%" : k === "prec@10" ? "상위 10%" : "상위 20%",
    };
    methods.forEach((m) => (row[m] = s.metrics[m][k]));
    return row;
  });
}

/** 부트스트랩 CI 포레스트: OR 대비 향상량(점추정·lo·hi·유의) */
export function ciForestData(
  lam: LamKey,
  block: "ci_auprc" | "ci_prec10",
  methods: MethodKey[]
) {
  const s = EXPERIMENT[lam];
  return methods.map((m) => {
    const d = s[block].diff_vs_OR_tuned[m];
    return {
      method: m,
      label: METHODS[m].short,
      color: METHODS[m].color,
      point: d.point,
      lo: d.lo,
      hi: d.hi,
      p_gt0: d.p_gt0,
      // recharts ErrorBar용 [아래폭, 위폭]
      err: [d.point - d.lo, d.hi - d.point] as [number, number],
      significant: d.lo > 0, // 95% CI가 0을 넘으면 유의
    };
  });
}

/** ablation: 시계열 기여의 출처 (full/levels/power/or) */
export function ablationData(lam: LamKey) {
  const a = EXPERIMENT[lam].ablation;
  return [
    { key: "full", label: "레벨+시계열\n(주력)", value: a.full, color: "#256EF4" },
    { key: "levels", label: "레벨만\n(동일 부스팅)", value: a.levels, color: "#B1CEFB" },
    { key: "or", label: "임계값(OR)", value: a.or, color: "#64748b" },
    { key: "power", label: "전력-only", value: a.power, color: "#cbd5e1" },
  ];
}

/** λ 스윕(정직성): 세계가 궤적구동일수록 시계열 기여가 커진다 */
export function lambdaSweepData() {
  return LAMBDAS.map(({ key, lam, regime }) => ({
    lam,
    label: `${lam}`,
    regime,
    temporal_gain: EXPERIMENT[key].ablation.temporal_gain,
    // 주력(부스팅) OR 대비 AUPRC 향상 + 유의여부
    ml_gain: EXPERIMENT[key].ci_auprc.diff_vs_OR_tuned.Tier1_full.point,
    ml_significant:
      EXPERIMENT[key].ci_auprc.diff_vs_OR_tuned.Tier1_full.lo > 0,
  }));
}

/** 클래스별 사망률(레벨 트랩): λ↑에서 만성고위험(레벨트랩) 사망률이 급감 */
export function classDeathRateData() {
  const order: ClassKey[] = [
    "rapid_decline",
    "chronic_high",
    "early_change",
    "single_spike",
    "stable",
  ];
  return order.map((c) => {
    const row: Record<string, number | string> = {
      klass: c,
      label: CLASSES[c].ko,
      color: CLASSES[c].color,
    };
    LAMBDAS.forEach(({ key, lam }) => (row[`l${lam}`] = EXPERIMENT[key].class_death_rate[c]));
    return row;
  });
}

/** SHAP 상위 N 특징 (한국어 라벨·시계열/수준 구분) */
export function shapTop(n = 12) {
  const temporal = new Set(SHAP.temporal as string[]);
  const rows = (SHAP.names as string[]).map((name, i) => ({
    name,
    label: FEAT_KO[name] ?? name,
    importance: (SHAP.importance as number[])[i],
    isTemporal: temporal.has(name),
  }));
  return rows
    .filter((r) => r.importance > 0)
    .sort((a, b) => b.importance - a.importance)
    .slice(0, n);
}

/** 지표 비교(요약): OR vs ML vs DL vs 오라클, 3개 지표 */
export function metricComparisonData(lam: LamKey) {
  const s = EXPERIMENT[lam];
  const rows: {
    metric: string;
    key: MetricKey;
    OR_tuned: number;
    Tier1_full: number;
    Tier1_DL: number;
    Oracle_window: number;
  }[] = [
    { metric: "AUROC", key: "auroc" },
    { metric: "AUPRC", key: "auprc" },
    { metric: "정밀도@상위10%", key: "prec@10" },
  ].map(({ metric, key }) => ({
    metric,
    key: key as MetricKey,
    OR_tuned: s.metrics.OR_tuned[key as MetricKey],
    Tier1_full: s.metrics.Tier1_full[key as MetricKey],
    Tier1_DL: s.metrics.Tier1_DL[key as MetricKey],
    Oracle_window: s.metrics.Oracle_window[key as MetricKey],
  }));
  return rows;
}

// ── 헤드라인 파생 수치 (초록의 핵심 문장을 자동 계산) ─────────────────────────
export function headline(lam: LamKey = "lam08") {
  const s = EXPERIMENT[lam];
  const mlP10 = s.metrics.Tier1_full["prec@10"];
  const orP10 = s.metrics.OR_tuned["prec@10"];
  const dlP10 = s.metrics.Tier1_DL["prec@10"];
  const auprcDiff = s.ci_auprc.diff_vs_OR_tuned.Tier1_full;
  // 배수는 화면에 표시되는 반올림 정밀도(예: 12.5% vs 4.4%)에서 계산 — 표시값과 정합·과장 방지
  const mlPctR = Math.round(mlP10 * 1000) / 10;
  const orPctR = Math.round(orP10 * 1000) / 10;
  return {
    lam: s.lam,
    mlP10,
    orP10,
    dlP10,
    ratio: orPctR > 0 ? mlPctR / orPctR : 0, // 방문 적중 배수(표시 정밀도 기준)
    auprcMl: s.metrics.Tier1_full.auprc,
    auprcOr: s.metrics.OR_tuned.auprc,
    auprcDiff, // {point, lo, hi, p_gt0}
    nTest: s.n_test,
    nPos: s.n_pos,
  };
}

// 표시 포맷
export const pct = (v: number, d = 1) => `${(v * 100).toFixed(d)}%`;
export const dec = (v: number, d = 3) => v.toFixed(d);
export const signed = (v: number, d = 3) => `${v >= 0 ? "+" : ""}${v.toFixed(d)}`;
