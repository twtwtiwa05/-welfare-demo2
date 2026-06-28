import { useEffect, useMemo, useRef, useState } from "react";
import AnalysisTab from "./components/analysis/AnalysisTab";
import UtilizationTab from "./components/utilization/UtilizationTab";
import VisitTab from "./components/visit/VisitTab";
import CaseBoard from "./components/caseboard/CaseBoard";
import IntroHook from "./components/IntroHook";
import ProofBoundary from "./components/ProofBoundary";
import References from "./components/References";
import RiskBadge from "./components/RiskBadge";
import BottomNav, { type BottomNavItem } from "./components/BottomNav";
import LoginScreen from "./components/auth/LoginScreen";
import { CaseStateProvider } from "./lib/caseState";
import { useAuth } from "./lib/auth";
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
  BookOpen,
  LogOut,
  ChevronDown,
} from "lucide-react";

type Tab = "analysis" | "utilization" | "visit" | "caseboard";

const TABS: BottomNavItem<Tab>[] = [
  { key: "analysis", label: "분석", icon: <Layers size={16} /> },
  { key: "utilization", label: "활용도", icon: <Sparkles size={16} />, star: true },
  { key: "visit", label: "방문계획", icon: <Route size={16} />, star: true },
  { key: "caseboard", label: "케이스", icon: <LayoutDashboard size={16} /> },
];

const RESIDUAL = HOUSEHOLDS.filter((h) => !h.haengbokFlagged);
const sc = (h: Household) => computeScore(h.signals, h.profileGroup).score;

export default function App() {
  const { user } = useAuth();
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

  const activeTabLabel = TABS.find((t) => t.key === tab)?.label ?? "";

  return (
    <CaseStateProvider>
      <div className="min-h-screen pb-16 lg:pb-0">
        <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 shadow-header backdrop-blur-md">
          <div className="mx-auto max-w-6xl px-4">
            {/* 상단 줄: 로고 · 검색 · 프로필 */}
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
                    점수는 투명 공식 · 근거는 자동 서술 · 결정은 사람
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
              </div>
              <ProfileMenu />
            </div>

            {/* 하단 줄: 탭(데스크톱) + 정보 토글 */}
            <div className="flex items-center justify-between gap-2 pb-2">
              <nav
                className="hidden gap-1 overflow-x-auto lg:flex"
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
              <span className="text-sm font-bold text-slate-700 lg:hidden">
                {activeTabLabel}
              </span>
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
        className="flex items-center gap-2 rounded-full border border-transparent py-1 pl-1 pr-1 transition-colors hover:border-slate-200 hover:bg-slate-50 lg:border-l lg:border-l-slate-200 lg:pl-3"
      >
        <div className="hidden text-right leading-tight lg:block">
          <div className="text-[13px] font-semibold text-slate-700">{user.dept}</div>
          <div className="text-[11px] text-slate-400">
            {user.name} · {user.regionLabel}
          </div>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700 ring-1 ring-brand-200">
          {user.initial}
        </div>
        <ChevronDown size={14} className="hidden text-slate-400 lg:block" />
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
