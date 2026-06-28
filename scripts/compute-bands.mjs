// 위험 구간(밴드) 분위수 컷 산출 — src/lib/scoring.ts의 BAND_CUTOFFS 근거.
//
// ⚠️ 기존 65/45는 임의값이었다. 본 스크립트는 합성 *잔여* 모집단의 집단 가중점수 분포에서
//    상위 분위수를 구해 밴드를 가른다(G5: 데이터 근거). 복지부 발굴 시스템의 "상위 약 4%"식
//    분위수 선별이 제도적 선례다(데모 모집단은 큐레이션돼 4%가 아닌 데모용 분위수 사용).
//
// 실행: node scripts/compute-bands.mjs  → 권장 컷을 출력. 데이터 재생성 시 재실행해 scoring.ts 갱신.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, "..", "src", "data", "households.json");
const households = JSON.parse(readFileSync(DATA, "utf-8"));

const PROFILES = {
  elderly: { power: 28, medical: 30, telecom: 12, isolation: 18, mail: 12 },
  middleaged: { power: 30, telecom: 24, isolation: 22, medical: 14, mail: 10 },
};
const KEYS = ["power", "medical", "mail", "telecom", "isolation"];
const clamp01 = (v) => Math.max(0, Math.min(1, v));
function deficits(s) {
  return {
    power: clamp01(s.powerDropPct / 100),
    medical: clamp01(s.daysSinceMedical / 365),
    mail: clamp01(s.mailUncollectedWeeks / 4),
    telecom: clamp01(s.telecomOverdueMonths / 3),
    isolation: s.welfareCenterVisits6mo === 0 ? 1 : 0,
  };
}
function score(s, p) {
  const w = PROFILES[p];
  const d = deficits(s);
  const sumW = KEYS.reduce((a, k) => a + w[k], 0);
  const norm = 100 / sumW;
  return Math.round(KEYS.reduce((a, k) => a + d[k] * w[k] * norm, 0));
}

// 백분위(상위 p%) 컷 = (100-p) 분위수
function quantile(sorted, q) {
  const idx = (sorted.length - 1) * q;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

const residual = households.filter((h) => !h.haengbokFlagged);
const scores = residual.map((h) => score(h.signals, h.profileGroup)).sort((a, b) => a - b);

const P = (topPct) => Math.round(quantile(scores, 1 - topPct / 100));

console.log(`잔여 모집단 n=${scores.length}, min=${scores[0]}, max=${scores[scores.length - 1]}`);
console.log(`median=${quantile(scores, 0.5).toFixed(1)}`);
console.log("");
console.log("상위 분위수 컷:");
for (const top of [10, 15, 20, 25, 30, 40, 45, 55, 60]) {
  console.log(`  상위 ${top}% → ${P(top)}점`);
}
console.log("");
console.log(`권장: 고위험=상위25%(${P(25)}), 주의=상위55%(${P(55)})`);
const high = P(25);
const mid = P(55);
const band = (sc) => (sc >= high ? "high" : sc >= mid ? "mid" : "low");
const dist = { high: 0, mid: 0, low: 0 };
scores.forEach((s) => dist[band(s)]++);
console.log(`이 컷의 분포: 고위험 ${dist.high} / 주의 ${dist.mid} / 관찰 ${dist.low}`);
