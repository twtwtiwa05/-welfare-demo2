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
import { useTheme } from "../lib/theme";
import type { Household } from "../lib/types";

// 위험도 시계열 — 상승=빨강 / 하강=초록 추세 (plan 5.4).
// recharts는 클래스 기반 다크 전환이 안 되므로 useTheme().isDark로 색을 고른다.
export default function RiskTimeline({ household }: { household: Household }) {
  const { isDark } = useTheme();
  const trend = totalTrend(household);
  const color =
    trend > 0
      ? isDark
        ? "#F58A7B" // danger-300
        : "#dc2626"
      : trend < 0
        ? isDark
          ? "#4ade80"
          : "#059669"
        : isDark
          ? "#94a3b8"
          : "#64748b";
  const grid = isDark ? "#2E333D" : "#f1f5f9";
  const axis = isDark ? "#3E4552" : "#e2e8f0";
  const tick = isDark ? "#8B95A1" : "#94a3b8";

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
          <CartesianGrid strokeDasharray="3 3" stroke={grid} />
          <XAxis dataKey="week" tick={{ fontSize: 12, fill: tick }} axisLine={{ stroke: axis }} tickLine={false} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: tick }} axisLine={false} tickLine={false} />
          <Tooltip
            formatter={(v: number) => [`${v}점`, "위험 점수"]}
            contentStyle={{
              fontSize: 13,
              borderRadius: 10,
              backgroundColor: isDark ? "#1F232B" : "#ffffff",
              border: `1px solid ${isDark ? "#3E4552" : "#e2e8f0"}`,
              color: isDark ? "#E2E8F0" : undefined,
              boxShadow: "0 4px 16px rgba(15,23,42,0.10)",
            }}
            labelStyle={isDark ? { color: "#E2E8F0" } : undefined}
            cursor={{ stroke: isDark ? "#3E4552" : "#cbd5e1", strokeDasharray: "4 4" }}
          />
          <ReferenceLine
            y={BAND_CUTOFFS.high}
            stroke={isDark ? "#7f1d1d" : "#fca5a5"}
            strokeDasharray="4 4"
            label={{
              value: "고위험",
              fontSize: 11,
              fill: isDark ? "#F58A7B" : "#dc2626",
              position: "right",
            }}
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
