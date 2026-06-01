// 도메인 타입 — households.json 스키마와 1:1 대응

export type ProfileKey = "elderly" | "middleaged";
export type RiskLevel = "high" | "mid" | "low";
/** 기획서 1.4의 잔여 케이스 분류. null = 일반 케이스 */
export type CaseType = "A" | "B" | "C" | null;

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
  score: number;
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
  /** ⚠️ 우리가 설계한 정답(합성). 화면 점수가 아니며 발굴 성능 증명용도 아님 */
  groundTruthRisk: RiskLevel;
  caseType: CaseType;
  history: HistoryPoint[];
}
