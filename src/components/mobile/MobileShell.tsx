import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Route as RouteIcon,
  LayoutList,
  Bell,
  ShieldCheck,
  LogOut,
  Zap,
  ChevronRight,
  Siren,
  RefreshCw,
  Monitor,
  Sun,
  Moon,
} from "lucide-react";
import { useAuth } from "../../lib/auth";
import { useTheme, type ThemeMode, type FontScale } from "../../lib/theme";
import { useCaseState } from "../../lib/caseState";
import { regionCandidates } from "../../lib/mobileData";
import { isRapidDecline } from "../../lib/ml";
import { computeScore } from "../../lib/scoring";
import { loadLastSync, stampLastSync } from "../../lib/visitLog";
import { radioGroupNav } from "../../lib/radioNav";
import MobileVisit from "./MobileVisit";
import MobileCases from "./MobileCases";
import MobileCaseDetail from "./MobileCaseDetail";
import BottomSheet from "./BottomSheet";
import InstallPrompt from "./InstallPrompt";

type MTab = "visit" | "cases";

// 모바일 현장앱 셸 — 데스크톱(발표용)과 분리된 2탭 현장 도구.
// 정보 위계: ① 긴급 SOS(발생 시에만) ② 오늘 할 일(콘텐츠) ③ 보조(알림·설정).
export default function MobileShell() {
  const { user } = useAuth();
  const { emergencyIds } = useCaseState();
  const region = user?.region ?? "전체";
  const hasRegion = region !== "전체";

  const [tab, setTab] = useState<MTab>("visit");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [myOnly, setMyOnly] = useState(hasRegion);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [lastSync, setLastSync] = useState(loadLastSync);
  const [refreshing, setRefreshing] = useState(false);
  const [pull, setPull] = useState(0);
  const startY = useRef<number | null>(null);

  const rapidNew = useMemo(
    () => regionCandidates(region, myOnly).filter(isRapidDecline),
    [region, myOnly]
  );

  // pull-to-refresh — 데이터 최신성 신뢰감(마지막 동기화 갱신)
  function doRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    window.setTimeout(() => {
      setLastSync(stampLastSync());
      setRefreshing(false);
      setPull(0);
    }, 750);
  }
  function onTouchStart(e: React.TouchEvent) {
    // 시트·지도·내부 스크롤 영역에서 시작한 제스처는 PTR 대상이 아니다(오발동 방지)
    const t = e.target as HTMLElement;
    if (
      window.scrollY > 0 ||
      t.closest('[role="dialog"], .leaflet-container, .overflow-auto, .overflow-x-auto')
    ) {
      startY.current = null;
      return;
    }
    startY.current = e.touches[0].clientY;
  }
  function onTouchMove(e: React.TouchEvent) {
    if (startY.current === null || refreshing) return;
    const dy = e.touches[0].clientY - startY.current;
    setPull(dy > 0 ? Math.min(88, dy * 0.4) : 0);
  }
  function onTouchEnd() {
    if (startY.current !== null && pull > 52) doRefresh();
    else setPull(0);
    startY.current = null;
  }
  function onTouchCancel() {
    // 네이티브 스크롤/전화 수신 등으로 제스처가 중단되면 상태를 깨끗이 리셋
    setPull(0);
    startY.current = null;
  }

  // 풀스크린 상세 (푸시 화면)
  if (detailId) {
    return <MobileCaseDetail id={detailId} onBack={() => setDetailId(null)} />;
  }

  const title = tab === "visit" ? "오늘의 방문" : "케이스";

  function openCase(id: string) {
    setNotifOpen(false);
    setDetailId(id);
  }

  return (
    <div
      className="min-h-screen pb-[calc(4.75rem+env(safe-area-inset-bottom))]"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchCancel}
    >
      {/* 상단 앱바 */}
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/90 pt-[env(safe-area-inset-top)] backdrop-blur-md dark:border-night-700 dark:bg-night-900/90">
        <div className="flex items-center gap-2.5 px-4 py-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-500 text-white">
            <ShieldCheck size={18} strokeWidth={2.2} aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-[1rem] font-bold leading-tight text-slate-900 dark:text-slate-100">
              {title}
            </h1>
            <p className="truncate text-[0.7rem] text-slate-400 dark:text-slate-500">
              {user?.dept} · {myOnly && hasRegion ? user?.regionLabel : "전 권역"}
            </p>
          </div>
          <button
            onClick={() => setNotifOpen(true)}
            aria-label={`급속악화 알림 ${rapidNew.length}건`}
            aria-haspopup="dialog"
            aria-expanded={notifOpen}
            className="press relative flex h-11 w-11 items-center justify-center rounded-full text-slate-500 active:bg-slate-100 dark:text-slate-400 dark:active:bg-night-800"
          >
            <Bell size={20} aria-hidden />
            {rapidNew.length > 0 && (
              <span
                aria-hidden="true"
                className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-500 px-1 text-[10px] font-bold text-white"
              >
                {rapidNew.length > 9 ? "9+" : rapidNew.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setProfileOpen(true)}
            aria-label="내 계정·설정"
            aria-haspopup="dialog"
            aria-expanded={profileOpen}
            className="press flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700 ring-1 ring-brand-200 dark:bg-brand-900/60 dark:text-brand-200 dark:ring-brand-800"
          >
            {user?.initial}
          </button>
        </div>

        {/* 내 담당 권역 세그먼트 */}
        {hasRegion && (
          <div
            role="radiogroup"
            aria-label="권역 필터"
            onKeyDown={radioGroupNav}
            className="flex gap-1 rounded-none px-4 pb-2.5"
          >
            <Seg active={myOnly} onClick={() => setMyOnly(true)}>
              내 담당 · {region}
            </Seg>
            <Seg active={!myOnly} onClick={() => setMyOnly(false)}>
              전 권역
            </Seg>
          </div>
        )}
      </header>

      {/* 긴급 발생 음성 안내 (스크린리더) */}
      <div className="sr-only" role="status" aria-live="assertive">
        {emergencyIds.length > 0
          ? `긴급 SOS ${emergencyIds.length}건 발생, 명단 확인 필요`
          : ""}
      </div>

      {/* 긴급 SOS 알림 배너 — 발생 시에만, 화면 최상위 위계 */}
      {emergencyIds.length > 0 && (
        <button
          onClick={() => setTab("cases")}
          className="flex w-full items-center gap-2 bg-danger-500 px-4 py-3 text-left text-white active:bg-danger-700"
        >
          <Siren size={18} className="shrink-0 animate-pulse" aria-hidden />
          <span className="flex-1 text-sm font-bold">
            긴급 SOS {emergencyIds.length}건 — 명단 확인
          </span>
          <ChevronRight size={18} className="shrink-0" aria-hidden />
        </button>
      )}

      {/* 앱 설치 유도 (안드로이드 원탭 / iOS 안내) */}
      <InstallPrompt />

      {/* pull-to-refresh 인디케이터 — 드래그 중엔 손가락을 그대로 따라오고, 놓으면 스프링 복귀 */}
      <div
        aria-hidden={pull === 0 && !refreshing}
        className={`flex items-end justify-center overflow-hidden ${
          refreshing || pull === 0 ? "transition-[height] duration-200" : ""
        }`}
        style={{ height: refreshing ? 44 : pull }}
      >
        <RefreshCw
          size={18}
          aria-hidden
          className={`mb-3 text-brand-500 ${refreshing ? "animate-spin" : ""}`}
          style={refreshing ? undefined : { transform: `rotate(${pull * 3.2}deg)` }}
        />
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {refreshing ? "데이터 새로고침 중" : ""}
      </p>

      {/* 마지막 동기화 — 데이터 최신성. 탭하면 수동 새로고침 */}
      <div className="flex justify-center pt-2.5">
        <button
          onClick={doRefresh}
          className="inline-flex min-h-[2.25rem] items-center gap-1.5 rounded-full px-3 py-1 text-[0.7rem] font-medium text-slate-500 active:bg-slate-100 dark:text-slate-400 dark:active:bg-night-800"
          aria-label={`마지막 동기화 ${lastSync}. 탭하면 새로고침`}
        >
          <RefreshCw size={11} aria-hidden className={refreshing ? "animate-spin" : ""} />
          마지막 동기화 {lastSync} · 당겨서 새로고침
        </button>
      </div>

      <main className="pb-3 pt-2">
        {tab === "visit" ? (
          <MobileVisit region={region} myOnly={myOnly} onOpenCase={setDetailId} />
        ) : (
          <MobileCases region={region} myOnly={myOnly} onOpenCase={setDetailId} />
        )}
      </main>

      {/* 하단 탭바 (2탭) */}
      <nav
        aria-label="하단 탭"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md dark:border-night-700 dark:bg-night-900/95"
      >
        <div className="mx-auto grid max-w-md grid-cols-2">
          <TabBtn
            active={tab === "visit"}
            onClick={() => setTab("visit")}
            icon={<RouteIcon size={21} aria-hidden />}
            label="방문계획"
          />
          <TabBtn
            active={tab === "cases"}
            onClick={() => setTab("cases")}
            icon={<LayoutList size={21} aria-hidden />}
            label="케이스"
          />
        </div>
      </nav>

      {/* 내 계정·설정 시트 */}
      {profileOpen && (
        <BottomSheet title="내 계정·설정" onClose={() => setProfileOpen(false)}>
          <AccountSettings onSignOut={() => setProfileOpen(false)} />
        </BottomSheet>
      )}

      {/* 알림 시트 — 권역 내 급속악화 신규 */}
      {notifOpen && (
        <BottomSheet
          title={`급속악화 ${rapidNew.length}건`}
          onClose={() => setNotifOpen(false)}
        >
          {rapidNew.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-400 dark:text-slate-500">
              새 급속악화 알림이 없습니다.
            </p>
          ) : (
            <ul className="max-h-[50vh] overflow-auto">
              {rapidNew.map((h, i) => {
                const score = computeScore(h.signals, h.profileGroup).score;
                return (
                  <li key={h.id}>
                    <button
                      onClick={() => openCase(h.id)}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left active:bg-slate-50 dark:active:bg-night-800 ${
                        i > 0 ? "border-t border-slate-100 dark:border-night-700" : ""
                      }`}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-danger-50 text-danger-500 dark:bg-danger-500/15 dark:text-danger-300">
                        <Zap size={16} aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-mono text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {h.id}{" "}
                          <span className="font-sans text-xs font-normal text-slate-400 dark:text-slate-500">
                            {h.dong}
                          </span>
                        </span>
                        <span className="block text-xs text-slate-500 dark:text-slate-400">
                          위험 {score}점 · 다변량 급속악화 감지
                        </span>
                      </span>
                      <ChevronRight
                        size={18}
                        className="shrink-0 text-slate-300 dark:text-night-600"
                        aria-hidden
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="border-t border-slate-100 px-4 py-2.5 text-[0.7rem] leading-relaxed text-slate-400 dark:border-night-700 dark:text-slate-500">
            ML이 다변량 궤적에서 급속악화를 선별합니다. 방문·판정은 담당자가
            결정합니다.
          </p>
        </BottomSheet>
      )}
    </div>
  );
}

// ── 내 계정 + 화면 설정 (다크모드 · 글자 크기) ─────────────────────
function AccountSettings({ onSignOut }: { onSignOut: () => void }) {
  const { user, signOut } = useAuth();
  const { mode, setMode, fontScale, setFontScale } = useTheme();

  const MODES: { key: ThemeMode; label: string; icon: ReactNode }[] = [
    { key: "system", label: "시스템", icon: <Monitor size={14} aria-hidden /> },
    { key: "light", label: "라이트", icon: <Sun size={14} aria-hidden /> },
    { key: "dark", label: "다크", icon: <Moon size={14} aria-hidden /> },
  ];
  const FONTS: { key: FontScale; label: string }[] = [
    { key: "base", label: "기본" },
    { key: "lg", label: "크게" },
  ];

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-3.5">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-lg font-bold text-brand-700 ring-1 ring-brand-200 dark:bg-brand-900/60 dark:text-brand-200 dark:ring-brand-800">
          {user?.initial}
        </div>
        <div>
          <div className="text-base font-bold text-slate-800 dark:text-slate-100">
            {user?.name}
          </div>
          <div className="text-xs text-slate-400 dark:text-slate-500">
            {user?.role} · {user?.regionLabel}
          </div>
        </div>
      </div>

      <div className="space-y-3.5 border-t border-slate-100 px-4 py-3.5 dark:border-night-700">
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              화면 모드
            </span>
          </div>
          <div
            role="radiogroup"
            aria-label="화면 모드"
            onKeyDown={radioGroupNav}
            className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1 dark:bg-night-800"
          >
            {MODES.map((m) => (
              <button
                key={m.key}
                role="radio"
                aria-checked={mode === m.key}
                tabIndex={mode === m.key ? 0 : -1}
                onClick={() => setMode(m.key)}
                className={`flex min-h-[2.25rem] items-center justify-center gap-1.5 rounded-md text-xs font-semibold transition-colors ${
                  mode === m.key
                    ? "bg-white text-slate-800 shadow-sm ring-1 ring-slate-200 dark:bg-night-600 dark:text-slate-100 dark:ring-night-600"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                {m.icon}
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-semibold text-slate-500 dark:text-slate-400">
            글자 크기
          </span>
          <div
            role="radiogroup"
            aria-label="글자 크기"
            onKeyDown={radioGroupNav}
            className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1 dark:bg-night-800"
          >
            {FONTS.map((f) => (
              <button
                key={f.key}
                role="radio"
                aria-checked={fontScale === f.key}
                tabIndex={fontScale === f.key ? 0 : -1}
                onClick={() => setFontScale(f.key)}
                className={`min-h-[2.25rem] rounded-md text-xs font-semibold transition-colors ${
                  fontScale === f.key
                    ? "bg-white text-slate-800 shadow-sm ring-1 ring-slate-200 dark:bg-night-600 dark:text-slate-100 dark:ring-night-600"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={() => {
          onSignOut();
          signOut();
        }}
        className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-3.5 text-left text-sm font-semibold text-slate-600 active:bg-red-50 dark:border-night-700 dark:text-slate-300 dark:active:bg-danger-500/10"
      >
        <LogOut size={16} aria-hidden /> 로그아웃
      </button>
    </>
  );
}

function Seg({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      role="radio"
      aria-checked={active}
      tabIndex={active ? 0 : -1}
      className={`press min-h-[2.25rem] flex-1 rounded-md text-xs font-semibold transition-colors ${
        active
          ? "bg-brand-600 text-white shadow-sm"
          : "bg-slate-100 text-slate-500 dark:bg-night-800 dark:text-slate-400"
      }`}
    >
      {children}
    </button>
  );
}

function TabBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`press relative flex min-h-[3.75rem] flex-col items-center justify-center gap-1 text-[0.75rem] font-semibold transition-colors ${
        active
          ? "text-brand-600 dark:text-brand-300"
          : "text-slate-400 dark:text-slate-500"
      }`}
    >
      {active && (
        <span
          aria-hidden
          className="absolute top-0 h-0.5 w-10 rounded-full bg-brand-600 dark:bg-brand-400"
        />
      )}
      {icon}
      {label}
    </button>
  );
}
