import { useEffect, useMemo, useRef, useState } from "react";
import AnalysisTab from "./components/analysis/AnalysisTab";
import UtilizationTab from "./components/utilization/UtilizationTab";
import VisitTab from "./components/visit/VisitTab";
import CaseBoard from "./components/caseboard/CaseBoard";
import ExperimentTab from "./components/experiment/ExperimentTab";
import IntroHook from "./components/IntroHook";
import ProofBoundary from "./components/ProofBoundary";
import References from "./components/References";
import RiskBadge from "./components/RiskBadge";
import BottomNav, { type BottomNavItem } from "./components/BottomNav";
import LoginScreen from "./components/auth/LoginScreen";
import MobileShell from "./components/mobile/MobileShell";
import { CaseStateProvider } from "./lib/caseState";
import { useAuth } from "./lib/auth";
import { useIsMobile } from "./lib/useIsMobile";
import { HOUSEHOLDS } from "./lib/data";
import { computeScore } from "./lib/scoring";
import type { Household } from "./lib/types";
import {
  Layers,
  Sparkles,
  Route,
  LayoutDashboard,
  FlaskConical,
  ShieldCheck,
  Search,
  RefreshCw,
  Lock,
  Quote,
  BookOpen,
  LogOut,
  ChevronDown,
} from "lucide-react";

type Tab = "analysis" | "utilization" | "visit" | "caseboard" | "experiment";

const TABS: BottomNavItem<Tab>[] = [
  { key: "analysis", label: "분석", icon: <Layers size={16} /> },
  { key: "utilization", label: "활용도", icon: <Sparkles size={16} />, star: true },
  { key: "visit", label: "방문계획", icon: <Route size={16} />, star: true },
  { key: "caseboard", label: "케이스", icon: <LayoutDashboard size={16} /> },
  { key: "experiment", label: "실증 실험", icon: <FlaskConical size={16} />, star: true },
];

const RESIDUAL = HOUSEHOLDS.filter((h) => !h.haengbokFlagged);
const sc = (h: Household) => computeScore(h.signals, h.profileGroup).score;

export default function App() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [tab, setTab] = useState<Tab>("utilization");
  const [selectedId, setSelectedId] = useState(
    [...RESIDUAL].sort((a, b) => sc(b) - sc(a))[0]?.id ?? ""
  );
  const [globalQuery, setGlobalQuery] = useState("");
  const [showIntro, setShowIntro] = useState(false);
  const [showProof, setShowProof] = useState(false);
  const [showRefs, setShowRefs] = useState(false);

  function gotoCase(id: string) {
    setSelectedId(id);
    setGlobalQuery(id);
    setTab("caseboard");
  }
  function searchTo(q: string) {
    setGlobalQuery(q);
    setTab("caseboard");
  }
  // 탭 ARIA APG: 좌우/Home/End 화살표로 탭 이동(roving focus)
  function onTabListKeyDown(e: React.KeyboardEvent) {
    const idx = TABS.findIndex((t) => t.key === tab);
    const last = TABS.length - 1;
    let next = idx;
    if (e.key === "ArrowRight") next = idx === last ? 0 : idx + 1;
    else if (e.key === "ArrowLeft") next = idx === 0 ? last : idx - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = last;
    else return;
    e.preventDefault();
    const key = TABS[next].key;
    setTab(key);
    window.requestAnimationFrame(() =>
      document.getElementById(`tab-${key}`)?.focus()
    );
  }

  // 인증 게이트 (작업 C) — 미로그인 시 로그인 화면
  if (!user) return <LoginScreen />;

  // ★ 모바일은 현장용 2탭 앱으로 완전히 분리 (데스크톱 발표용 4탭과 별개)
  if (isMobile)
    return (
      <CaseStateProvider>
        <MobileShell />
      </CaseStateProvider>
    );

  const activeTabLabel = TABS.find((t) => t.key === tab)?.label ?? "";

  return (
    <CaseStateProvider>
      <div className="min-h-screen pb-16 lg:pb-0">
        <header className="sticky top-0 z-30 shadow-header">
          {/* ① 상단 유틸리티 바 — 정부 포털 공통(동기화·권한·계정) */}
          <div className="border-b border-slate-200 bg-slate-50">
            <div className="mx-auto flex max-w-6xl items-center justify-end gap-2.5 px-4 py-1 text-[11px] text-slate-500">
              <span className="hidden items-center gap-1 sm:inline-flex">
                <RefreshCw size={11} /> 09:00 동기화
              </span>
              <span className="hidden h-3 w-px bg-slate-300 sm:inline-block" />
              <span className="inline-flex items-center gap-1 font-semibold text-slate-600">
                <Lock size={11} /> 조회·기록 권한
              </span>
              <span className="h-3 w-px bg-slate-300" />
              <ProfileMenu />
            </div>
          </div>

          {/* ② 기관 마크 + 통합검색 (GNB 메인) */}
          <div className="border-b border-slate-200 bg-white">
            <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-2.5">
              <div className="flex shrink-0 items-center gap-2.5">
                {/* 기관형 자체 마크 — 각진 정부블루 심볼(실제 정부상징 미사용) */}
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-500 text-white">
                  <ShieldCheck size={19} strokeWidth={2.2} />
                </div>
                <div className="leading-tight">
                  <h1 className="text-[17px] font-extrabold tracking-tight text-slate-900">
                    이음누리
                  </h1>
                  <p className="hidden text-[11px] font-medium text-slate-500 sm:block">
                    복지 사각지대 발굴·모니터링 시스템
                  </p>
                </div>
              </div>

              <GlobalSearch onPick={gotoCase} onSubmit={searchTo} />
            </div>
          </div>

          {/* ③ GNB 탭 네비 — 밑줄 강조형(정부24 스타일) + 정보 토글 */}
          <div className="border-b border-slate-200 bg-white">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4">
              <nav
                className="hidden overflow-x-auto lg:flex"
                role="tablist"
                aria-label="화면 전환"
                onKeyDown={onTabListKeyDown}
              >
                {TABS.map((t) => (
                  <TabButton
                    key={t.key}
                    tabKey={t.key}
                    active={tab === t.key}
                    onClick={() => setTab(t.key)}
                    icon={t.icon}
                    label={t.label}
                    star={t.star}
                  />
                ))}
              </nav>
              {/* 모바일: 현재 탭 라벨 */}
              <span className="py-2.5 text-sm font-bold text-slate-700 lg:hidden">
                {activeTabLabel}
              </span>
              <div className="flex shrink-0 items-center gap-1.5 py-1.5">
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
                <InfoToggle
                  active={showRefs}
                  onClick={() => setShowRefs((v) => !v)}
                  icon={<BookOpen size={13} />}
                  label="근거·출처"
                />
              </div>
            </div>
          </div>
        </header>

        {showIntro && <IntroHook onClose={() => setShowIntro(false)} />}
        {showProof && <ProofBoundary onClose={() => setShowProof(false)} />}
        {showRefs && <References onClose={() => setShowRefs(false)} />}

        <main className="mx-auto max-w-6xl px-4 py-6">
          <div
            key={tab}
            role="tabpanel"
            id={`panel-${tab}`}
            aria-labelledby={`tab-${tab}`}
            tabIndex={0}
            className="animate-fadeIn focus-visible:outline-none"
          >
            {tab === "analysis" && (
              <AnalysisTab onGotoCase={gotoCase} onOpenRefs={() => setShowRefs(true)} />
            )}
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
            {tab === "experiment" && (
              <ExperimentTab onOpenProof={() => setShowProof(true)} />
            )}
          </div>
        </main>

        <footer className="mx-auto hidden max-w-6xl px-4 pb-8 pt-2 lg:block">
          <p className="text-center text-xs text-slate-400">
            공모전 발표용 인터랙티브 데모 · 합성 데이터 기반 · 발굴 성능 증명이
            아닌 파이프라인·UX 시연
          </p>
        </footer>

        <BottomNav items={TABS} active={tab} onChange={setTab} />
      </div>
    </CaseStateProvider>
  );
}

function ProfileMenu() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const logoutRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (open) logoutRef.current?.focus();
  }, [open]);
  if (!user) return null;

  function close(returnFocus = true) {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }

  return (
    <div
      className="relative shrink-0"
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          e.stopPropagation();
          close();
        }
      }}
    >
      <button
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`${user.name} 프로필 메뉴`}
        className="flex items-center gap-1.5 rounded px-1 py-0.5 text-[11px] transition-colors hover:bg-slate-100"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-700">
          {user.initial}
        </span>
        <span className="hidden font-semibold text-slate-600 sm:inline">
          {user.dept} · {user.name}
        </span>
        <ChevronDown size={12} className="text-slate-400" />
      </button>

      {open && (
        <>
          <button
            className="fixed inset-0 z-40 cursor-default"
            aria-hidden
            tabIndex={-1}
            onClick={() => close(false)}
          />
          <div className="absolute right-0 top-full z-50 mt-1.5 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card-hover animate-popIn">
            <div className="border-b border-slate-100 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700 ring-1 ring-brand-200">
                  {user.initial}
                </div>
                <div className="leading-tight">
                  <div className="text-sm font-semibold text-slate-800">{user.name}</div>
                  <div className="text-[11px] text-slate-400">{user.role}</div>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
                <Lock size={11} /> {user.dept} · {user.regionLabel}
              </div>
            </div>
            <button
              ref={logoutRef}
              onClick={() => {
                close(false);
                signOut();
              }}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600"
            >
              <LogOut size={15} /> 로그아웃
            </button>
          </div>
        </>
      )}
    </div>
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
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (blurTimer.current) clearTimeout(blurTimer.current);
    },
    []
  );

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
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
      />
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (blurTimer.current) clearTimeout(blurTimer.current);
          setOpen(true);
        }}
        onBlur={() => {
          blurTimer.current = setTimeout(() => setOpen(false), 150);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && q.trim()) {
            onSubmit(q.trim());
            setOpen(false);
            (e.target as HTMLInputElement).blur();
          }
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder="대상자 ID·행정동 검색"
        aria-label="대상자 ID 또는 행정동 검색"
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-controls="global-search-results"
        aria-autocomplete="list"
        className="w-full rounded-lg border border-slate-200 bg-slate-50/80 py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus-visible:border-brand-400 focus-visible:bg-white"
      />
      <div role="status" aria-live="polite" className="sr-only">
        {q.trim() ? `검색 결과 ${results.length}건` : ""}
      </div>
      {open && results.length > 0 && (
        <div
          id="global-search-results"
          role="listbox"
          aria-label="검색 결과"
          className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card-hover animate-popIn"
        >
          {results.map((h) => (
            <button
              key={h.id}
              role="option"
              aria-selected={false}
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
  tabKey,
  active,
  onClick,
  icon,
  label,
  star,
}: {
  tabKey: string;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  star?: boolean;
}) {
  return (
    <button
      id={`tab-${tabKey}`}
      onClick={onClick}
      role="tab"
      aria-selected={active}
      aria-controls={`panel-${tabKey}`}
      tabIndex={active ? 0 : -1}
      className={`-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors duration-150 ${
        active
          ? "border-brand-500 text-brand-600"
          : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800"
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
      aria-label={label}
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
