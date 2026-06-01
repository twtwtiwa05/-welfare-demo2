// 방문 동선 — ③ 활용도의 종착점 (plan 9.4)
//
// "왜 이 사람인가"(우선순위)에서 멈추지 않고 "오늘 누구를, 어떤 순서·경로로"까지.
//
// ⚠️ 새 알고리즘이 아니다. 물류·배차에서 검증된 경로최적화(최근접 이웃 + 2-opt)를
//    복지 방문 맥락에 적용할 뿐이다. 외부 라이브러리·API 없이 순수 함수로 구현한다.
// ⚠️ 좌표는 합성이며, 이동시간 '절감 수치'는 제시하지 않는다(작동 방식만 시연).
//    실서비스에선 법적 근거 하의 재식별이 완료된 뒤에만 지도 표시가 가능하다.

import type { Household } from "./types";

export interface VisitGroup {
  /** 대표 행정동 (씨앗 가구의 동) */
  dong: string;
  /** 방문 순서대로 정렬된 가구 */
  ordered: Household[];
  /** 총 이동 거리 (정규화 좌표 기준 — 상대 비교용, 절대 단위 없음) */
  distance: number;
}

/** 두 가구 좌표 사이의 유클리드 거리 (합성 좌표 0~1) */
export function dist(a: Household, b: Household): number {
  return Math.hypot(a.coords.x - b.coords.x, a.coords.y - b.coords.y);
}

/** 경로 총 이동 거리 */
export function routeDistance(seq: Household[]): number {
  let d = 0;
  for (let i = 0; i < seq.length - 1; i++) d += dist(seq[i], seq[i + 1]);
  return d;
}

/**
 * 근접 권역 묶음 — 우선순위 상위 후보를 '같은 동 + 좌표 거리 임계 내'로 군집화.
 * 그리디: 미배정 최고 우선순위 가구를 씨앗으로, 임계 내 가까운 가구를 maxGroupSize까지 채운다.
 * @param candidates 우선순위 순으로 정렬된 후보(앞일수록 우선)
 */
export function groupByProximity(
  candidates: Household[],
  opts: { maxGroupSize?: number; radius?: number } = {}
): VisitGroup[] {
  const maxGroupSize = opts.maxGroupSize ?? 4;
  const radius = opts.radius ?? 0.18;
  const remaining = [...candidates];
  const groups: VisitGroup[] = [];

  while (remaining.length) {
    const seed = remaining.shift()!;
    const members = [seed];
    // 씨앗과 같은 동 + 거리 임계 내에서 가까운 순으로 채운다
    const nearby = remaining
      .map((h) => ({ h, d: dist(seed, h) }))
      .filter((x) => x.h.dong === seed.dong && x.d <= radius)
      .sort((a, b) => a.d - b.d);
    for (const n of nearby) {
      if (members.length >= maxGroupSize) break;
      members.push(n.h);
    }
    // 묶인 가구를 remaining에서 제거
    const picked = new Set(members.map((m) => m.id));
    for (let i = remaining.length - 1; i >= 0; i--) {
      if (picked.has(remaining[i].id)) remaining.splice(i, 1);
    }

    const ordered = orderRoute(members);
    groups.push({ dong: seed.dong, ordered, distance: routeDistance(ordered) });
  }
  return groups;
}

/**
 * 묶음 내 방문 순서 — 최근접 이웃 휴리스틱 + 2-opt 개선.
 * 시작점은 입력 첫 가구(=최우선). 데모 규모(3~6건)에 충분.
 */
export function orderRoute(group: Household[]): Household[] {
  if (group.length <= 2) return [...group];

  // 1) 최근접 이웃: 시작점에서 가장 가까운 미방문 가구를 차례로 잇는다
  const start = group[0];
  const rest = group.slice(1);
  const path = [start];
  while (rest.length) {
    const last = path[path.length - 1];
    let bestIdx = 0;
    let bestDist = Infinity;
    rest.forEach((h, i) => {
      const d = dist(last, h);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    });
    path.push(rest.splice(bestIdx, 1)[0]);
  }

  // 2) 2-opt 개선 (시작점 고정, 교차 구간을 뒤집어 총거리 단축)
  return twoOpt(path);
}

function twoOpt(path: Household[]): Household[] {
  let best = path;
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 1; i < best.length - 1; i++) {
      for (let k = i + 1; k < best.length; k++) {
        const candidate = best
          .slice(0, i)
          .concat(best.slice(i, k + 1).reverse(), best.slice(k + 1));
        if (routeDistance(candidate) + 1e-9 < routeDistance(best)) {
          best = candidate;
          improved = true;
        }
      }
    }
  }
  return best;
}
