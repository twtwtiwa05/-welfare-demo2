import { useEffect, useState } from "react";
import { Share, SquarePlus, X, Smartphone } from "lucide-react";
import BottomSheet from "./BottomSheet";

// PWA 설치 유도 — 플랫폼별로 갈린다.
//  · 안드로이드/데스크톱 크롬: beforeinstallprompt → 원탭 설치
//  · iOS Safari: beforeinstallprompt 미지원 → "공유 → 홈 화면에 추가" 안내 시트
//  · 이미 설치(standalone)면 아무것도 안 보임. 닫으면 다시 안 나옴(localStorage).

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

const DISMISS_KEY = "eum.install.dismissed";

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari 전용 속성
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export default function InstallPrompt() {
  const [installEvt, setInstallEvt] = useState<BIPEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [iosGuideOpen, setIosGuideOpen] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvt(e as BIPEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (dismissed || isStandalone()) return null;

  const ios = isIOS();
  // 안드로이드인데 아직 설치 이벤트가 안 왔으면 배너를 띄우지 않는다(설치 불가 상태에서 소음 금지)
  if (!ios && !installEvt) return null;

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* noop */
    }
  }

  return (
    <>
      <div className="flex items-center gap-2 border-b border-brand-100 bg-brand-50 py-1.5 pl-4 pr-1.5 dark:border-brand-900 dark:bg-brand-950/50">
        <Smartphone size={16} className="shrink-0 text-brand-600 dark:text-brand-300" aria-hidden />
        <span className="flex-1 text-xs leading-snug text-brand-800 dark:text-brand-200">
          홈 화면에 추가하면 앱처럼 바로 열 수 있어요.
        </span>
        <button
          onClick={async () => {
            if (ios) {
              setIosGuideOpen(true);
              return;
            }
            if (installEvt) {
              await installEvt.prompt();
              setInstallEvt(null);
            }
          }}
          className="press min-h-[2.75rem] shrink-0 rounded-md bg-brand-600 px-3.5 text-xs font-bold text-white active:bg-brand-700"
        >
          {ios ? "방법 보기" : "설치"}
        </button>
        <button
          onClick={dismiss}
          aria-label="설치 안내 닫기"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-brand-400 active:bg-brand-100 dark:active:bg-brand-900"
        >
          <X size={16} aria-hidden />
        </button>
      </div>

      {iosGuideOpen && (
        <BottomSheet title="홈 화면에 추가" onClose={() => setIosGuideOpen(false)}>
          <div className="px-4 py-4">
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              iPhone·iPad의 Safari에서는 아래 두 단계로 설치돼요. 설치하면 전체
              화면 앱으로 열리고, 통신이 약한 현장에서도 명단을 볼 수 있습니다.
            </p>
            <ol className="mt-4 space-y-3">
              <li className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-night-700 dark:bg-night-800/70">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500 text-white">
                  <Share size={18} aria-hidden />
                </span>
                <span className="text-sm text-slate-700 dark:text-slate-200">
                  <b>1.</b> 하단 툴바의 <b>공유</b> 버튼을 누르세요
                </span>
              </li>
              <li className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-night-700 dark:bg-night-800/70">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500 text-white">
                  <SquarePlus size={18} aria-hidden />
                </span>
                <span className="text-sm text-slate-700 dark:text-slate-200">
                  <b>2.</b> <b>"홈 화면에 추가"</b>를 선택하고 <b>추가</b>를
                  누르세요
                </span>
              </li>
            </ol>
            <button
              onClick={() => setIosGuideOpen(false)}
              className="btn-primary mt-4 w-full !py-2.5"
            >
              확인했어요
            </button>
          </div>
        </BottomSheet>
      )}
    </>
  );
}
