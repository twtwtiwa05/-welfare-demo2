// 모바일 현장앱 공용 데이터 헬퍼.
// ⚠️ 발표용 설명 카피 없음 — 담당자가 바로 쓰는 사실 기반 요약만.

import { HOUSEHOLDS } from "./data";
import { combinationMethod } from "./priority";
import type { Household } from "./types";

const RESIDUAL = HOUSEHOLDS.filter((h) => !h.haengbokFlagged);

/** 담당 권역 기준 잔여 후보. region "전체"면 전부. */
export function regionResidual(region: string, myOnly: boolean): Household[] {
  if (!myOnly || region === "전체") return RESIDUAL;
  return RESIDUAL.filter((h) => h.dong === region);
}

/** 발굴된(조합) 잔여 후보 — 모바일 케이스/방문의 모집단 */
export function regionCandidates(region: string, myOnly: boolean): Household[] {
  return regionResidual(region, myOnly).filter((h) => combinationMethod(h));
}

/** "왜 이 사람인가"를 사실로만 한 줄 요약 (브리핑) */
export function brief(h: Household): string {
  const s = h.signals;
  const parts: string[] = [];
  if (s.daysSinceMedical >= 180) parts.push(`진료 ${s.daysSinceMedical}일 단절`);
  if (s.powerDropPct >= 50) parts.push(`전력 ${s.powerDropPct}%↓`);
  if (s.telecomOverdueMonths >= 2)
    parts.push(`통신 ${s.telecomOverdueMonths}개월 연체`);
  if (s.welfareCenterVisits6mo === 0) parts.push("복지관 이용 없음");
  if (s.mailUncollectedWeeks >= 3) parts.push(`우편 ${s.mailUncollectedWeeks}주 미수령`);
  if (h.repeatedFlags >= 3) parts.push(`반복통보 ${h.repeatedFlags}회`);
  return parts.slice(0, 3).join(" · ");
}
