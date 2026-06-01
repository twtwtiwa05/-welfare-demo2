// 합성 가구 데이터 생성기 — 시드 고정, 재현 가능.
//
// ⚠️ 정직성 원칙(plan 0절·G): 여기서 만드는 것은 "정답(groundTruthRisk)을 우리가 설계한"
//    합성 데이터다. 따라서 이 데이터로 '발굴 성능'을 증명할 수 없다. 데모가 증명하는 것은
//    분석 파이프라인·근거 리포트·대시보드 UX의 작동이다. 화면은 이 한계를 숨기지 않는다.
//
// 실행: npm run gen:data   (node scripts/generate-data.mjs)
// 출력: src/data/households.json

import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "src", "data", "households.json");

// ── 시드 고정 PRNG (mulberry32) ──────────────────────────────────
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260531); // 고정 시드
const ri = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

// ── 점수 공식 (src/lib/scoring.ts·profiles.ts와 동일해야 함) ──────
// 집단별 가중치(합 100). ②(집단특화)의 유일한 증명 수단.
const PROFILES = {
  elderly: { power: 25, medical: 30, mail: 25, telecom: 10, isolation: 10 },
  middleaged: { power: 30, medical: 15, mail: 15, telecom: 20, isolation: 20 },
};
function normalize(s) {
  return {
    power: Math.min(s.powerDropPct / 100, 1),
    medical: Math.min(s.daysSinceMedical / 365, 1),
    mail: Math.min(s.mailUncollectedWeeks / 4, 1),
    telecom: Math.min(s.telecomOverdueMonths / 3, 1),
    isolation: s.welfareCenterVisits6mo === 0 ? 1 : 0,
  };
}
function computeScore(signals, profileKey) {
  const w = PROFILES[profileKey];
  const n = normalize(signals);
  const sum =
    n.power * w.power +
    n.medical * w.medical +
    n.mail * w.mail +
    n.telecom * w.telecom +
    n.isolation * w.isolation;
  return Math.round(sum);
}

const DONGS = ["가", "나", "다", "라", "마", "바"];
const SEX = ["F", "M"];

// ── ★ 합성 좌표(0~1) — 방문 동선용 ─────────────────────────────────
// 6개 행정동을 3열×2행 개념 격자에 배치하고, 각 동 중심 주변에 가구를 산포한다.
// ⚠️ 실제 지리 아님. 실서비스에선 법적 근거 하 재식별 후에만 좌표 표시 가능.
const DONG_CENTER = {
  가: { x: 0.17, y: 0.27 },
  나: { x: 0.5, y: 0.27 },
  다: { x: 0.83, y: 0.27 },
  라: { x: 0.17, y: 0.73 },
  마: { x: 0.5, y: 0.73 },
  바: { x: 0.83, y: 0.73 },
};
const clamp01 = (v) => +Math.max(0.04, Math.min(0.96, v)).toFixed(3);
const jitter = (spread) => (rand() * 2 - 1) * spread;
function coordsFor(dongLetter) {
  const c = DONG_CENTER[dongLetter] ?? { x: 0.5, y: 0.5 };
  return { x: clamp01(c.x + jitter(0.1)), y: clamp01(c.y + jitter(0.12)) };
}
// 누적 통보 횟수 기본값 — 위험할수록 반복 통보가 잦았을 개연성
function defaultRepeatedFlags(groundTruthRisk) {
  if (groundTruthRisk === "high") return ri(1, 3);
  if (groundTruthRisk === "mid") return ri(0, 2);
  return 0;
}

// 8주 시계열 생성 — finalScore를 끝점으로, 추세(상승/하강/평탄) 부여
function makeHistory(finalScore, trend) {
  const slopes = { up: ri(4, 8), down: -ri(3, 6), flat: 0 };
  const slope = slopes[trend];
  const weeks = [];
  for (let i = 7; i >= 0; i--) {
    const noise = ri(-3, 3);
    let v = finalScore - slope * i + noise;
    v = Math.max(2, Math.min(99, Math.round(v)));
    weeks.push(v);
  }
  weeks[7] = finalScore; // 마지막 주 = 현재 점수로 정합
  return weeks.map((score, idx) => ({ week: `W${idx + 1}`, score }));
}

let serial = 100;
function makeId(dong) {
  serial += ri(7, 53);
  return `${dong}-${String(serial).padStart(4, "0")}`;
}

// 가구 한 건 생성
function makeHousehold(opts) {
  const {
    profileGroup,
    signals,
    groundTruthRisk,
    caseType = null,
    registeredAlone = true,
    haengbokFlagged = false,
    trend = pick(["up", "down", "flat", "flat"]),
    dong = pick(DONGS),
    coords,
    repeatedFlags,
    history,
  } = opts;
  const ageBand =
    profileGroup === "elderly" ? pick(["70s", "80s"]) : pick(["50s", "60s"]);
  const finalScore = computeScore(signals, profileGroup);
  return {
    id: makeId(dong),
    dong: `${dong}동`,
    ageBand,
    sex: pick(SEX),
    profileGroup,
    registeredAlone,
    haengbokFlagged,
    repeatedFlags: repeatedFlags ?? defaultRepeatedFlags(groundTruthRisk),
    coords: coords ?? coordsFor(dong),
    signals,
    groundTruthRisk,
    caseType,
    history: history ?? makeHistory(finalScore, trend),
  };
}

const households = [];

// ── 1) 행복e음 기포착 가구 (~25%) — 2단계에서 제거됨 ──────────────
for (let i = 0; i < 18; i++) {
  const profileGroup = rand() < 0.7 ? "elderly" : "middleaged";
  households.push(
    makeHousehold({
      profileGroup,
      haengbokFlagged: true,
      groundTruthRisk: pick(["high", "high", "mid"]),
      trend: pick(["up", "flat", "down"]),
      signals: {
        powerDropPct: ri(70, 95),
        daysSinceMedical: ri(300, 480),
        mailUncollectedWeeks: ri(3, 6),
        telecomOverdueMonths: ri(2, 4),
        welfareCenterVisits6mo: 0,
      },
    })
  );
}

// ── 2) 일반 저위험 (잔여) ────────────────────────────────────────
for (let i = 0; i < 16; i++) {
  households.push(
    makeHousehold({
      profileGroup: rand() < 0.6 ? "elderly" : "middleaged",
      groundTruthRisk: "low",
      trend: pick(["flat", "down", "flat"]),
      signals: {
        powerDropPct: ri(0, 28),
        daysSinceMedical: ri(0, 110),
        mailUncollectedWeeks: ri(0, 1),
        telecomOverdueMonths: ri(0, 1),
        welfareCenterVisits6mo: ri(1, 5),
      },
    })
  );
}

// ── 3) 일반 중위험 (잔여) ────────────────────────────────────────
for (let i = 0; i < 12; i++) {
  households.push(
    makeHousehold({
      profileGroup: rand() < 0.6 ? "elderly" : "middleaged",
      groundTruthRisk: "mid",
      trend: pick(["up", "flat", "up"]),
      signals: {
        powerDropPct: ri(35, 60),
        daysSinceMedical: ri(130, 300),
        mailUncollectedWeeks: ri(1, 3),
        telecomOverdueMonths: ri(1, 2),
        welfareCenterVisits6mo: ri(0, 2),
      },
    })
  );
}

// ── 4) 일반 고위험 (임계 명확 초과 — 임계값 방식도 발굴) ───────────
for (let i = 0; i < 7; i++) {
  households.push(
    makeHousehold({
      profileGroup: "elderly",
      groundTruthRisk: "high",
      trend: pick(["up", "up", "flat"]),
      signals: {
        powerDropPct: ri(82, 96),
        daysSinceMedical: ri(370, 500),
        mailUncollectedWeeks: ri(4, 6),
        telecomOverdueMonths: ri(3, 4),
        welfareCenterVisits6mo: 0,
      },
    })
  );
}

// ── 5) ★ 유형 B: 임계 미만의 위험 조합 (⑤단계 주인공) ─────────────
// 모든 신호가 각 임계(power80/medical365/mail4/telecom3) "직전"이라 OR 규칙엔
// 안 걸리지만, 가중합으로 보면 위험. 조합 방식이 추가로 건지는 핵심 케이스.
const typeBSignals = [
  { powerDropPct: 74, daysSinceMedical: 330, mailUncollectedWeeks: 3, telecomOverdueMonths: 2, welfareCenterVisits6mo: 0 },
  { powerDropPct: 68, daysSinceMedical: 350, mailUncollectedWeeks: 3, telecomOverdueMonths: 2, welfareCenterVisits6mo: 0 },
  { powerDropPct: 78, daysSinceMedical: 300, mailUncollectedWeeks: 3, telecomOverdueMonths: 2, welfareCenterVisits6mo: 0 },
  { powerDropPct: 72, daysSinceMedical: 340, mailUncollectedWeeks: 2, telecomOverdueMonths: 2, welfareCenterVisits6mo: 0 },
  { powerDropPct: 70, daysSinceMedical: 320, mailUncollectedWeeks: 3, telecomOverdueMonths: 2, welfareCenterVisits6mo: 0 },
  { powerDropPct: 76, daysSinceMedical: 355, mailUncollectedWeeks: 3, telecomOverdueMonths: 2, welfareCenterVisits6mo: 0 },
];
for (const signals of typeBSignals) {
  households.push(
    makeHousehold({
      profileGroup: "elderly",
      groundTruthRisk: pick(["high", "mid"]),
      caseType: "B",
      trend: pick(["up", "up", "flat"]),
      signals,
    })
  );
}

// ── 6) 유형 A: 등록-실거주 불일치 (등록상 동거지만 실제 단절 추정) ──
for (let i = 0; i < 4; i++) {
  households.push(
    makeHousehold({
      profileGroup: "elderly",
      groundTruthRisk: pick(["high", "mid"]),
      caseType: "A",
      registeredAlone: false, // ← 등록상 가족과 동거 → 1인가구 필터에 안 걸림
      trend: pick(["up", "flat"]),
      signals: {
        powerDropPct: ri(60, 85),
        daysSinceMedical: ri(280, 400),
        mailUncollectedWeeks: ri(2, 4),
        telecomOverdueMonths: ri(1, 3),
        welfareCenterVisits6mo: 0,
      },
    })
  );
}

// ── 7) ★ 유형 C: 분류 밖 중장년 1인가구 (② 집단특화 시연 핵심) ─────
// 통신연체·고립 신호가 높음. elderly(범용) 모형으로 보면 저평가되지만,
// middleaged 특화 모형(telecom·isolation 가중치↑)으로 보면 고위험으로 드러남.
const typeCSignals = [
  { powerDropPct: 42, daysSinceMedical: 90, mailUncollectedWeeks: 1, telecomOverdueMonths: 2, welfareCenterVisits6mo: 0 },
  { powerDropPct: 38, daysSinceMedical: 70, mailUncollectedWeeks: 2, telecomOverdueMonths: 2, welfareCenterVisits6mo: 0 },
  { powerDropPct: 50, daysSinceMedical: 110, mailUncollectedWeeks: 1, telecomOverdueMonths: 2, welfareCenterVisits6mo: 0 },
  { powerDropPct: 45, daysSinceMedical: 60, mailUncollectedWeeks: 2, telecomOverdueMonths: 2, welfareCenterVisits6mo: 0 },
  { powerDropPct: 40, daysSinceMedical: 95, mailUncollectedWeeks: 1, telecomOverdueMonths: 2, welfareCenterVisits6mo: 0 },
];
for (const signals of typeCSignals) {
  households.push(
    makeHousehold({
      profileGroup: "middleaged",
      groundTruthRisk: "mid",
      caseType: "C",
      trend: pick(["up", "flat", "up"]),
      signals,
    })
  );
}

// ── 8) 오탐 후보: low인데 단일 신호만 높음 (LLM이 '위험 보류'로 설명) ─
const falsePosSignals = [
  // 전력만 급감(장기 외출 가능성), 나머지 정상 → 임계값 방식은 발굴, 조합은 보류
  { powerDropPct: 88, daysSinceMedical: 25, mailUncollectedWeeks: 0, telecomOverdueMonths: 0, welfareCenterVisits6mo: 3 },
  { powerDropPct: 12, daysSinceMedical: 400, mailUncollectedWeeks: 0, telecomOverdueMonths: 0, welfareCenterVisits6mo: 4 },
];
for (const signals of falsePosSignals) {
  households.push(
    makeHousehold({
      profileGroup: "elderly",
      groundTruthRisk: "low",
      caseType: null,
      trend: "flat",
      signals,
    })
  );
}

// ── 9) ★ 근접 군집 + 수원 모녀 모티프 (라동) — 방문 동선 시연 핵심 ──
// 라동 일대에 고위험 가구를 좌표상 가깝게 배치해 '오늘의 동선' 묶음을 만든다.
// 그 중 한 건은 수원 모녀 사건 모티프: 반복 통보 8회 + 최근 급상승(+12)으로
// 우선순위 공식(점수 + 추세, 동점 시 repeatedFlags 우대)상 최상단에 온다.
households.push(
  makeHousehold({
    profileGroup: "elderly",
    dong: "라",
    groundTruthRisk: "high",
    caseType: null,
    haengbokFlagged: false,
    repeatedFlags: 8, // ← 수원 모녀 모티프: 8차례 반복 통보되고도 행동으로 이어지지 못함
    coords: { x: 0.14, y: 0.8 },
    signals: {
      powerDropPct: 92,
      daysSinceMedical: 470,
      mailUncollectedWeeks: 5,
      telecomOverdueMonths: 4,
      welfareCenterVisits6mo: 0,
    },
    // 최근 1주 +12점 급상승 (반복·악화가 우선순위로 드러나도록)
    history: [70, 73, 78, 81, 84, 86, 86, 98].map((score, i) => ({
      week: `W${i + 1}`,
      score,
    })),
  })
);
// 같은 라동 인근 고위험 3가구 (좌표 근접 → 한 '방문 묶음'으로)
const clusterMates = [
  { coords: { x: 0.21, y: 0.74 }, repeatedFlags: 3, caseType: "B", trend: "up",
    signals: { powerDropPct: 78, daysSinceMedical: 360, mailUncollectedWeeks: 3, telecomOverdueMonths: 2, welfareCenterVisits6mo: 0 } },
  { coords: { x: 0.12, y: 0.84 }, repeatedFlags: 2, caseType: "B", trend: "up",
    signals: { powerDropPct: 72, daysSinceMedical: 350, mailUncollectedWeeks: 3, telecomOverdueMonths: 2, welfareCenterVisits6mo: 0 } },
  { coords: { x: 0.24, y: 0.82 }, repeatedFlags: 2, caseType: null, trend: "flat",
    signals: { powerDropPct: 86, daysSinceMedical: 380, mailUncollectedWeeks: 4, telecomOverdueMonths: 3, welfareCenterVisits6mo: 0 } },
];
for (const m of clusterMates) {
  households.push(
    makeHousehold({
      profileGroup: "elderly",
      dong: "라",
      groundTruthRisk: "high",
      caseType: m.caseType,
      coords: m.coords,
      repeatedFlags: m.repeatedFlags,
      trend: m.trend,
      signals: m.signals,
    })
  );
}

// ── 출력 ─────────────────────────────────────────────────────────
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(households, null, 2), "utf-8");

// 생성 요약 (검산용)
const residual = households.filter((h) => !h.haengbokFlagged);
const byType = (t) => households.filter((h) => h.caseType === t).length;
console.log(`총 ${households.length}가구 생성 → ${OUT}`);
console.log(
  `  기포착(haengbokFlagged): ${households.length - residual.length} / 잔여: ${residual.length}`
);
console.log(
  `  유형 A: ${byType("A")} / 유형 B: ${byType("B")} / 유형 C: ${byType("C")}`
);
const dist = { low: 0, mid: 0, high: 0 };
households.forEach((h) => dist[h.groundTruthRisk]++);
console.log(`  groundTruth 분포: low ${dist.low} / mid ${dist.mid} / high ${dist.high}`);

// ★ 신규 필드 검산 (coords·repeatedFlags·수원모녀 모티프·근접군집)
const withCoords = households.filter(
  (h) => h.coords && h.coords.x >= 0 && h.coords.x <= 1
).length;
const motif = households.find((h) => h.repeatedFlags >= 8);
const raResidual = residual.filter((h) => h.dong === "라동").length;
const weeklyDelta = (h) =>
  h.history.length >= 2
    ? h.history[h.history.length - 1].score - h.history[h.history.length - 2].score
    : 0;
console.log(`  좌표 보유: ${withCoords}/${households.length}`);
console.log(
  `  수원모녀 모티프: ${motif ? `${motif.id} (통보 ${motif.repeatedFlags}회, 점수 ${computeScore(motif.signals, motif.profileGroup)}, 최근 +${weeklyDelta(motif)})` : "없음 ⚠️"}`
);
console.log(`  라동 잔여(근접군집 포함): ${raResidual}가구`);
