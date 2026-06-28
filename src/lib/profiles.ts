// 집단 프로파일별 가중치 — ②(집단특화)의 증명 수단 + 무가중 FI 베이스라인.
//
// 점수의 *형식*은 Rockwood Frailty Index(결핍누적)에서 온다(scoring.ts 참조).
//   · 무가중 베이스라인 = 고전 FI(결핍 평균). 아래 UNIFORM_WEIGHTS로 표현.
//   · 집단특화 확장 = 문헌/제도로 *방향·상한이 제약된* 가중치(아래 PROFILES).
//
// ⚠️ 가중치는 "막 정한 값"이 아니다. A-5 근거표의 근거 강도가 상한을 제약한다:
//   - power(강)   : 높은 가중 허용 (한전·통신3사 안부살핌 등 실서비스 + 비침습 모니터링 논문)
//   - medical(중) : 중간 가중 (1인가구 미충족 의료 실증; 독거노인에서 특히 결정적)
//   - telecom(중) : 중간 가중 (요금 체납류 경제신호 + 실서비스 통신데이터 활용)
//   - isolation(중): 중간 가중 (사회적 단절–사망위험; 단, 이분지표는 약함→과도 가중 금지)
//   - mail(약)    : ⚠️ 최저 가중 강제 (확립된 출처 없음 → 보조신호. 가짜 인용 금지)
//
// 같은 가구라도 어떤 집단 모형으로 보느냐에 따라 점수가 달라진다(Step3 토글로 시연).

import type { ProfileKey, SignalKey } from "./types";

export type Weights = Record<SignalKey, number>;

/**
 * 무가중 FI 베이스라인 — 모든 신호 균등 가중(=결핍 단순 평균).
 * 합 100, 각 20. computeFI()가 사용. "가중치 없이도 되는 근거 기반 베이스라인".
 */
export const UNIFORM_WEIGHTS: Weights = {
  power: 20,
  medical: 20,
  mail: 20,
  telecom: 20,
  isolation: 20,
};

/** 각 프로파일 가중치의 합은 100 (점수 0~100 스케일 유지) */
export const PROFILES: Record<ProfileKey, Weights> = {
  // 독거노인: 진료 단절·전력 급감이 핵심. 우편(약)은 최저 가중.
  //   근거: 독거노인 의료접점 단절의 위험(박채린·김현우 2025) + 전력 비침습 모니터링(실서비스).
  elderly: { power: 28, medical: 30, telecom: 12, isolation: 18, mail: 12 },
  // 중장년 1인가구: 전력·통신 연체·사회적 고립이 상대적으로 더 결정적. 우편 최저.
  //   근거: 중장년 1인 고독사에서 경제취약·사회적 단절 비중(고독사 실태). isolation 과도 가중은 회피.
  middleaged: { power: 30, telecom: 24, isolation: 22, medical: 14, mail: 10 },
};

export const PROFILE_LABELS: Record<ProfileKey, string> = {
  elderly: "독거노인 (70대+)",
  middleaged: "중장년 1인가구 (50~60대)",
};

export const PROFILE_NOTES: Record<ProfileKey, string> = {
  elderly: "진료·전력 신호 가중 ↑ · 우편(보조) 최저",
  middleaged: "통신·고립 신호 가중 ↑ · 우편(보조) 최저",
};

export const PROFILE_KEYS: ProfileKey[] = ["elderly", "middleaged"];
