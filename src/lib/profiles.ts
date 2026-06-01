// 집단 프로파일별 가중치 — ②(집단특화)의 유일한 증명 수단.
//
// 전국 범용 모형 하나가 아니라, 집단마다 다른 가중치 셋을 쓴다.
// 같은 가구라도 어떤 집단 모형으로 보느냐에 따라 점수가 달라진다(Step3 토글로 시연).
// 기획서 극복지점 ②: "전국 범용 모형 → 지역·집단 특화 모형".

import type { ProfileKey } from "./types";
import type { SignalKey } from "./scoring";

export type Weights = Record<SignalKey, number>;

/** 각 프로파일 가중치의 합은 100 (점수 0~100 스케일 유지) */
export const PROFILES: Record<ProfileKey, Weights> = {
  // 독거노인: 진료 단절·우편 미수령이 위험의 핵심 신호
  elderly: { power: 25, medical: 30, mail: 25, telecom: 10, isolation: 10 },
  // 중장년 1인가구: 통신 연체·사회적 고립이 상대적으로 더 결정적
  middleaged: { power: 30, medical: 15, mail: 15, telecom: 20, isolation: 20 },
};

export const PROFILE_LABELS: Record<ProfileKey, string> = {
  elderly: "독거노인 (70대+)",
  middleaged: "중장년 1인가구 (50~60대)",
};

export const PROFILE_NOTES: Record<ProfileKey, string> = {
  elderly: "진료·우편 신호 가중 ↑",
  middleaged: "통신·고립 신호 가중 ↑",
};

export const PROFILE_KEYS: ProfileKey[] = ["elderly", "middleaged"];
