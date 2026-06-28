import { useState } from "react";
import { computeScore, BAND_STYLES, riskBand } from "../lib/scoring";
import { generateReason } from "../lib/reason";
import { caseLabel } from "../lib/caseLabels";
import { PROFILE_LABELS } from "../lib/profiles";
import { caseMeta, PRIORITY_STYLE } from "../lib/caseMeta";
import {
  useCaseState,
  STATUS_ORDER,
  STATUS_META,
  ASSIGNEES,
  type CaseStatus,
} from "../lib/caseState";
import type { Household } from "../lib/types";
import { ml } from "../lib/ml";
import RiskBadge from "./RiskBadge";
import RiskTimeline from "./RiskTimeline";
import SimBadge from "./SimBadge";
import StatusBadge from "./StatusBadge";
import AnomalyBadge from "./ml/AnomalyBadge";
import MlInsightChips from "./ml/MlInsightChips";
import SignalTrajectory from "./ml/SignalTrajectory";
import {
  Phone,
  Home,
  Eye,
  AlertTriangle,
  ListChecks,
  MapPin,
  Clock,
  User,
  Quote,
  Sparkles,
} from "lucide-react";

type Action = "call" | "visit" | "watch";
const ACTIONS: { key: Action; label: string; icon: React.ReactNode }[] = [
  { key: "call", label: "전화", icon: <Phone size={15} /> },
  { key: "visit", label: "방문", icon: <Home size={15} /> },
  { key: "watch", label: "관찰", icon: <Eye size={15} /> },
];
const ACTION_LABEL: Record<Action, string> = {
  call: "전화 접촉",
  visit: "방문",
  watch: "관찰 등록",
};

interface LogEntry {
  action: Action;
  time: string;
}

function nowLabel(): string {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `오늘 ${hh}:${mm}`;
}

// 케이스 상세 — 실제 케이스 관리(CRM) 패널 톤. 조치는 '기록'만 한다(원칙 4).
export default function CaseDetail({ household }: { household: Household }) {
  const [log, setLog] = useState<LogEntry[]>([]);
  const { getStatus, setStatus, getAssignee, setAssignee } = useCaseState();
  const { score, breakdown } = computeScore(
    household.signals,
    household.profileGroup
  );
  const reason = generateReason(household);
  const cl = caseLabel(household.caseType);
  const bandStyle = BAND_STYLES[riskBand(score)];
  const meta = caseMeta(household, score);
  const pri = PRIORITY_STYLE[meta.priority];
  const status = getStatus(household.id);
  const assignee = getAssignee(household.id);

  function record(action: Action) {
    setLog((prev) => [{ action, time: nowLabel() }, ...prev].slice(0, 5));
  }

  return (
    <div className="card overflow-hidden">
      {/* ── 프로필 헤더 밴드 ── */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white px-5 py-4">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white shadow-sm ${
              meta.priority === "P1"
                ? "bg-gradient-to-br from-red-500 to-red-600"
                : meta.priority === "P2"
                  ? "bg-gradient-to-br from-amber-500 to-amber-600"
                  : "bg-gradient-to-br from-slate-400 to-slate-500"
            }`}
          >
            <User size={22} strokeWidth={2.2} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-lg font-bold text-slate-800">
                {household.id}
              </span>
              <span
                className={`chip border ${pri.chip}`}
                title="우선순위 = 위험점수 + 최근 추세 + 미접촉 (투명 공식)"
              >
                <span className={`h-1.5 w-1.5 rounded-full ${pri.dot}`} />
                {meta.priority} · {meta.priorityLabel}
              </span>
              <StatusBadge status={status} size="sm" />
              <span className="text-[11px] font-medium text-slate-400">
                · {meta.priorityReason}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
              <span>{household.dong}</span>
              <span className="text-slate-300">·</span>
              <span>{household.ageBand}</span>
              <span className="text-slate-300">·</span>
              <span>{household.sex === "F" ? "여" : "남"}</span>
              <span className="text-slate-300">·</span>
              <span>{PROFILE_LABELS[household.profileGroup]}</span>
              {cl && (
                <span className="chip bg-brand-50 text-[11px] text-brand-700">
                  {cl.tag}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div
            className={`text-4xl font-bold tabular-nums leading-none ${bandStyle.text}`}
          >
            {score}
          </div>
          <div className="mt-1.5">
            <RiskBadge score={score} size="sm" />
          </div>
        </div>
      </div>

      <div className="card-pad space-y-4">
        {/* ── 처리 상태 · 담당자 워크플로우 ── */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="section-label">처리 상태</span>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              담당
              <select
                value={assignee}
                onChange={(e) => setAssignee(household.id, e.target.value)}
                className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-xs font-semibold text-slate-700 focus-visible:border-brand-400"
              >
                {ASSIGNEES.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-2 flex gap-1 rounded-lg bg-white p-1 ring-1 ring-slate-200">
            {STATUS_ORDER.map((s) => (
              <button
                key={s}
                onClick={() => setStatus(household.id, s as CaseStatus)}
                aria-pressed={status === s}
                className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold transition-all duration-200 ${
                  status === s
                    ? `${STATUS_META[s].chip} ring-1`
                    : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                }`}
              >
                {STATUS_META[s].label}
              </button>
            ))}
          </div>
        </div>

        {/* ── 운영 정보 (마스킹) ── */}
        <div>
          <div className="mb-1.5 flex items-center gap-1.5">
            <span className="section-label">대상자 정보</span>
            <SimBadge
              label="합성·마스킹"
              title="연락처·주소는 데모용 합성 데이터이며 개인정보 보호를 위해 마스킹되어 있습니다."
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <InfoTile icon={<Phone size={14} />} label="연락처" value={meta.maskedPhone} />
            <InfoTile icon={<MapPin size={14} />} label="주소" value={meta.maskedAddress} />
            <InfoTile
              icon={<Clock size={14} />}
              label="최근 접촉"
              value={`${meta.lastContactDays}일 전`}
              warn={meta.lastContactDays > 30}
            />
          </div>
        </div>

        {/* ── 위험 신호 기여도 ── */}
        <div>
          <div className="mb-2 section-label">위험 신호 기여도</div>
          <div className="space-y-1.5">
            {breakdown.map((b) => (
              <div key={b.key}>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">{b.label}</span>
                  <span className="tabular-nums text-slate-600">
                    {b.contribution.toFixed(1)}점
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100 shadow-inset">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ease-out ${bandStyle.bar}`}
                    style={{ width: `${b.contribution}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── ML 보조선별 (작업 B) ── */}
        <div>
          <div className="mb-1.5 flex items-center gap-1.5">
            <Sparkles size={13} className="text-rose-400" />
            <span className="section-label">ML 보조선별</span>
            <SimBadge
              label="오프라인 ML"
              title="scripts/run_ml.py가 오프라인 계산. 위험 판정이 아니라 급속악화·군집 보조 신호."
            />
          </div>
          <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <AnomalyBadge household={household} />
              <MlInsightChips household={household} />
            </div>
            {ml(household).topSignals.length > 0 && (
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {ml(household)
                  .topSignals.slice(0, 3)
                  .map((k) => {
                    const cp = ml(household).changePoints.find((c) => c.signal === k);
                    return (
                      <SignalTrajectory
                        key={k}
                        household={household}
                        signalKey={k}
                        changeWeek={cp?.week}
                      />
                    );
                  })}
              </div>
            )}
            <p className="text-[11px] leading-relaxed text-slate-400">
              ML은 우선순위·선별까지만 — 위험 판정과 개입 결정은 담당자(G4).
            </p>
          </div>
        </div>

        {/* ── 근거 서술 (LLM 역할 — 점수·판정 생성 안 함) ── */}
        <div className="rounded-xl border-l-2 border-brand-300 bg-slate-50/80 p-3">
          <div className="mb-1.5 flex items-center gap-1.5">
            <Quote size={13} className="text-slate-400" />
            <span className="section-label">근거 서술</span>
            <SimBadge label="근거 서술" title="실서비스에선 LLM이 생성(역할 한정). 점수·순서는 만들지 않고 서술만." />
          </div>
          <p className="text-sm leading-relaxed text-slate-800">
            {reason.rationale}
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {reason.basisSignals.map((b) => (
              <span
                key={b}
                className="rounded bg-white px-1.5 py-0.5 text-[11px] text-slate-600 shadow-sm ring-1 ring-slate-200"
              >
                {b}
              </span>
            ))}
          </div>
        </div>

        {/* ── 권고 ── */}
        <div>
          <div className="mb-1.5 flex items-center gap-1.5 section-label">
            <ListChecks size={13} /> 권고 액션
          </div>
          <ul className="space-y-1.5">
            {reason.recommendations.map((r, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700">
                  {i + 1}
                </span>
                <span className="text-slate-700">
                  <b>{r.action}</b> —{" "}
                  <span className="text-slate-500">{r.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* ── 반대 근거 ── */}
        {reason.counterEvidence && (
          <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50/80 p-2.5 text-xs text-amber-800">
            <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-600" />
            <span className="leading-relaxed">{reason.counterEvidence}</span>
          </div>
        )}

        {/* ── 시계열 ── */}
        <RiskTimeline household={household} />

        {/* ── 조치 기록 (자동처리 아님) ── */}
        <div className="border-t border-slate-100 pt-3.5">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-1">
            <span className="text-xs font-semibold text-slate-600">
              담당자 조치 기록
            </span>
            <span className="text-[11px] text-slate-400">
              AI가 아닌 담당자가 직접 기록합니다
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {ACTIONS.map((a) => (
              <button
                key={a.key}
                onClick={() => record(a.key)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 transition-all duration-200 hover:border-brand-300 hover:text-brand-700 active:translate-y-px"
              >
                {a.icon}
                {a.label}
              </button>
            ))}
          </div>

          {/* 활동 로그 — 기록 시 타임스탬프와 함께 쌓인다 */}
          {log.length > 0 && (
            <ul className="mt-3 space-y-1.5 border-l-2 border-slate-100 pl-3">
              {log.map((e, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2 text-xs text-slate-600 animate-popIn"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                    {ACTIONS.find((a) => a.key === e.action)?.icon}
                  </span>
                  <span className="font-semibold text-slate-700">
                    {ACTION_LABEL[e.action]}
                  </span>
                  <span className="text-slate-400">기록됨</span>
                  <span className="ml-auto tabular-nums text-slate-400">
                    {e.time}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoTile({
  icon,
  label,
  value,
  warn = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-2.5">
      <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
        {icon}
        {label}
      </div>
      <div
        className={`mt-1 truncate text-xs font-semibold ${
          warn ? "text-red-600" : "text-slate-700"
        }`}
        title={value}
      >
        {value}
      </div>
    </div>
  );
}
