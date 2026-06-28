import { useState } from "react";
import type { RankedHousehold } from "../../lib/priority";
import { generateReason } from "../../lib/reason";
import { caseLabel } from "../../lib/caseLabels";
import RiskBadge from "../RiskBadge";
import SimBadge from "../SimBadge";
import { TrendingUp, ArrowDown, ChevronDown, ShieldAlert, History } from "lucide-react";

// After — 같은 가구에 '행동 가능한' 정보를 더한 카드.
// 근거(rationale) + 출처 칩(basisSignals, 환각 방어) + 추세 + 우선순위 번호 + 권고 + 반대근거.
// ⚠️ 순서·점수는 투명 공식이 만든다. 근거 서술(LLM 역할)은 '왜 이런지'를 서술만 한다(판정·점수 생성 안 함).
export default function AfterCard({
  ranked,
  onGotoCase,
}: {
  ranked: RankedHousehold;
  onGotoCase?: (id: string) => void;
}) {
  const { household: h, rank, score, delta } = ranked;
  const reason = generateReason(h);
  const cl = caseLabel(h.caseType);
  const [showCounter, setShowCounter] = useState(false);
  const motif = h.repeatedFlags >= 8;

  return (
    <div className="px-4 py-3.5 transition-colors hover:bg-brand-50/30">
      {/* 헤더 행: 순위 · ID · 위험 · 유형 · 추세 */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-xs font-bold tabular-nums text-white">
          {rank}
        </span>
        <button
          onClick={() => onGotoCase?.(h.id)}
          className="font-mono text-xs text-slate-600 transition-colors hover:text-brand-700 hover:underline"
        >
          {h.id}
        </button>
        <RiskBadge score={score} size="sm" />
        {cl && (
          <span className="chip bg-slate-100 text-[11px] text-slate-600">{cl.tag}</span>
        )}
        {motif && (
          <span className="chip border border-brand-200 bg-brand-50 text-[11px] text-brand-700">
            <History size={11} /> 반복 통보 {h.repeatedFlags}회
          </span>
        )}
        {delta > 0 ? (
          <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-red-600">
            <TrendingUp size={13} /> 이번 주 +{delta}점
          </span>
        ) : delta < 0 ? (
          <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
            <ArrowDown size={13} /> {delta}점
          </span>
        ) : null}
      </div>

      {/* 근거 서술 */}
      <p className="mt-2 text-sm leading-relaxed text-slate-700">{reason.rationale}</p>

      {/* 근거 출처 칩 (환각 방어 — 주어진 신호에만 기반) */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <SimBadge label="근거 서술" title="실서비스에선 LLM이 생성(역할 한정). 점수·순서는 만들지 않고 서술만." />
        {reason.basisSignals.map((b) => (
          <span key={b} className="chip bg-slate-100 text-[11px] font-medium text-slate-500">
            {b}
          </span>
        ))}
      </div>

      {/* 권고 */}
      <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-brand-50/60 px-2.5 py-1.5 text-xs">
        <span className="shrink-0 font-bold text-brand-700">권고</span>
        <span className="text-slate-600">{reason.recommendations[0]?.action}</span>
      </div>

      {/* 반대 근거·불확실성 (자동화 편향 방어) — 접이식 */}
      {reason.counterEvidence && (
        <div className="mt-1.5">
          <button
            onClick={() => setShowCounter((v) => !v)}
            aria-expanded={showCounter}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 transition-colors hover:text-slate-600"
          >
            <ShieldAlert size={12} /> 반대 근거·불확실성
            <ChevronDown
              size={12}
              className={`transition-transform duration-200 ${showCounter ? "rotate-180" : ""}`}
            />
          </button>
          {showCounter && (
            <p className="mt-1 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px] leading-relaxed text-slate-500">
              {reason.counterEvidence}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
