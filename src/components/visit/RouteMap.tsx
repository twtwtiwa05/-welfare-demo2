import { computeScore, riskBand, type Band } from "../../lib/scoring";
import type { Household } from "../../lib/types";
import SimBadge from "../SimBadge";
import { MapPin } from "lucide-react";

// SVG 색 (Tailwind 클래스가 svg fill에 안 먹어 hex 직접 사용)
const DOT: Record<Band, string> = {
  high: "#ef4444",
  mid: "#f59e0b",
  low: "#94a3b8",
};

const sc = (h: Household) => computeScore(h.signals, h.profileGroup).score;
const PAD = 8;
const SPAN = 84;
const mx = (x: number) => PAD + x * SPAN;
const my = (y: number) => PAD + y * SPAN;

// 우측 상단 — 방문 동선 지도. 합성 좌표를 개념 지도에 찍고, 선택된 묶음의 경로를 번호선으로.
export default function RouteMap({
  all,
  stops,
  onPick,
}: {
  all: Household[];
  stops: Household[];
  onPick: (id: string) => void;
}) {
  const stopIds = new Set(stops.map((s) => s.id));
  const points = stops.map((h) => `${mx(h.coords.x)},${my(h.coords.y)}`).join(" ");

  return (
    <div className="card overflow-hidden">
      <div className="card-head">
        <span className="card-title flex items-center gap-1.5">
          <MapPin size={15} className="text-brand-600" /> 방문 동선 지도
        </span>
        <span className="text-[11px] text-slate-400">개념 지도 · 가상 행정동</span>
      </div>

      <div className="bg-gradient-to-br from-slate-50 to-slate-100/60 p-4">
        <svg viewBox="0 0 100 100" className="h-auto w-full" style={{ maxHeight: "46vh" }}>
          {/* 장식 격자 */}
          <g stroke="#eef2f7" strokeWidth="0.4">
            {[20, 40, 60, 80].map((v) => (
              <line key={`v${v}`} x1={v} y1={4} x2={v} y2={96} />
            ))}
            {[20, 40, 60, 80].map((v) => (
              <line key={`h${v}`} x1={4} y1={v} x2={96} y2={v} />
            ))}
          </g>

          {/* 선택된 묶음의 경로선 (번호 순서) */}
          {stops.length > 1 && (
            <polyline
              points={points}
              fill="none"
              stroke="#2f6bbf"
              strokeWidth="1.1"
              strokeLinejoin="round"
              strokeLinecap="round"
              pathLength={1}
              className="route-line"
              opacity={0.85}
            />
          )}

          {/* 경로 밖 후보 점 (흐리게) */}
          {all.map((h) => {
            if (stopIds.has(h.id)) return null;
            const band = riskBand(sc(h));
            return (
              <circle
                key={h.id}
                cx={mx(h.coords.x)}
                cy={my(h.coords.y)}
                r={1.6}
                fill={DOT[band]}
                opacity={0.3}
                onClick={() => onPick(h.id)}
                style={{ cursor: "pointer" }}
              >
                <title>{`${h.id} · ${sc(h)}점`}</title>
              </circle>
            );
          })}

          {/* 경로 정류장 (번호) */}
          {stops.map((h, i) => {
            const band = riskBand(sc(h));
            return (
              <g
                key={h.id}
                onClick={() => onPick(h.id)}
                style={{ cursor: "pointer" }}
              >
                <circle
                  cx={mx(h.coords.x)}
                  cy={my(h.coords.y)}
                  r={3.3}
                  fill="#ffffff"
                  stroke={DOT[band]}
                  strokeWidth={1.3}
                />
                <text
                  x={mx(h.coords.x)}
                  y={my(h.coords.y)}
                  fontSize="3.6"
                  fontWeight="700"
                  fill="#1e293b"
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  {i + 1}
                </text>
                <title>{`${i + 1}. ${h.id} · ${sc(h)}점`}</title>
              </g>
            );
          })}
        </svg>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
          <span>번호 = 방문 순서 · 색 = 위험 구간</span>
          <Legend color={DOT.high} label="고위험" />
          <Legend color={DOT.mid} label="주의" />
          <Legend color={DOT.low} label="관찰" />
        </div>
      </div>

      <div className="flex items-start gap-1.5 border-t border-slate-100 bg-amber-50/40 px-4 py-2 text-[11px] leading-relaxed text-slate-500">
        <SimBadge label="합성 좌표" />
        <span>
          실서비스에선 법적 근거 하 재식별 후에만 지도 표시가 가능합니다. 이동시간
          절감 수치는 제시하지 않습니다 — 작동 방식만 시연합니다.
        </span>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
