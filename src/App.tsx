import { useMemo, useState } from "react";
import AnalysisTab from "./components/analysis/AnalysisTab";
import UtilizationTab from "./components/utilization/UtilizationTab";
import VisitTab from "./components/visit/VisitTab";
import CaseBoard from "./components/caseboard/CaseBoard";
import IntroHook from "./components/IntroHook";
import ProofBoundary from "./components/ProofBoundary";
import RiskBadge from "./components/RiskBadge";
import { CaseStateProvider } from "./lib/caseState";
import { HOUSEHOLDS } from "./lib/data";
import { computeScore } from "./lib/scoring";
import type { Household } from "./lib/types";
import {
  Layers,
  Sparkles,
  Route,
  LayoutDashboard,
  ShieldCheck,
  Search,
  RefreshCw,
  Lock,
  Quote,
} from "lucide-react";

type Tab = "analysis" | "utilization" | "visit" | "caseboard";

const TABS: { key: Tab; label: string; icon: React.ReactNode; star?: boolean }[] = [
  { key: "analysis", label: "분석", icon: <Layers size={16} /> },
  { key: "utilization", label: "활용도", icon: <Sparkles size={16} />, star: true },
  { key: "visit", label: "방문계획", icon: <Route size={16} />, star: true },
  { key: "caseboard", label: "케이스 관리", icon: <LayoutDashboard size={16} /> },
];

const RESIDUAL = HOUSEHOLDS.filter((h) => !h.haengbokFlagged);
const sc = (h: Household) => computeScore(h.signals, h.profileGroup).score;

export default function App() {
  const [tab, setTab] = useState<Tab>("utilization");
  const [selectedId, setSelectedId] = useState(
    [...RESIDUAL].sort((a, b) => sc(b) - sc(a))[0]?.id ?? ""
  );
  const [globalQuery, setGlobalQuery] = useState("");
  const [showIntro, setShowIntro] = useState(false);
  const [showProof, setShowProof] = useState(false);

  function gotoCase(id: string) {
    setSelectedId(id);
    setGlobalQuery(id);
    setTab("caseboard");
  }
  function searchTo(q: string) {
    setGlobalQuery(q);
    setTab("caseboard");
  }

  return (
    <CaseStateProvider>
      <div className="min-h-screen">
        <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 shadow-header backdrop-blur-md">
          <div className="mx-auto max-w-6xl px-4">
            {/* 상단 줄: 로고 · 검색 · 시스템 chrome */}
            <div className="flex items-center gap-3 py-3">
              <div className="flex shrink-0 items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 text-white shadow-sm ring-1 ring-brand-700/20">
                  <ShieldCheck size={20} strokeWidth={2.2} />
                </div>
                <div className="hidden leading-tight sm:block">
                  <h1 className="text-[15px] font-bold text-slate-800">
                    복지망 발굴·모니터링{" "}
                    <span className="text-brand-600">보조 시스템</span>
                  </h1>
                  <p className="text-caption text-slate-400">
                    점수는 투명 공식 · 근거는 LLM · 결정은 사람
                  </p>
                </div>
              </div>

              <GlobalSearch onPick={gotoCase} onSubmit={searchTo} />

              <div className="hidden shrink-0 items-center gap-3 lg:flex">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <RefreshCw size={12} /> 09:00 동기화
                </div>
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                  <Lock size={11} /> 조회·기록 권한
                </span>
                <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
                  <div className="text-right leading-tight">
                    <div className="text-[13px] font-semibold text-slate-700">
                      행복동 행정복지센터
                    </div>
                    <div className="text-[11px] text-slate-400">복지정책과</div>
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700 ring-1 ring-brand-200">
                    김
                  </div>
                </div>
              </div>
            </div>

            {/* 하단 줄: 탭 + 정보 토글(기본 숨김) */}
            <div className="flex items-center justify-between gap-2 pb-2">
              <nav className="flex gap-1 overflow-x-auto" role="tablist" aria-label="화면 전환">
                {TABS.map((t) => (
                  <TabButton
                    key={t.key}
                    active={tab === t.key}
                    onClick={() => setTab(t.key)}
                    icon={t.icon}
                    label={t.label}
                    star={t.star}
                  />
                ))}
              </nav>
              <div className="flex shrink-0 items-center gap-1.5">
                <InfoToggle
                  active={showIntro}
                  onClick={() => setShowIntro((v) => !v)}
                  icon={<Quote size={13} />}
                  label="수원 모녀 사례"
                />
                <InfoToggle
                  active={showProof}
                  onClick={() => setShowProof((v) => !v)}
                  icon={<ShieldCheck size={13} />}
                  label="증명 경계"
                />
              </div>
            </div>
          </div>
        </header>

        {showIntro && <IntroHook onClose={() => setShowIntro(false)} />}
        {showProof && <ProofBoundary onClose={() => setShowProof(false)} />}

        <main className="mx-auto max-w-6xl px-4 py-6">
          <div key={tab} className="animate-fadeIn">
            {tab === "analysis" && <AnalysisTab onGotoCase={gotoCase} />}
            {tab === "utilization" && (
              <UtilizationTab onGotoVisit={() => setTab("visit")} onGotoCase={gotoCase} />
            )}
            {tab === "visit" && <VisitTab onGotoCase={gotoCase} />}
            {tab === "caseboard" && (
              <CaseBoard
                selectedId={selectedId}
                onSelect={setSelectedId}
                globalQuery={globalQuery}
              />
            )}
          </div>
        </main>

        <footer className="mx-auto max-w-6xl px-4 pb-8 pt-2">
          <p className="text-center text-xs text-slate-400">
            공모전 발표용 인터랙티브 데모 · 합성 데이터 기반 · 발굴 성능 증명이
            아닌 파이프라인·UX 시연
          </p>
        </footer>
      </div>
    </CaseStateProvider>
  );
}

function GlobalSearch({
  onPick,
  onSubmit,
}: {
  onPick: (id: string) => void;
  onSubmit: (q: string) => void;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return [];
    return RESIDUAL.filter((h) => `${h.id} ${h.dong}`.toLowerCase().includes(k))
      .sort((a, b) => sc(b) - sc(a))
      .slice(0, 6);
  }, [q]);

  return (
    <div className="relative mx-auto w-full max-w-md flex-1">
      <Search
        size={16}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
      />
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && q.trim()) {
            onSubmit(q.trim());
            setOpen(false);
            (e.target as HTMLInputElement).blur();
          }
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder="대상자 ID·행정동 검색"
        className="w-full rounded-lg border border-slate-200 bg-slate-50/80 py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus-visible:border-brand-400 focus-visible:bg-white"
      />
      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card-hover animate-popIn">
          {results.map((h) => (
            <button
              key={h.id}
              onMouseDown={(e) => {
                e.preventDefault();
                onPick(h.id);
                setQ("");
                setOpen(false);
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-brand-50/60"
            >
              <span className="w-7 shrink-0 text-center font-bold tabular-nums text-slate-800">
                {sc(h)}
              </span>
              <span className="font-mono text-xs text-slate-600">{h.id}</span>
              <span className="text-xs text-slate-400">{h.dong}</span>
              <span className="ml-auto">
                <RiskBadge score={sc(h)} size="sm" />
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  star,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  star?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      role="tab"
      aria-selected={active}
      className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-all duration-200 ${
        active
          ? "bg-brand-50 text-brand-700 ring-1 ring-brand-200"
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
      }`}
    >
      {icon}
      {label}
      {star && (
        <span
          className={`h-1.5 w-1.5 rounded-full ${active ? "bg-brand-500" : "bg-amber-400"}`}
          aria-label="발표 핵심"
        />
      )}
    </button>
  );
}

function InfoToggle({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      title={label}
      className={`inline-flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold transition-all duration-200 ${
        active
          ? "border-brand-300 bg-brand-50 text-brand-700"
          : "border-slate-200 bg-white text-slate-400 hover:border-brand-200 hover:text-brand-600"
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
