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
import { ml, isRapidDecline, anomalyLevel } from "../lib/ml";
import { mapRouteUrl } from "../lib/geo";
import RiskBadge from "./RiskBadge";
import RiskTimeline from "./RiskTimeline";
import SimBadge from "./SimBadge";
import StatusBadge from "./StatusBadge";
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
  Zap,
  Activity,
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
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4 dark:border-night-700 dark:bg-night-800">
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
              <span className="font-mono text-lg font-bold text-slate-800 dark:text-slate-100">
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
              <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                · {meta.priorityReason}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
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
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-night-700 dark:bg-night-800/60">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="section-label">처리 상태</span>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              담당
              <select
                value={assignee}
                onChange={(e) => setAssignee(household.id, e.target.value)}
                className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-xs font-semibold text-slate-700 focus-visible:border-brand-400 dark:border-night-600 dark:bg-night-850 dark:text-slate-200"
              >
                {ASSIGNEES.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-2 flex gap-1 rounded-lg bg-white p-1 ring-1 ring-slate-200 dark:bg-night-850 dark:ring-night-600">
            {STATUS_ORDER.map((s) => (
              <button
                key={s}
                onClick={() => setStatus(household.id, s as CaseStatus)}
                aria-pressed={status === s}
                className={`min-h-[2.25rem] flex-1 rounded-md px-2 py-1.5 text-xs font-semibold transition-all duration-200 ${
                  status === s
                    ? `${STATUS_META[s].chip} ring-1`
                    : "text-slate-400 hover:bg-slate-50 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-night-800 dark:hover:text-slate-300"
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
            <InfoTile
              icon={<Phone size={14} />}
              label="연락처"
              value={meta.maskedPhone}
              href={`tel:010-0000-${meta.maskedPhone.slice(-4)}`}
            />
            <InfoTile
              icon={<MapPin size={14} />}
              label="주소"
              value={meta.maskedAddress}
              href={mapRouteUrl(household)}
            />
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
                  <span className="text-slate-500 dark:text-slate-400">{b.label}</span>
                  <span className="tabular-nums text-slate-600 dark:text-slate-300">
                    {b.contribution.toFixed(1)}점
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100 shadow-inset dark:bg-night-700">
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
          <MlSummary household={household} />
        </div>

        {/* ── 근거 서술 (LLM 역할 — 점수·판정 생성 안 함) ── */}
        <div className="rounded-xl border-l-2 border-brand-300 bg-slate-50/80 p-3 dark:border-brand-700 dark:bg-night-800/80">
          <div className="mb-1.5 flex items-center gap-1.5">
            <Quote size={13} className="text-slate-400" />
            <span className="section-label">근거 서술</span>
            <SimBadge label="근거 서술" title="실서비스에선 LLM이 생성(역할 한정). 점수·순서는 만들지 않고 서술만." />
          </div>
          <p className="text-sm leading-relaxed text-slate-800 dark:text-slate-200">
            {reason.rationale}
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {reason.basisSignals.map((b) => (
              <span
                key={b}
                className="rounded bg-white px-1.5 py-0.5 text-[11px] text-slate-600 shadow-sm ring-1 ring-slate-200 dark:bg-night-850 dark:text-slate-300 dark:ring-night-600"
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
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700 dark:bg-brand-900/60 dark:text-brand-200">
                  {i + 1}
                </span>
                <span className="text-slate-700 dark:text-slate-200">
                  <b>{r.action}</b> —{" "}
                  <span className="text-slate-500 dark:text-slate-400">{r.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* ── 반대 근거 ── */}
        {reason.counterEvidence && (
          <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50/80 p-2.5 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
            <span className="leading-relaxed">{reason.counterEvidence}</span>
          </div>
        )}

        {/* ── 시계열 ── */}
        <RiskTimeline household={household} />

        {/* ── 조치 기록 (자동처리 아님) ── */}
        <div className="border-t border-slate-100 pt-3.5 dark:border-night-700">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-1">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              담당자 조치 기록
            </span>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              AI가 아닌 담당자가 직접 기록합니다
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {ACTIONS.map((a) => (
              <button
                key={a.key}
                onClick={() => record(a.key)}
                className="inline-flex min-h-[2.5rem] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 transition-all duration-200 hover:border-brand-300 hover:text-brand-700 active:translate-y-px dark:border-night-600 dark:bg-night-800 dark:text-slate-300 dark:hover:border-brand-700 dark:hover:text-brand-300"
              >
                {a.icon}
                {a.label}
              </button>
            ))}
          </div>

          {/* 활동 로그 — 기록 시 타임스탬프와 함께 쌓인다 */}
          {log.length > 0 && (
            <ul className="mt-3 space-y-1.5 border-l-2 border-slate-100 pl-3 dark:border-night-700">
              {log.map((e, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2 text-xs text-slate-600 animate-popIn dark:text-slate-300"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700 dark:bg-brand-900/60 dark:text-brand-200">
                    {ACTIONS.find((a) => a.key === e.action)?.icon}
                  </span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {ACTION_LABEL[e.action]}
                  </span>
                  <span className="text-slate-400 dark:text-slate-500">기록됨</span>
                  <span className="ml-auto tabular-nums text-slate-400 dark:text-slate-500">
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

// ML 보조선별 — 한 줄 상태 + 최근 변화 2개. 중복 배지 제거로 한눈에.
function MlSummary({ household }: { household: Household }) {
  const m = ml(household);
  const rapid = isRapidDecline(household);
  const lvl = anomalyLevel(m.anomalyScore);
  const statusText = rapid
    ? "급속·다변량 악화 감지"
    : m.anomalyScore >= 0.4
      ? "이상 추세 감지"
      : "특이 추세 없음";
  const iconWrap =
    rapid || lvl === "high"
      ? "bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400"
      : lvl === "mid"
        ? "bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400"
        : "bg-slate-200 text-slate-500 dark:bg-night-700 dark:text-slate-400";
  const top = m.topSignals.slice(0, 2);

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 dark:border-night-700 dark:bg-night-800/60">
      <div className="flex items-center gap-2.5">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconWrap}`}
        >
          {rapid ? <Zap size={17} /> : <Activity size={17} />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{statusText}</div>
          <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">
            {m.clusterId >= 0 ? `${m.clusterLabel} · ` : ""}이상도{" "}
            {Math.round(m.anomalyScore * 100)}
            {m.anomalyPercentile > 0 &&
              ` · 상위 ${Math.max(1, Math.round(100 - m.anomalyPercentile))}%`}
          </div>
        </div>
      </div>

      {top.length > 0 && (
        <div className="mt-3 border-t border-slate-200/70 pt-3 dark:border-night-700/70">
          <div className="mb-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            최근 8주 주요 변화
          </div>
          <div className="grid grid-cols-2 gap-2">
            {top.map((k) => {
              const cp = m.changePoints.find((c) => c.signal === k);
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
        </div>
      )}

      <p className="mt-3 text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
        ML은 우선순위·선별까지 — 위험 판정과 개입 결정은 담당자.
      </p>
    </div>
  );
}

function InfoTile({
  icon,
  label,
  value,
  warn = false,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  warn?: boolean;
  /** 있으면 원탭 액션(전화·길찾기)으로 동작 */
  href?: string;
}) {
  const inner = (
    <>
      <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400 dark:text-slate-500">
        {icon}
        {label}
      </div>
      <div
        className={`mt-1 truncate text-xs font-semibold ${
          warn
            ? "text-red-600 dark:text-red-400"
            : "text-slate-700 dark:text-slate-200"
        }`}
        title={value}
      >
        {value}
      </div>
    </>
  );
  const base =
    "block rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 dark:border-night-700 dark:bg-night-800/60";
  if (href) {
    const external = href.startsWith("http");
    return (
      <a
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noreferrer" : undefined}
        aria-label={`${label} ${value} — 탭하면 바로 연결`}
        className={`${base} transition-colors active:bg-brand-50 dark:active:bg-night-700`}
      >
        {inner}
      </a>
    );
  }
  return <div className={base}>{inner}</div>;
}
