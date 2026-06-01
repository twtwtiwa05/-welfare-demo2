// 케이스 상세의 '운영 메타' — 진짜 케이스 관리 화면처럼 보이게 하는 보조 필드.
// households.json엔 없는 값이므로 id에서 결정론적으로 생성한다(재현 가능, 합성).
// 개인정보는 마스킹해 표시한다 — 실제 행정 도구의 개인정보 보호 톤을 반영.

import type { Household } from "./types";
import { weeklyDelta } from "./history";
import { priorityScore } from "./priority";

/** id의 숫자 부분을 시드로 사용 (예: "라-1894" → 1894) */
function seedOf(id: string): number {
  const m = id.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

export type Priority = "P1" | "P2" | "P3";

export interface CaseMeta {
  priority: Priority;
  priorityLabel: string;
  /** 우선순위 선정 사유 한 줄 (급상승/미접촉/고위험 등) */
  priorityReason: string;
  maskedPhone: string;
  maskedAddress: string;
  lastContactDays: number;
  managerNote: string;
}

const PRIORITY_LABEL: Record<Priority, string> = {
  P1: "긴급",
  P2: "주의",
  P3: "관찰",
};

export function priorityOf(score: number): Priority {
  if (score >= 65) return "P1";
  if (score >= 45) return "P2";
  return "P3";
}

/** 결정론적 운영 메타 생성 (모두 합성·마스킹) */
export function caseMeta(h: Household, score: number): CaseMeta {
  const s = seedOf(h.id);
  const last4 = String(s).padStart(4, "0").slice(-4);
  const block = (s % 90) + 10; // 10~99
  const lastContactDays = s % 47; // 0~46일 전

  // 복합 우선순위 — 점수 단독이 아니라 추세·미접촉을 함께 반영(TodayWork와 일관)
  const delta = weeklyDelta(h);
  let priority = priorityOf(priorityScore(h)); // 추세 반영 점수로 구간 판정
  // 장기 미접촉 가산: 주의(P2)가 30일+ 미접촉이면 한 단계 상향
  if (lastContactDays > 30 && priority === "P2") priority = "P1";

  // 선정 사유 — 가장 두드러진 동인 한 줄
  let priorityReason: string;
  if (delta >= 8) priorityReason = `최근 +${delta}점 급상승`;
  else if (lastContactDays > 30 && score >= 45)
    priorityReason = `${lastContactDays}일 장기 미접촉`;
  else if (priority === "P1") priorityReason = `고위험 ${score}점`;
  else if (priority === "P2") priorityReason = `주의 ${score}점`;
  else priorityReason = `관찰 ${score}점`;

  return {
    priority,
    priorityLabel: PRIORITY_LABEL[priority],
    priorityReason,
    maskedPhone: `010-****-${last4}`,
    maskedAddress: `${h.dong} ${block}-** (상세주소 보호)`,
    lastContactDays,
    managerNote:
      lastContactDays > 30
        ? "장기 미접촉 — 우선 확인 필요"
        : "최근 접촉 이력 있음",
  };
}

export const PRIORITY_STYLE: Record<
  Priority,
  { chip: string; dot: string }
> = {
  P1: { chip: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500" },
  P2: {
    chip: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
  P3: {
    chip: "bg-slate-50 text-slate-600 border-slate-200",
    dot: "bg-slate-400",
  },
};
