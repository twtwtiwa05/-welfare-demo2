// 합성 가구 데이터 생성기 — 시드 고정, 재현 가능.
//
// ⚠️ 정직성 원칙(가드레일 G): 여기서 만드는 것은 "정답(groundTruthRisk)을 우리가 설계한"
//    합성 데이터다. 따라서 이 데이터로 '발굴 성능'을 증명할 수 없다. 데모가 증명하는 것은
//    분석 파이프라인·근거 리포트·대시보드 UX·ML 보조선별의 작동이다. 화면은 이 한계를 숨기지 않는다.
//
// ★ v3: 신호별 8주 원시 궤적(signalHistory)을 생성한다 — 다변량 이상탐지(작업 B)의 입력.
//        점수 시계열(history)은 이 궤적으로부터 집단 가중모형으로 *파생*한다(정합).
//        일부 가구는 "결합 급락"(여러 신호가 동시에 막판 2주에 꺾임)을 갖도록 설계 →
//        각 신호는 단일 임계 미만이지만 ML이 결합 이상으로 잡아낸다.
//
// 실행: npm run gen:data   (node scripts/generate-data.mjs)
//   이후 npm run gen:ml (python scripts/run_ml.py)로 ML 보조신호(anomaly/cluster/changePoint) 추가.
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
// ⚠️ 가중치는 근거 강도로 제약된다(우편=약→최저). profiles.ts와 반드시 일치.
const PROFILES = {
  elderly: { power: 28, medical: 30, telecom: 12, isolation: 18, mail: 12 },
  middleaged: { power: 30, telecom: 24, isolation: 22, medical: 14, mail: 10 },
};
const SIGNAL_KEYS = ["power", "medical", "mail", "telecom", "isolation"];
const clamp01 = (v) => Math.max(0, Math.min(1, v));
function deficitsOf(s) {
  return {
    power: clamp01(s.powerDropPct / 100),
    medical: clamp01(s.daysSinceMedical / 365),
    mail: clamp01(s.mailUncollectedWeeks / 4),
    telecom: clamp01(s.telecomOverdueMonths / 3),
    isolation: s.welfareCenterVisits6mo === 0 ? 1 : 0,
  };
}
function computeScore(signals, profileKey) {
  const w = PROFILES[profileKey];
  const d = deficitsOf(signals);
  const sumW = SIGNAL_KEYS.reduce((a, k) => a + w[k], 0);
  const norm = 100 / sumW;
  const sum = SIGNAL_KEYS.reduce((a, k) => a + d[k] * w[k] * norm, 0);
  return Math.round(sum);
}

const DONGS = ["가", "나", "다", "라", "마", "바"];
const SEX = ["F", "M"];

// ── ★ 합성 좌표(0~1) — 방문 동선용 ─────────────────────────────────
const DONG_CENTER = {
  가: { x: 0.17, y: 0.27 },
  나: { x: 0.5, y: 0.27 },
  다: { x: 0.83, y: 0.27 },
  라: { x: 0.17, y: 0.73 },
  마: { x: 0.5, y: 0.73 },
  바: { x: 0.83, y: 0.73 },
};
const clampCoord = (v) => +Math.max(0.04, Math.min(0.96, v)).toFixed(3);
const jitter = (spread) => (rand() * 2 - 1) * spread;
function coordsFor(dongLetter) {
  const c = DONG_CENTER[dongLetter] ?? { x: 0.5, y: 0.5 };
  return { x: clampCoord(c.x + jitter(0.1)), y: clampCoord(c.y + jitter(0.12)) };
}
function defaultRepeatedFlags(groundTruthRisk) {
  if (groundTruthRisk === "high") return ri(1, 3);
  if (groundTruthRisk === "mid") return ri(0, 2);
  return 0;
}

// ── ★ 신호별 8주 궤적 생성 ─────────────────────────────────────────
// 각 신호의 '건강한 끝'과 '심각한 끝'을 정의하고, 최종값(W8=현재 signals)에서 역으로
// 8주 궤적을 만든다. rapid=true면 W1~W5 완만한 베이스라인 후 W6~W8 급격히 최종값으로(결합 급락).
const HEALTHY = { power: 5, medical: 20, mail: 0, telecom: 0, isolation: 4 };
const SEVERE = { power: 98, medical: 490, mail: 6, telecom: 4, isolation: 0 };
const RANGE = {
  power: [0, 100],
  medical: [0, 500],
  mail: [0, 6],
  telecom: [0, 4],
  isolation: [0, 5],
};
const FIELD = {
  power: "powerDropPct",
  medical: "daysSinceMedical",
  mail: "mailUncollectedWeeks",
  telecom: "telecomOverdueMonths",
  isolation: "welfareCenterVisits6mo",
};
const lerp = (a, b, t) => a + (b - a) * t;
function clampRound(key, v) {
  const [lo, hi] = RANGE[key];
  return Math.max(lo, Math.min(hi, Math.round(v)));
}

/** 한 신호의 8주 시리즈(끝=finalV). trend: up(악화)/down(개선)/flat, rapid: 결합 급락 */
function seriesForSignal(key, finalV, trend, rapid, noiseAmp) {
  const out = new Array(8);
  if (rapid) {
    // W1~W5: 건강한 쪽에 가까운 베이스라인에서 완만, W6~W8: 급격히 최종값으로 꺾임
    const baseline = lerp(finalV, HEALTHY[key], 0.72);
    for (let w = 0; w < 8; w++) {
      let v;
      if (w <= 4) v = baseline + jitter(noiseAmp * 0.6);
      else {
        const t = (w - 4) / 3; // W6,7,8
        v = lerp(baseline, finalV, t * t) + jitter(noiseAmp * 0.5); // ease-in 급락
      }
      out[w] = clampRound(key, v);
    }
  } else {
    let start;
    if (trend === "up") start = lerp(finalV, HEALTHY[key], 0.55);
    else if (trend === "down") start = lerp(finalV, SEVERE[key], 0.4);
    else start = finalV; // flat
    for (let w = 0; w < 8; w++) {
      const t = w / 7;
      out[w] = clampRound(key, lerp(start, finalV, t) + jitter(noiseAmp));
    }
  }
  out[7] = clampRound(key, finalV); // 마지막 주 = 현재 신호값
  return out;
}

const NOISE = {
  power: 4,
  medical: 12,
  mail: 0.4,
  telecom: 0.3,
  isolation: 0.4,
};

/** signalHistory(8주) + 그로부터 파생한 점수 history 생성 */
function buildHistories(signals, profileGroup, trend, rapid) {
  const series = {};
  for (const key of SIGNAL_KEYS) {
    series[key] = seriesForSignal(key, signals[FIELD[key]], trend, rapid, NOISE[key]);
  }
  const signalHistory = [];
  const history = [];
  for (let w = 0; w < 8; w++) {
    const wk = `W${w + 1}`;
    const snap = {
      week: wk,
      power: series.power[w],
      medical: series.medical[w],
      mail: series.mail[w],
      telecom: series.telecom[w],
      isolation: series.isolation[w],
    };
    signalHistory.push(snap);
    const sig = {
      powerDropPct: snap.power,
      daysSinceMedical: snap.medical,
      mailUncollectedWeeks: snap.mail,
      telecomOverdueMonths: snap.telecom,
      welfareCenterVisits6mo: snap.isolation,
    };
    history.push({ week: wk, score: computeScore(sig, profileGroup) });
  }
  return { signalHistory, history };
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
    rapid = false,
    dong = pick(DONGS),
    coords,
    repeatedFlags,
  } = opts;
  const ageBand =
    profileGroup === "elderly" ? pick(["70s", "80s"]) : pick(["50s", "60s"]);
  const { signalHistory, history } = buildHistories(
    signals,
    profileGroup,
    trend,
    rapid
  );
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
    signalHistory,
    groundTruthRisk,
    caseType,
    history,
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

// ── 5) ★ 유형 B: 임계 미만의 위험 조합 (조합 방식·결합 급락 주인공) ─────────────
// 모든 신호가 각 임계 "직전"이라 OR 규칙엔 안 걸리지만, 가중합·결합이상으로 보면 위험.
// 절반은 rapid(결합 급락) → ML 다변량 이상탐지가 "사람 눈으로 못 잡는 급락"으로 포착.
const typeBSignals = [
  { sig: { powerDropPct: 74, daysSinceMedical: 330, mailUncollectedWeeks: 3, telecomOverdueMonths: 2, welfareCenterVisits6mo: 0 }, rapid: true },
  { sig: { powerDropPct: 68, daysSinceMedical: 350, mailUncollectedWeeks: 3, telecomOverdueMonths: 2, welfareCenterVisits6mo: 0 }, rapid: true },
  { sig: { powerDropPct: 78, daysSinceMedical: 300, mailUncollectedWeeks: 3, telecomOverdueMonths: 2, welfareCenterVisits6mo: 0 }, rapid: false },
  { sig: { powerDropPct: 72, daysSinceMedical: 340, mailUncollectedWeeks: 2, telecomOverdueMonths: 2, welfareCenterVisits6mo: 0 }, rapid: true },
  { sig: { powerDropPct: 70, daysSinceMedical: 320, mailUncollectedWeeks: 3, telecomOverdueMonths: 2, welfareCenterVisits6mo: 0 }, rapid: false },
  { sig: { powerDropPct: 76, daysSinceMedical: 355, mailUncollectedWeeks: 3, telecomOverdueMonths: 2, welfareCenterVisits6mo: 0 }, rapid: true },
];
for (const { sig, rapid } of typeBSignals) {
  households.push(
    makeHousehold({
      profileGroup: "elderly",
      groundTruthRisk: pick(["high", "mid"]),
      caseType: "B",
      trend: "up",
      rapid,
      signals: sig,
    })
  );
}

// ── 6) 유형 A: 등록-실거주 불일치 ──────────────────────────────────
for (let i = 0; i < 4; i++) {
  households.push(
    makeHousehold({
      profileGroup: "elderly",
      groundTruthRisk: pick(["high", "mid"]),
      caseType: "A",
      registeredAlone: false,
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
// 통신연체·고립 신호 높음. elderly 모형 저평가 / middleaged 특화 모형 고위험.
// 일부 rapid → 경제·고립 결합 급락.
const typeCSignals = [
  { sig: { powerDropPct: 42, daysSinceMedical: 90, mailUncollectedWeeks: 1, telecomOverdueMonths: 2, welfareCenterVisits6mo: 0 }, rapid: true },
  { sig: { powerDropPct: 38, daysSinceMedical: 70, mailUncollectedWeeks: 2, telecomOverdueMonths: 2, welfareCenterVisits6mo: 0 }, rapid: false },
  { sig: { powerDropPct: 50, daysSinceMedical: 110, mailUncollectedWeeks: 1, telecomOverdueMonths: 2, welfareCenterVisits6mo: 0 }, rapid: true },
  { sig: { powerDropPct: 45, daysSinceMedical: 60, mailUncollectedWeeks: 2, telecomOverdueMonths: 2, welfareCenterVisits6mo: 0 }, rapid: false },
  { sig: { powerDropPct: 40, daysSinceMedical: 95, mailUncollectedWeeks: 1, telecomOverdueMonths: 2, welfareCenterVisits6mo: 0 }, rapid: false },
];
for (const { sig, rapid } of typeCSignals) {
  households.push(
    makeHousehold({
      profileGroup: "middleaged",
      groundTruthRisk: "mid",
      caseType: "C",
      trend: "up",
      rapid,
      signals: sig,
    })
  );
}

// ── 8) 오탐 후보: low인데 단일 신호만 높음 (LLM이 '위험 보류'로 설명) ─
const falsePosSignals = [
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

// ── 9) ★ 근접 군집 + 수원 모녀 모티프 (라동) — 방문 동선 + 급속악화 시연 핵심 ──
// 라동 일대 고위험 가구를 좌표상 가깝게 배치. 그 중 한 건은 수원 모녀 모티프:
// 반복 통보 8회 + rapid(결합 급락)으로 우선순위·급속악화 선별 최상단.
households.push(
  makeHousehold({
    profileGroup: "elderly",
    dong: "라",
    groundTruthRisk: "high",
    caseType: null,
    haengbokFlagged: false,
    repeatedFlags: 8, // ← 수원 모녀 모티프: 8차례 반복 통보되고도 행동으로 이어지지 못함
    coords: { x: 0.14, y: 0.8 },
    trend: "up",
    rapid: true, // 최근 급격한 다변량 악화
    signals: {
      powerDropPct: 92,
      daysSinceMedical: 470,
      mailUncollectedWeeks: 5,
      telecomOverdueMonths: 4,
      welfareCenterVisits6mo: 0,
    },
  })
);
// 같은 라동 인근 고위험 3가구 (좌표 근접 → 한 '방문 묶음'으로)
const clusterMates = [
  { coords: { x: 0.21, y: 0.74 }, repeatedFlags: 3, caseType: "B", rapid: true,
    signals: { powerDropPct: 78, daysSinceMedical: 360, mailUncollectedWeeks: 3, telecomOverdueMonths: 2, welfareCenterVisits6mo: 0 } },
  { coords: { x: 0.12, y: 0.84 }, repeatedFlags: 2, caseType: "B", rapid: true,
    signals: { powerDropPct: 72, daysSinceMedical: 350, mailUncollectedWeeks: 3, telecomOverdueMonths: 2, welfareCenterVisits6mo: 0 } },
  { coords: { x: 0.24, y: 0.82 }, repeatedFlags: 2, caseType: null, rapid: false,
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
      trend: "up",
      rapid: m.rapid,
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

// ★ 신규 필드 검산
const withSeries = households.filter((h) => h.signalHistory?.length === 8).length;
const motif = households.find((h) => h.repeatedFlags >= 8);
const weeklyDelta = (h) =>
  h.history.length >= 2
    ? h.history[h.history.length - 1].score - h.history[h.history.length - 2].score
    : 0;
console.log(`  signalHistory(8주) 보유: ${withSeries}/${households.length}`);
console.log(
  `  수원모녀 모티프: ${motif ? `${motif.id} (통보 ${motif.repeatedFlags}회, 점수 ${computeScore(motif.signals, motif.profileGroup)}, 최근 +${weeklyDelta(motif)})` : "없음 ⚠️"}`
);
console.log(
  `  다음 단계: python scripts/run_ml.py (anomaly/cluster/changePoint 추가)`
);
