// 기획서 1.4의 잔여 케이스 분류 라벨 — Step1/4/5·CaseDetail에서 공유.
import type { CaseType } from "./types";

export const CASE_LABELS: Record<"A" | "B" | "C", { tag: string; full: string }> =
  {
    A: { tag: "유형 A", full: "등록–실거주 불일치 (추정)" },
    B: { tag: "유형 B", full: "임계 미만의 위험 조합" },
    C: { tag: "유형 C", full: "분류 밖 중장년 1인가구" },
  };

export function caseLabel(t: CaseType) {
  return t ? CASE_LABELS[t] : null;
}
