// 행복e음 중복제거 — 2단계.
//
// 본 제안은 '보완 레이어'다(기획서 1.2·2.2). 행복e음이 이미 포착한 가구에서는 손을 떼고,
// '잔여' 후보에만 우리 분석을 적용한다.
//
// ⚠️ haengbokFlagged는 시뮬레이션 플래그다(실서비스에선 행복e음 연동으로 받지만,
//    데모에서는 우리가 임의 설정). 화면에 SimBadge로 명시한다.

import type { Household } from "./types";

export interface DedupResult {
  total: number;
  alreadyFound: Household[];
  residual: Household[];
}

export function splitByHaengbok(households: Household[]): DedupResult {
  const alreadyFound = households.filter((h) => h.haengbokFlagged);
  const residual = households.filter((h) => !h.haengbokFlagged);
  return { total: households.length, alreadyFound, residual };
}
