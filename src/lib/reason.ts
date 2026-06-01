// 시뮬레이션 근거 생성기 — 4단계. (plan 0절 원칙 2)
//
// ⚠️ 이것은 LLM이 아니다. 실서비스에서는 이 자리에 LLM(예: Haiku 4.5급)이 들어가,
//    "이미 계산된 점수와 신호"를 입력받아 자연어 근거·권고만 생성한다.
//    LLM은 점수를 다시 계산하지 않으며 위험 여부를 새로 판단하지 않는다(서술·해석만).
//    데모에서는 동일한 입력→출력 구조를 결정론적 템플릿으로 재현한다. 화면에 SimBadge로 명시.

import { computeScore, riskBand, SIGNAL_META, type SignalKey } from "./scoring";
import { thresholdMethod, combinationMethod } from "./priority";
import type { Household } from "./types";

export interface Recommendation {
  action: string;
  detail: string;
}

export interface ReasonResult {
  rationale: string;
  recommendations: Recommendation[];
  /** 반대 근거·불확실성 (자동화 편향 방어 — 기획서 8장). 없으면 null */
  counterEvidence: string | null;
  /** 근거의 출처가 된 신호 칩 (환각 방어 — 근거는 주어진 신호에만 기반) */
  basisSignals: string[];
}

const BAND_PHRASE: Record<string, string> = {
  high: "고위험 수준으로 평가됩니다",
  mid: "주의가 필요한 수준입니다",
  low: "현재로서는 관찰 수준입니다",
};

// 신호별 서술 조각 (정규화 기여 상위 신호에 대해 사용)
function signalPhrase(key: SignalKey, h: Household): string {
  const s = h.signals;
  switch (key) {
    case "power":
      return `전력 사용이 ${s.powerDropPct}% 감소`;
    case "medical":
      return `진료 기록이 ${s.daysSinceMedical}일째 끊김`;
    case "mail":
      return `우편물이 ${s.mailUncollectedWeeks}주간 미수령`;
    case "telecom":
      return `통신비가 ${s.telecomOverdueMonths}개월 연체`;
    case "isolation":
      return s.welfareCenterVisits6mo === 0
        ? "최근 6개월 복지관 이용 이력 없음"
        : `복지관 이용 ${s.welfareCenterVisits6mo}회`;
  }
}

// 신호별 권고 매핑
function signalRecommendation(key: SignalKey): Recommendation | null {
  switch (key) {
    case "medical":
      return {
        action: "보건소 방문건강관리 연계",
        detail: "장기 진료 단절에 대한 건강 상태 확인이 우선입니다.",
      };
    case "power":
      return {
        action: "전화 안부 확인 후 가정 방문 검토",
        detail: "생활 반응 저하 여부를 1차로 확인합니다.",
      };
    case "mail":
      return {
        action: "거주 실태 현장 확인",
        detail: "우편 미수령은 부재·단절 가능성을 시사합니다.",
      };
    case "telecom":
      return {
        action: "통신·요금 상태 점검 및 연락",
        detail: "연체는 경제적 어려움 또는 연락 두절의 신호일 수 있습니다.",
      };
    case "isolation":
      return {
        action: "지역 복지관 프로그램 연계",
        detail: "사회적 관계망 회복을 통한 모니터링 채널을 확보합니다.",
      };
  }
}

const CASE_PHRASE: Record<string, string> = {
  A: " 등록상 가족과 동거로 분류돼 1인가구 필터에는 잡히지 않으나, 생활 신호는 실질적 단절 가능성을 시사합니다.",
  B: " 개별 신호는 각각 단일 기준을 넘지 않지만, 여러 신호가 동시에 임계 근처에 있어 조합적으로 위험합니다.",
  C: " 전국 범용 기준에서는 저평가되나, 중장년 1인가구 특화 모형에서는 통신 연체·사회적 고립의 가중치가 높아 주의가 필요합니다.",
};

/**
 * 시뮬 근거 생성. 입력은 가구(=이미 정해진 신호)이고,
 * 점수는 scoring.computeScore로 별도 산출된 것을 '설명'한다(다시 계산하는 게 아님).
 */
export function generateReason(h: Household): ReasonResult {
  const { score, breakdown } = computeScore(h.signals, h.profileGroup);
  const band = riskBand(score);

  // 기여도 상위 신호 추출 (점수에 실제로 기여한 것만)
  const ranked = [...breakdown]
    .filter((b) => b.contribution > 0)
    .sort((a, b) => b.contribution - a.contribution);
  const topKeys = ranked.slice(0, 3).map((b) => b.key);

  // 근거 서술
  const topPhrases = ranked.slice(0, 2).map((b) => signalPhrase(b.key, h));
  let rationale = `위험 점수 ${score}점으로 ${BAND_PHRASE[band]}. `;
  if (topPhrases.length > 0) {
    rationale += `${topPhrases.join("과(와) ")} 신호가 함께 관측됩니다.`;
  }
  if (h.caseType && CASE_PHRASE[h.caseType]) {
    rationale += CASE_PHRASE[h.caseType];
  }

  // 권고 — 상위 신호 기반으로 최대 2개. 부족하면 기본 권고로 채움
  const recs: Recommendation[] = [];
  for (const key of topKeys) {
    const r = signalRecommendation(key);
    if (r && !recs.some((x) => x.action === r.action)) recs.push(r);
    if (recs.length === 2) break;
  }
  if (recs.length === 0) {
    recs.push({
      action: "담당자 1차 전화 상담",
      detail: "현재 신호 수준에서는 경과 관찰과 안부 확인을 권합니다.",
    });
  }

  // 반대 근거·불확실성 — 오탐 후보(단일 신호만 높아 임계엔 걸리나 조합 점수 낮음)
  let counterEvidence: string | null = null;
  const passesThreshold = thresholdMethod(h.signals);
  const passesCombination = combinationMethod(h);
  if (passesThreshold && !passesCombination) {
    counterEvidence =
      "단일 신호가 임계를 넘었으나 다른 신호는 정상 범위입니다. 장기 외출·입원 등 비위험 사유일 수 있어 즉시 고위험으로 단정하지 않습니다.";
  } else if (h.caseType === "A") {
    counterEvidence =
      "실거주 확인 데이터가 없어 단절 여부는 추정입니다. 등록 정보만으로는 확정할 수 없으므로 현장 확인이 필요합니다.";
  } else if (band !== "low") {
    counterEvidence =
      "소득·재산 등 제도 자격 정보는 포함되지 않았습니다. 최종 개입 판단에는 담당자의 현장 확인이 필요합니다.";
  }

  // 출처 칩 — 근거가 기반한 신호 (환각 방어)
  const basisSignals = ranked.slice(0, 3).map((b) => {
    const meta = SIGNAL_META[b.key];
    const raw = h.signals[meta.field];
    return `${meta.short} ${meta.format(raw)}`;
  });

  return { rationale, recommendations: recs, counterEvidence, basisSignals };
}
