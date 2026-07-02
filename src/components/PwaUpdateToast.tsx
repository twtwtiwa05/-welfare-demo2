import { useEffect, useRef, useState } from "react";
import { RefreshCw, WifiOff, X } from "lucide-react";
import { registerSW } from "virtual:pwa-register";

// PWA 생명주기 토스트 — ① 새 배포 감지 시 "업데이트" 안내(prompt 방식),
// ② 최초 프리캐시 완료 시 "오프라인 열람 가능" 안내(잠깐 표시 후 사라짐).
export default function PwaUpdateToast() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const updateRef = useRef<((reload?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        setNeedRefresh(true);
      },
      onOfflineReady() {
        setOfflineReady(true);
        window.setTimeout(() => setOfflineReady(false), 5000);
      },
    });
    updateRef.current = updateSW;
  }, []);

  // 라이브리전은 콘텐츠보다 먼저 DOM에 존재해야 스크린리더가 변경을 낭독한다 — 항상 마운트
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-[70] flex justify-center px-4"
    >
      {needRefresh && (
        <div className="flex w-full max-w-md items-center gap-2 rounded-lg border border-slate-200 bg-white py-1.5 pl-3.5 pr-1.5 shadow-card-hover animate-popIn dark:border-night-600 dark:bg-night-800">
          <RefreshCw size={16} className="shrink-0 text-brand-500" aria-hidden />
          <span className="flex-1 text-xs font-medium text-slate-700 dark:text-slate-200">
            새 버전이 준비됐어요.
          </span>
          <button
            onClick={() => updateRef.current?.(true)}
            className="press min-h-[2.75rem] shrink-0 rounded-md bg-brand-500 px-3.5 text-xs font-bold text-white active:bg-brand-700"
          >
            업데이트
          </button>
          <button
            onClick={() => setNeedRefresh(false)}
            aria-label="업데이트 안내 닫기"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-slate-400 active:bg-slate-100 dark:active:bg-night-700"
          >
            <X size={15} aria-hidden />
          </button>
        </div>
      )}
      {!needRefresh && offlineReady && (
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 shadow-card-hover animate-popIn dark:border-night-600 dark:bg-night-800">
          <WifiOff size={14} className="shrink-0 text-success-500" aria-hidden />
          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
            저장 완료 — 오프라인에서도 명단을 볼 수 있어요
          </span>
        </div>
      )}
    </div>
  );
}
