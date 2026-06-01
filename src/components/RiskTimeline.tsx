import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import { totalTrend } from "../lib/history";
import { BAND_CUTOFFS } from "../lib/scoring";
import type { Household } from "../lib/types";

// 위험도 시계열 — 상승=빨강 / 하강=초록 추세 (plan 5.4).
export default function RiskTimeline({ household }: { household: Household }) {
  const trend = totalTrend(household);
  const color = trend > 0 ? "#dc2626" : trend < 0 ? "#059669" : "#64748b";

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="card-title">위험도 시계열 (8주)</span>
        <span className="text-xs font-semibold" style={{ color }}>
          {trend > 0 ? `▲ +${trend}점 (상승 추세)` : trend < 0 ? `▼ ${trend}점 (하강 추세)` : "─ 변동 없음"}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={household.history} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="week" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={{ stroke: "#e2e8f0" }} tickLine={false} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
          <Tooltip
            formatter={(v: number) => [`${v}점`, "위험 점수"]}
            contentStyle={{
              fontSize: 13,
              borderRadius: 10,
              border: "1px solid #e2e8f0",
              boxShadow: "0 4px 16px rgba(15,23,42,0.10)",
            }}
            cursor={{ stroke: "#cbd5e1", strokeDasharray: "4 4" }}
          />
          <ReferenceLine
            y={BAND_CUTOFFS.high}
            stroke="#fca5a5"
            strokeDasharray="4 4"
            label={{ value: "고위험", fontSize: 11, fill: "#dc2626", position: "right" }}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke={color}
            strokeWidth={2.5}
            dot={{ r: 3, fill: color }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
