import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Route as RouteIcon,
  LayoutList,
  Bell,
  ShieldCheck,
  LogOut,
  X,
  Zap,
  Download,
  ChevronRight,
  Siren,
} from "lucide-react";
import { useAuth } from "../../lib/auth";
import { useCaseState } from "../../lib/caseState";
import { regionCandidates } from "../../lib/mobileData";
import { isRapidDecline } from "../../lib/ml";
import { computeScore } from "../../lib/scoring";
import MobileVisit from "./MobileVisit";
import MobileCases from "./MobileCases";
import MobileCaseDetail from "./MobileCaseDetail";
import BottomSheet from "./BottomSheet";

type MTab = "visit" | "cases";

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

// 모바일 현장앱 셸 — 데스크톱(발표용 4탭)과 완전히 분리된 2탭 현장 도구.
// 방문계획(오늘의 동선) + 케이스(목록→상세). 내 담당 권역·알림·앱 설치 포함.
export default function MobileShell() {
  const { user, signOut } = useAuth();
  const { emergencyIds } = useCaseState();
  const region = user?.region ?? "전체";
  const hasRegion = region !== "전체";

  const [tab, setTab] = useState<MTab>("visit");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [myOnly, setMyOnly] = useState(hasRegion);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [installEvt, setInstallEvt] = useState<BIPEvent | null>(null);
  const [installDismissed, setInstallDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvt(e as BIPEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const rapidNew = useMemo(
    () => regionCandidates(region, myOnly).filter(isRapidDecline),
    [region, myOnly]
  );

  // 풀스크린 상세
  if (detailId) {
    return <MobileCaseDetail id={detailId} onBack={() => setDetailId(null)} />;
  }

  const title = tab === "visit" ? "오늘의 방문" : "케이스";

  function openCase(id: string) {
    setNotifOpen(false);
    setDetailId(id);
  }

  return (
    <div className="min-h-screen pb-[calc(4.75rem+env(safe-area-inset-bottom))]">
      {/* 상단 앱바 */}
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/90 backdrop-blur-md">
        <div className="flex items-center gap-2.5 px-4 py-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 text-white">
            <ShieldCheck size={18} strokeWidth={2.2} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-bold leading-tight text-slate-800">{title}</div>
            <div className="truncate text-[11px] text-slate-400">
              {user?.dept} · {myOnly && hasRegion ? user?.regionLabel : "전 권역"}
            </div>
          </div>
          <button
            onClick={() => setNotifOpen(true)}
            aria-label={`알림 ${rapidNew.length}건`}
            aria-haspopup="dialog"
            aria-expanded={notifOpen}
            className="relative flex h-11 w-11 items-center justify-center rounded-full text-slate-500 active:bg-slate-100"
          >
            <Bell size={20} aria-hidden />
            {rapidNew.length > 0 && (
              <span
                aria-hidden="true"
                className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white"
              >
                {rapidNew.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setProfileOpen(true)}
            aria-label="프로필 메뉴"
            aria-haspopup="dialog"
            aria-expanded={profileOpen}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700 ring-1 ring-brand-200"
          >
            {user?.initial}
          </button>
        </div>

        {/* 내 담당 권역 세그먼트 */}
        {hasRegion && (
          <div role="radiogroup" aria-label="권역 필터" className="flex gap-1 px-4 pb-2">
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
        {emergencyIds.length > 0 ? `긴급 SOS ${emergencyIds.length}건 발생, 명단 확인 필요` : ""}
      </div>

      {/* 긴급 SOS 알림 배너 */}
      {emergencyIds.length > 0 && (
        <button
          onClick={() => setTab("cases")}
          className="flex w-full items-center gap-2 bg-red-600 px-4 py-3 text-left text-white active:bg-red-700"
        >
          <Siren size={18} className="shrink-0 animate-pulse" aria-hidden />
          <span className="flex-1 text-sm font-bold">
            긴급 SOS {emergencyIds.length}건 — 명단 확인
          </span>
          <ChevronRight size={18} className="shrink-0" aria-hidden />
        </button>
      )}

      {/* 앱 설치 배너 */}
      {installEvt && !installDismissed && (
        <div className="flex items-center gap-2 border-b border-brand-100 bg-brand-50 px-4 py-2.5 text-xs text-brand-800">
          <Download size={16} className="shrink-0 text-brand-600" />
          <span className="flex-1 leading-snug">
            홈 화면에 추가하면 앱처럼 바로 열 수 있어요.
          </span>
          <button
            onClick={async () => {
              await installEvt.prompt();
              setInstallEvt(null);
            }}
            className="rounded-lg bg-brand-600 px-2.5 py-1 text-[11px] font-bold text-white"
          >
            설치
          </button>
          <button
            onClick={() => setInstallDismissed(true)}
            aria-label="설치 안내 닫기"
            className="text-brand-400"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <main className="py-3">
        {tab === "visit" ? (
          <MobileVisit region={region} myOnly={myOnly} onOpenCase={setDetailId} />
        ) : (
          <MobileCases region={region} myOnly={myOnly} onOpenCase={setDetailId} />
        )}
      </main>

      {/* 하단 탭바 (2탭) */}
      <nav
        aria-label="하단 탭"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md"
      >
        <div className="mx-auto grid max-w-md grid-cols-2">
          <TabBtn
            active={tab === "visit"}
            onClick={() => setTab("visit")}
            icon={<RouteIcon size={20} aria-hidden />}
            label="방문계획"
          />
          <TabBtn
            active={tab === "cases"}
            onClick={() => setTab("cases")}
            icon={<LayoutList size={20} aria-hidden />}
            label="케이스"
          />
        </div>
      </nav>

      {/* 프로필 시트 */}
      {profileOpen && (
        <BottomSheet title="내 계정" onClose={() => setProfileOpen(false)}>
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-lg font-bold text-brand-700 ring-1 ring-brand-200">
              {user?.initial}
            </div>
            <div>
              <div className="text-base font-bold text-slate-800">{user?.name}</div>
              <div className="text-xs text-slate-400">
                {user?.role} · {user?.regionLabel}
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              setProfileOpen(false);
              signOut();
            }}
            className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-3.5 text-left text-sm font-semibold text-slate-600 active:bg-red-50"
          >
            <LogOut size={16} aria-hidden /> 로그아웃
          </button>
        </BottomSheet>
      )}

      {/* 알림 시트 — 권역 내 급속악화 신규 */}
      {notifOpen && (
        <BottomSheet title={`급속악화 ${rapidNew.length}건`} onClose={() => setNotifOpen(false)}>
          {rapidNew.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-400">
              새 급속악화 알림이 없습니다.
            </p>
          ) : (
            <ul className="max-h-[50vh] overflow-auto">
              {rapidNew.map((h) => {
                const score = computeScore(h.signals, h.profileGroup).score;
                return (
                  <li key={h.id}>
                    <button
                      onClick={() => openCase(h.id)}
                      className="flex w-full items-center gap-3 border-t border-slate-100 px-4 py-3 text-left active:bg-slate-50"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                        <Zap size={15} aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="font-mono text-sm font-semibold text-slate-800">
                          {h.id} <span className="font-sans text-xs text-slate-400">{h.dong}</span>
                        </div>
                        <div className="text-xs text-slate-500">
                          위험 {score}점 · 다변량 급속악화 감지
                        </div>
                      </div>
                      <ChevronRight size={18} className="shrink-0 text-slate-300" aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="border-t border-slate-100 px-4 py-2.5 text-[11px] leading-relaxed text-slate-400">
            ML이 다변량 궤적에서 급속악화를 선별합니다. 방문·판정은 담당자가 결정합니다.
          </p>
        </BottomSheet>
      )}
    </div>
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
      className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors ${
        active ? "bg-brand-600 text-white shadow-sm" : "bg-slate-100 text-slate-500"
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
      className={`relative flex min-h-[60px] flex-col items-center justify-center gap-1 text-[12px] font-semibold transition-colors ${
        active ? "text-brand-700" : "text-slate-400"
      }`}
    >
      {active && <span className="absolute top-0 h-0.5 w-10 rounded-full bg-brand-600" />}
      {icon}
      {label}
    </button>
  );
}

