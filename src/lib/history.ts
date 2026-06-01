// 시계열(history) 추세 헬퍼 — 모니터링 화면에서 공유.
import type { Household } from "./types";

/** 최근 한 주 점수 변화 (마지막 두 주 차이) */
export function weeklyDelta(h: Household): number {
  const n = h.history.length;
  if (n < 2) return 0;
  return h.history[n - 1].score - h.history[n - 2].score;
}

/** 8주 전체 추세 (첫 주 대비 마지막 주) */
export function totalTrend(h: Household): number {
  if (h.history.length < 2) return 0;
  return h.history[h.history.length - 1].score - h.history[0].score;
}
