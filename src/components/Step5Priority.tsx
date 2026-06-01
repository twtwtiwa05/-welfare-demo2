import { HOUSEHOLDS } from "../lib/data";
import { compareMethods, COMBINATION_CUTOFF } from "../lib/priority";
import { computeScore } from "../lib/scoring";
import { caseLabel } from "../lib/caseLabels";
import type { Household } from "../lib/types";
import SimBadge from "./SimBadge";
import { AlertCircle, ArrowRight } from "lucide-react";

const RESIDUAL = HOUSEHOLDS.filter((h) => !h.haengbokFlagged);
const sc = (h: Household) => computeScore(h.signals, h.profileGroup).score;

// 5단계 — 임계값 vs 조합 대조(5-A.4). 극복 ①② 시각적 증거 + 순환 자백 + 거짓음성 지표.
export default function Step5Priority({
  onSelect,
}: {
  onSelect: (id: string) => void;
}) {
  const r = compareMethods(RESIDUAL);
  const onlyCombIds = new Set(r.onlyCombination.map((h) => h.id));
  const onlyThrIds = new Set(r.onlyThreshold.map((h) => h.id));

  const thrSorted = [...r.thresholdFound].sort((a, b) => sc(b) - sc(a));
  const combSorted = [...r.combinationFound].sort((a, b) => sc(b) - sc(a));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Column
          title="기존 · 임계값 방식 (OR)"
          subtitle={`단일 신호 임계 초과 시 발굴 · ${r.thresholdFound.length}건`}
          tone="neutral"
        >
          {thrSorted.map((h) => (
            <CaseRow
              key={h.id}
              h={h}
              onSelect={onSelect}
              flagOnlyThreshold={onlyThrIds.has(h.id)}
            />
          ))}
        </Column>

        <Column
          title={`우리 · 조합 방식 (가중합 ≥ ${COMBINATION_CUTOFF})`}
          subtitle={`잔여 ${RESIDUAL.length}건 중 ${r.combinationFound.length}건 발굴`}
          tone="brand"
        >
          {combSorted.map((h) => (
            <CaseRow
              key={h.id}
              h={h}
              onSelect={onSelect}
              highlight={onlyCombIds.has(h.id)}
            />
          ))}
        </Column>
      </div>

      {/* 추가로 보는 케이스 — 정성 메시지 (절대배수 금지) */}
      <div className="flex items-start gap-2.5 rounded-xl border border-brand-300 bg-brand-50 px-4 py-3 text-sm leading-relaxed text-brand-800 shadow-card">
        <ArrowRight size={16} className="mt-0.5 shrink-0" />
        <span>
          조합 방식은 임계값 방식이 놓친{" "}
          <span className="font-bold">{r.onlyCombination.length}건</span>을 추가로
          후보에 올립니다 (대부분 <b>유형 B·C</b> — 임계 미만 조합/집단 특화).
          파란 하이라이트가 그 케이스입니다.
        </span>
      </div>

      {/* 거짓음성(놓침) 미니 지표 — 기획서 6.2의 1순위 지표 */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric
          label="설계상 고위험 (잔여)"
          value={`${r.comparison.groundTruthHigh}건`}
          note="합성 정답 기준"
        />
        <Metric
          label="임계값이 놓친 고위험"
          value={`${r.comparison.thresholdMissedHigh}건`}
          note="거짓음성"
          tone="warn"
        />
        <Metric
          label="조합이 회수한 고위험"
          value={`${r.comparison.recoveredHigh}건`}
          note="임계값 누락분 중"
          tone="good"
        />
      </div>

      {/* 순환 자백 — 정직성 (G) */}
      <div className="flex gap-2.5 rounded-xl border border-slate-300 bg-slate-50/80 p-4 text-sm leading-relaxed text-slate-600">
        <AlertCircle size={18} className="mt-0.5 shrink-0 text-slate-400" />
        <div>
          <div className="mb-1.5 flex flex-wrap items-center gap-2 font-semibold text-slate-700">
            이 비교가 증명하는 것 / 증명하지 않는 것 <SimBadge label="합성 데이터" />
          </div>
          위 케이스들은 우리가 ‘조합으로 잡히도록’ <b>설계한 합성 데이터</b>입니다.
          따라서 이 화면은 <b>발굴량(‘몇 배 더 찾았다’)을 증명하지 않습니다.</b>{" "}
          증명하는 것은 <b>‘같은 데이터를 조합으로 보면 임계 미달도 후보가 된다’는
          메커니즘</b>이며, 실제 발굴 성능은 실데이터 파일럿에서만 검증됩니다(기획서
          6.2). 거짓음성(놓침) 감소를 오탐 감소보다 우선합니다.
        </div>
      </div>
    </div>
  );
}

function Column({
  title,
  subtitle,
  tone,
  children,
}: {
  title: string;
  subtitle: string;
  tone: "neutral" | "brand";
  children: React.ReactNode;
}) {
  return (
    <div
      className={`card overflow-hidden ${
        tone === "brand" ? "border-brand-300 ring-1 ring-brand-100" : ""
      }`}
    >
      <div
        className={`border-b px-4 py-3 ${
          tone === "brand"
            ? "border-brand-100 bg-brand-50"
            : "border-slate-100 bg-slate-50/70"
        }`}
      >
        <div
          className={`text-sm font-bold ${
            tone === "brand" ? "text-brand-700" : "text-slate-700"
          }`}
        >
          {title}
        </div>
        <div className="mt-0.5 text-xs text-slate-500">{subtitle}</div>
      </div>
      <div className="scroll-slim max-h-80 space-y-1 overflow-auto p-2">
        {children}
      </div>
    </div>
  );
}

function CaseRow({
  h,
  onSelect,
  highlight = false,
  flagOnlyThreshold = false,
}: {
  h: Household;
  onSelect: (id: string) => void;
  highlight?: boolean;
  flagOnlyThreshold?: boolean;
}) {
  const cl = caseLabel(h.caseType);
  return (
    <button
      onClick={() => onSelect(h.id)}
      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
        highlight
          ? "bg-brand-100 ring-1 ring-inset ring-brand-300 hover:bg-brand-200"
          : "hover:bg-slate-50"
      }`}
    >
      <span className="font-mono text-xs text-slate-500">{h.id}</span>
      <span className="tabular-nums font-bold text-slate-800">{sc(h)}</span>
      {cl && (
        <span className="chip bg-slate-100 px-1.5 text-[11px] text-slate-600">
          {cl.tag}
        </span>
      )}
      {highlight && (
        <span className="ml-auto text-[11px] font-semibold text-brand-700">
          임계값이면 놓침
        </span>
      )}
      {flagOnlyThreshold && (
        <span className="ml-auto text-[11px] font-semibold text-amber-600">
          조합은 보류(오탐 후보)
        </span>
      )}
    </button>
  );
}

function Metric({
  label,
  value,
  note,
  tone = "neutral",
}: {
  label: string;
  value: string;
  note: string;
  tone?: "neutral" | "warn" | "good";
}) {
  const cls =
    tone === "warn"
      ? "text-red-600"
      : tone === "good"
        ? "text-brand-700"
        : "text-slate-800";
  const accent =
    tone === "warn"
      ? "border-t-red-400"
      : tone === "good"
        ? "border-t-brand-400"
        : "border-t-slate-300";
  return (
    <div
      className={`card border-t-2 ${accent} p-3.5 text-center`}
    >
      <div className={`text-2xl font-bold tabular-nums leading-none ${cls}`}>
        {value}
      </div>
      <div className="mt-1.5 text-xs font-semibold text-slate-600">{label}</div>
      <div className="mt-0.5 text-[11px] text-slate-400">{note}</div>
    </div>
  );
}
