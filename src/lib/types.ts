// 도메인 타입 — households.json 스키마와 1:1 대응

export type ProfileKey = "elderly" | "middleaged";
export type RiskLevel = "high" | "mid" | "low";
/** 기획서 1.4의 잔여 케이스 분류. null = 일반 케이스 */
export type CaseType = "A" | "B" | "C" | null;

/** 위험 신호 5종의 키. scoring.SIGNAL_KEYS가 이 순서를 따른다. */
export type SignalKey = "power" | "medical" | "mail" | "telecom" | "isolation";

export interface Signals {
  /** 전력 사용 급감률 (%) */
  powerDropPct: number;
  /** 마지막 진료 이후 경과일 */
  daysSinceMedical: number;
  /** 우편 미수령 주 */
  mailUncollectedWeeks: number;
  /** 통신비 연체 개월 */
  telecomOverdueMonths: number;
  /** 최근 6개월 복지관 이용 횟수 */
  welfareCenterVisits6mo: number;
}

export interface HistoryPoint {
  week: string;
  /** 해당 주 위험 점수 (signalHistory로부터 집단 가중모형으로 산출) */
  score: number;
}

/**
 * ★ v3: 신호별 8주 원시 궤적 — 다변량 이상탐지(작업 B)의 입력.
 * 마지막 주(W8) 값은 Household.signals와 일치한다.
 * "여러 신호가 동시에 2주 만에 꺾이는" 결합 급락을 표현하기 위해 점수 시계열이 아닌
 * 신호별 원시 시계열을 보관한다.
 */
export interface SignalHistoryPoint {
  week: string; // "W1" .. "W8"
  /** 전력 사용 급감률 (%) */
  power: number;
  /** 마지막 진료 이후 경과일 */
  medical: number;
  /** 우편 미수령 주 */
  mail: number;
  /** 통신비 연체 개월 */
  telecom: number;
  /** 최근 6개월 복지관 이용 횟수(주간 스냅샷) */
  isolation: number;
}

/** 변화점(급락 시점) — 변화탐지(CUSUM/PELT) 산출 */
export interface ChangePoint {
  signal: SignalKey;
  /** 1-based 주차 (급변이 시작된 시점) */
  week: number;
  /** 변화 크기 (정규화 결핍 0~1 기준) */
  magnitude: number;
}

/**
 * ★ v3: 오프라인 ML 파이프라인(scripts/run_ml.py)이 산출하는 보조 신호.
 *
 * ⚠️ G1·G2: 이 값들은 "위험점수"를 대체하지 않는다. 헤드라인 위험점수는 여전히
 *    scoring.ts의 투명 결정론 공식(Frailty Index)이 만든다. ML은 *별도 보조 신호*
 *    (급속·다변량 악화 선별·우선순위 그룹화)만 만든다.
 * ⚠️ G4: ML은 판정·자동처리하지 않는다. 추천·정렬까지만. 최종 결정은 사람.
 * ⚠️ 런타임에 모델이 돌지 않는다 — 오프라인에서 계산해 JSON에 구운 값을 *표시만* 한다.
 */
export interface MlSignals {
  /** Isolation Forest 기반 다변량 이상점수 0~1 (높을수록 이상) */
  anomalyScore: number;
  /** 모집단 내 이상도 백분위 0~100 */
  anomalyPercentile: number;
  /** 보조 이상신호: Local Outlier Factor 점수 (정규화 0~1) */
  lofScore: number;
  /** 보조 이상신호: robust Mahalanobis 거리 (정규화 0~1, MCD 기반) */
  mahalanobis: number;
  /** 급속·다변량 악화 플래그 (다변량 이상도↑ + 결합 급락 동시) */
  isRapidDecline: boolean;
  /** 궤적 군집 id (k-means) */
  clusterId: number;
  /** 궤적 군집의 사람이 읽는 라벨 (예: "급속 다변량 악화") */
  clusterLabel: string;
  /** 신호별 Theil-Sen 기울기 (결핍/주, 양수=악화 방향) */
  trendSlopes: Record<SignalKey, number>;
  /** 변화점(급락 시점) 목록 */
  changePoints: ChangePoint[];
  /** 이상에 가장 크게 기여한 상위 신호 */
  topSignals: SignalKey[];
}

export interface Household {
  id: string;
  dong: string;
  ageBand: string;
  sex: "F" | "M";
  profileGroup: ProfileKey;
  /** 등록상 1인가구 여부. false인데 위험하면 유형 A 후보 */
  registeredAlone: boolean;
  /** ⚠️ 시뮬레이션 플래그: 행복e음이 이미 포착했는지. 2단계에서 제거 기준 */
  haengbokFlagged: boolean;
  /** ★ 누적 통보 횟수 (수원 모녀 모티프). 우선순위 동점 시 반복 통보 우대 */
  repeatedFlags: number;
  /** ★ 합성 좌표 (0~1 정규화) — 방문 동선용. ⚠️ 실서비스에선 법적 근거 하 재식별 후에만 */
  coords: { x: number; y: number };
  signals: Signals;
  /** ★ v3: 신호별 8주 원시 궤적 (다변량 이상탐지 입력). W8 = signals */
  signalHistory: SignalHistoryPoint[];
  /** ★ v3: 오프라인 ML 산출 보조 신호 (scripts/run_ml.py). 미실행 시 undefined */
  ml?: MlSignals;
  /** ⚠️ 우리가 설계한 정답(합성). 화면 점수가 아니며 발굴 성능 증명용도 아님 */
  groundTruthRisk: RiskLevel;
  caseType: CaseType;
  history: HistoryPoint[];
}
