// ═══════════════════════════════════════════════════════════════════════════
// 실증 실험 — recharts 네이티브 차트 모음 (summary.json/shap.json 재구성)
// 앱의 KRDS 톤(brand 정부블루·평평·테두리 위계)과 RiskTimeline의 recharts 패턴을 따름.
// ═══════════════════════════════════════════════════════════════════════════
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  Cell,
  ReferenceLine,
  LabelList,
} from "recharts";
import {
  EXPERIMENT,
  METHODS,
  CLASSES,
  LAMBDAS,
  precisionAtKData,
  ciForestData,
  ablationData,
  lambdaSweepData,
  classDeathRateData,
  shapTop,
  metricComparisonData,
  pct,
  dec,
  signed,
  type LamKey,
  type MethodKey,
} from "../../lib/experiment";

// 공통 recharts 스타일
const TOOLTIP_STYLE = {
  fontSize: 12,
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  boxShadow: "0 4px 16px rgba(15,23,42,0.10)",
  padding: "8px 10px",
} as const;
const AXIS_TICK = { fontSize: 11, fill: "#64748b" } as const;
const GRID = "#f1f5f9";

// 차트 카드 프레임 — 제목·부제·본문
export function ChartCard({
  title,
  sub,
  children,
  tag,
}: {
  title: string;
  sub?: string;
  children: React.ReactNode;
  tag?: React.ReactNode;
}) {
  return (
    <div className="card card-pad">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h4 className="text-h3 text-slate-800">{title}</h4>
          {sub && <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">{sub}</p>}
        </div>
        {tag}
      </div>
      {children}
    </div>
  );
}

// 범례 칩 (막대 색 → 라벨)
function LegendChips({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5">
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: it.color }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}

// ── 1) precision@K 그룹막대 ──────────────────────────────────────────────────
const PREC_METHODS: MethodKey[] = ["OR_tuned", "Tier1_full", "Tier1_DL", "Oracle_window"];
export function PrecisionAtKChart({ lam }: { lam: LamKey }) {
  const data = precisionAtKData(lam, PREC_METHODS);
  return (
    <>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 12, right: 8, left: -8, bottom: 0 }} barGap={2} barCategoryGap="24%">
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
          <XAxis dataKey="k" tick={AXIS_TICK} axisLine={{ stroke: "#e2e8f0" }} tickLine={false} />
          <YAxis
            tickFormatter={(v: number) => pct(v, 0)}
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <Tooltip
            formatter={(v: number, n: string) => [pct(v), n]}
            contentStyle={TOOLTIP_STYLE}
            cursor={{ fill: "rgba(37,110,244,0.05)" }}
          />
          {PREC_METHODS.map((m) => (
            <Bar key={m} dataKey={m} name={METHODS[m].short} fill={METHODS[m].color} radius={[3, 3, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
      <LegendChips items={PREC_METHODS.map((m) => ({ color: METHODS[m].color, label: METHODS[m].short }))} />
    </>
  );
}

// ── 2) 부트스트랩 CI 포레스트 (OR 대비 향상량) — 커스텀 div 트랙 ──────────────
const CI_METHODS: MethodKey[] = ["Level_LR", "Tier1_full", "Tier1_DL", "Oracle_window"];
export function CIForestChart({
  lam,
  block,
}: {
  lam: LamKey;
  block: "ci_auprc" | "ci_prec10";
}) {
  const rows = ciForestData(lam, block, CI_METHODS);
  // 공통 도메인(0 포함)
  const lo = Math.min(0, ...rows.map((r) => r.lo));
  const hi = Math.max(0, ...rows.map((r) => r.hi));
  const span = hi - lo || 1;
  const x = (v: number) => ((v - lo) / span) * 100;
  const zero = x(0);

  return (
    <div className="space-y-3 pt-1">
      {rows.map((r) => {
        const width = Math.abs(x(r.hi) - x(r.lo));
        return (
          <div key={r.method} className="grid grid-cols-[92px_1fr_84px] items-center gap-2">
            <span className="truncate text-[11px] font-semibold text-slate-600" title={METHODS[r.method].ko}>
              {r.label}
            </span>
            <div className="relative h-6">
              {/* 0 기준선 */}
              <span
                className="absolute top-0 h-full w-px bg-slate-300"
                style={{ left: `${zero}%` }}
                aria-hidden
              />
              {/* CI 막대 */}
              <span
                className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full"
                style={{
                  left: `${Math.min(x(r.lo), x(r.hi))}%`,
                  width: `${width}%`,
                  background: r.significant ? "rgba(37,110,244,0.28)" : "rgba(100,116,139,0.22)",
                }}
              />
              {/* 점추정 */}
              <span
                className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white"
                style={{ left: `${x(r.point)}%`, background: r.color }}
                title={`${signed(r.point)} [${signed(r.lo)}, ${signed(r.hi)}]`}
              />
            </div>
            <span
              className={`text-right text-[11px] font-bold tabular-nums ${
                r.significant ? "text-brand-600" : "text-slate-400"
              }`}
            >
              {signed(r.point, block === "ci_prec10" ? 3 : 3)}
              {r.significant && <span className="ml-1 align-middle text-[9px] text-brand-500">★</span>}
            </span>
          </div>
        );
      })}
      <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] text-slate-400">
        <span>← 임계값(OR)보다 낮음</span>
        <span className="font-semibold text-slate-500">0 = 임계값과 동일</span>
        <span>임계값보다 높음 →</span>
      </div>
      <p className="text-[10px] text-slate-400">
        <span className="font-bold text-brand-600">★</span> = 95% 신뢰구간이 0을 넘음(통계적 유의). 가구
        단위 군집 부트스트랩 B=800.
      </p>
    </div>
  );
}

// ── 3) ablation — 시계열 기여의 출처 ─────────────────────────────────────────
export function AblationChart({ lam }: { lam: LamKey }) {
  const data = ablationData(lam);
  const gain = data[0].value - data[1].value; // full − levels
  return (
    <>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 20, right: 8, left: -8, bottom: 0 }} barCategoryGap="26%">
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "#64748b" }}
            interval={0}
            axisLine={{ stroke: "#e2e8f0" }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v: number) => dec(v, 2)}
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip
            formatter={(v: number) => [dec(v), "AUPRC"]}
            contentStyle={TOOLTIP_STYLE}
            cursor={{ fill: "rgba(37,110,244,0.05)" }}
          />
          <Bar dataKey="value" radius={[3, 3, 0, 0]}>
            {data.map((d) => (
              <Cell key={d.key} fill={d.color} />
            ))}
            <LabelList dataKey="value" position="top" formatter={(v: number) => dec(v, 2)} style={{ fontSize: 10, fill: "#475569", fontWeight: 700 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-2 rounded-lg border border-brand-200 bg-brand-50/60 px-3 py-2 text-[11px] leading-relaxed text-slate-600">
        <b className="text-brand-700">시계열 기여 = 레벨+시계열 − 레벨만 = {signed(gain)}</b> — 동일한
        부스팅이라도 시계열 파생특징을 넣어야 우위가 생긴다. 우위는 <b>‘변하는 중’</b>이라는 정보에서 온다.
      </div>
    </>
  );
}

// ── 4) λ 스윕 — 정직성의 핵심 (궤적구동일수록 우위 증가) ─────────────────────
export function LambdaSweepChart() {
  const data = lambdaSweepData();
  return (
    <>
      <ResponsiveContainer width="100%" height={230}>
        <LineChart data={data} margin={{ top: 12, right: 16, left: -8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
          <XAxis
            dataKey="lam"
            type="number"
            domain={[0.3, 0.8]}
            ticks={[0.3, 0.5, 0.8]}
            tick={AXIS_TICK}
            axisLine={{ stroke: "#e2e8f0" }}
            tickLine={false}
            label={{ value: "λ (위험과정 구성: 수준→궤적)", position: "insideBottom", offset: -2, fontSize: 10, fill: "#94a3b8" }}
          />
          <YAxis
            tickFormatter={(v: number) => signed(v, 2)}
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <Tooltip
            formatter={(v: number, n: string) => [signed(v), n]}
            labelFormatter={(l: number) => `λ = ${l}`}
            contentStyle={TOOLTIP_STYLE}
          />
          <ReferenceLine y={0} stroke="#cbd5e1" strokeDasharray="4 4" />
          <Line
            type="monotone"
            dataKey="temporal_gain"
            name="시계열 기여(AUPRC)"
            stroke="#256EF4"
            strokeWidth={2.5}
            dot={{ r: 4, fill: "#256EF4" }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="ml_gain"
            name="ML 향상 vs 임계값"
            stroke="#0B78CB"
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={{ r: 3, fill: "#0B78CB" }}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {LAMBDAS.map((l) => (
          <div key={l.key} className="rounded-lg border border-slate-200 bg-slate-50/60 px-2 py-1.5 text-center">
            <div className="text-[11px] font-bold text-slate-700">λ {l.lam}</div>
            <div className="text-[10px] text-slate-400">{l.regime}</div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
        시계열 기여가 λ에 따라 <b className="text-brand-600">단조 증가</b> — 세계가 궤적구동일 때만 우위가
        커진다. “무조건 이긴다”가 아니라 <b>“위험이 궤적구동일 때 우월하다”</b>는 조건부 명제의 증거.
      </p>
    </>
  );
}

// ── 5) 클래스별 사망률 — 레벨 트랩 ───────────────────────────────────────────
export function ClassDeathRateChart() {
  const data = classDeathRateData();
  const series = LAMBDAS.map((l, i) => ({
    key: `l${l.lam}`,
    label: `λ ${l.lam}`,
    color: ["#B1CEFB", "#4C87F6", "#0B50D0"][i],
  }));
  return (
    <>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 12, right: 8, left: -8, bottom: 0 }} barGap={1} barCategoryGap="22%">
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "#64748b" }}
            interval={0}
            axisLine={{ stroke: "#e2e8f0" }}
            tickLine={false}
          />
          <YAxis tickFormatter={(v: number) => pct(v, 0)} tick={AXIS_TICK} axisLine={false} tickLine={false} width={40} />
          <Tooltip formatter={(v: number, n: string) => [pct(v), n]} contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(37,110,244,0.05)" }} />
          {series.map((s) => (
            <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[3, 3, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
      <LegendChips items={series.map((s) => ({ color: s.color, label: s.label }))} />
      <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
        <b style={{ color: CLASSES.chronic_high.color }}>만성 고위험형</b>의 사망률은 λ↑에서 급감(레벨
        트랩: 수준만 높고 안 변함 → 임계값이 오탐). <b style={{ color: CLASSES.rapid_decline.color }}>급속
        악화형</b>이 실제 고위험 — 궤적을 봐야 갈린다.
      </p>
    </>
  );
}

// ── 6) SHAP 특징중요도 (한국어·시계열/수준 색분리) ───────────────────────────
export function ShapChart() {
  const data = shapTop(12).slice().reverse(); // 가로막대: 큰 값이 위로
  return (
    <>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
          <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v: number) => v.toFixed(2)} />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fontSize: 10, fill: "#475569" }}
            width={116}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(v: number) => [v.toFixed(3), "평균 |SHAP|"]}
            contentStyle={TOOLTIP_STYLE}
            cursor={{ fill: "rgba(37,110,244,0.05)" }}
          />
          <Bar dataKey="importance" radius={[0, 3, 3, 0]}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.isTemporal ? "#256EF4" : "#94a3b8"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <LegendChips
        items={[
          { color: "#256EF4", label: "시계열 특징(변화·궤적)" },
          { color: "#94a3b8", label: "수준 특징(현재값)" },
        ]}
      />
      <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
        상위 기여: <b>진료단절 최근변화·상승기울기</b>, 연령, <b>야간 기저부하</b>, 사회활동 변화 — 레벨이
        아니라 <b className="text-brand-600">‘변하는 중’</b>이 위험을 가른다.
      </p>
    </>
  );
}

// ── 7) 지표 비교 요약 (OR·ML·DL·오라클) ──────────────────────────────────────
const CMP: { key: MethodKey; color: string }[] = [
  { key: "OR_tuned", color: METHODS.OR_tuned.color },
  { key: "Tier1_full", color: METHODS.Tier1_full.color },
  { key: "Tier1_DL", color: METHODS.Tier1_DL.color },
  { key: "Oracle_window", color: METHODS.Oracle_window.color },
];
export function MetricComparisonChart({ lam }: { lam: LamKey }) {
  const data = metricComparisonData(lam);
  return (
    <>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 12, right: 8, left: -8, bottom: 0 }} barGap={2} barCategoryGap="26%">
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
          <XAxis dataKey="metric" tick={{ fontSize: 11, fill: "#64748b" }} interval={0} axisLine={{ stroke: "#e2e8f0" }} tickLine={false} />
          <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={40} tickFormatter={(v: number) => v.toFixed(1)} />
          <Tooltip formatter={(v: number, n: string) => [dec(v), n]} contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(37,110,244,0.05)" }} />
          {CMP.map((c) => (
            <Bar key={c.key} dataKey={c.key} name={METHODS[c.key].short} fill={c.color} radius={[3, 3, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
      <LegendChips items={CMP.map((c) => ({ color: c.color, label: METHODS[c.key].short }))} />
    </>
  );
}

// ── 8) 결과표 (표 1) ─────────────────────────────────────────────────────────
const TABLE_METHODS: MethodKey[] = ["OR_tuned", "Level_LR", "Tier1_full", "Tier1_DL", "Oracle_window"];
export function MethodTable({ lam }: { lam: LamKey }) {
  const rows = ciForestData(lam, "ci_auprc", TABLE_METHODS);
  const byKey = Object.fromEntries(rows.map((r) => [r.method, r]));
  const m = (k: MethodKey) => METHODS[k];
  const metrics = (k: MethodKey) => EXPERIMENT[lam].metrics[k];
  return (
    <div className="overflow-x-auto scroll-slim">
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-400">
            <th className="py-2 pr-3 text-left font-semibold">모형</th>
            <th className="px-2 py-2 text-right font-semibold">AUROC</th>
            <th className="px-2 py-2 text-right font-semibold">AUPRC</th>
            <th className="px-2 py-2 text-right font-semibold">정밀도@10%</th>
            <th className="py-2 pl-2 text-right font-semibold">vs 임계값 (AUPRC, 95% CI)</th>
          </tr>
        </thead>
        <tbody>
          {TABLE_METHODS.map((k) => {
            const met = metrics(k);
            const ci = byKey[k];
            const hero = k === "Tier1_full";
            const base = k === "OR_tuned";
            return (
              <tr
                key={k}
                className={`border-b border-slate-100 ${hero ? "bg-brand-50/50" : ""}`}
              >
                <td className="py-2 pr-3">
                  <span className={`font-semibold ${hero ? "text-brand-700" : "text-slate-700"}`}>
                    {m(k).ko}
                  </span>
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-slate-600">{dec(met.auroc)}</td>
                <td className={`px-2 py-2 text-right tabular-nums ${hero ? "font-bold text-brand-700" : "text-slate-600"}`}>
                  {dec(met.auprc)}
                </td>
                <td className={`px-2 py-2 text-right tabular-nums ${hero ? "font-bold text-brand-700" : "text-slate-600"}`}>
                  {dec(met["prec@10"])}
                </td>
                <td className="py-2 pl-2 text-right tabular-nums text-[12px]">
                  {base ? (
                    <span className="text-slate-400">기준</span>
                  ) : (
                    <span className={ci.significant ? "font-semibold text-brand-600" : "text-slate-500"}>
                      {signed(ci.point)} [{signed(ci.lo)}, {signed(ci.hi)}]
                      {ci.significant && <span className="ml-1 text-[9px] text-brand-500">★</span>}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
