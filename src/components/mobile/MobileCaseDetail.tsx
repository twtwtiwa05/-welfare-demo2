import { useState } from "react";
import {
  ArrowLeft,
  Siren,
  Phone,
  MessageSquare,
  Navigation,
} from "lucide-react";
import { getHousehold } from "../../lib/data";
import { computeScore } from "../../lib/scoring";
import { caseMeta } from "../../lib/caseMeta";
import { useCaseState } from "../../lib/caseState";
import { mapRouteUrl } from "../../lib/geo";
import RiskBadge from "../RiskBadge";
import CaseDetail from "../CaseDetail";
import MobileSosSheet from "./MobileSosSheet";

// 모바일 케이스 상세 — 풀스크린 푸시 화면(뒤로가기) + 하단 원탭 액션 바.
// 액션 위계: 전화(主) > 문자·길찾기(보조) > 긴급 SOS(위급 시).
export default function MobileCaseDetail({
  id,
  onBack,
}: {
  id: string;
  onBack: () => void;
}) {
  const { isEmergency, setEmergency } = useCaseState();
  const [sosOpen, setSosOpen] = useState(false);
  const h = getHousehold(id);
  if (!h) return null;
  const score = computeScore(h.signals, h.profileGroup).score;
  const meta = caseMeta(h, score);
  const emerg = isEmergency(id);
  const tel = "010-0000-" + meta.maskedPhone.slice(-4);

  return (
    <div className="min-h-screen animate-slideIn bg-slate-50 dark:bg-night-900">
      <header
        className={`sticky top-0 z-30 flex items-center gap-2 border-b px-3 py-2.5 pt-[calc(0.625rem+env(safe-area-inset-top))] backdrop-blur-md ${
          emerg
            ? "border-danger-500/40 bg-danger-50/95 dark:border-danger-500/50 dark:bg-night-900/95"
            : "border-slate-200 bg-white/95 dark:border-night-700 dark:bg-night-900/95"
        }`}
      >
        <button
          onClick={onBack}
          aria-label="목록으로 돌아가기"
          className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-slate-600 transition-colors active:bg-slate-100 dark:text-slate-300 dark:active:bg-night-800"
        >
          <ArrowLeft size={20} aria-hidden />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h1 className="font-mono text-[0.95rem] font-bold leading-tight text-slate-800 dark:text-slate-100">
              {h.id}
            </h1>
            {emerg && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-danger-500 px-1.5 py-0.5 text-[0.65rem] font-bold text-white">
                <Siren size={9} aria-hidden /> 긴급 SOS
              </span>
            )}
          </div>
          <div className="text-[0.7rem] text-slate-400 dark:text-slate-500">
            {h.dong} · {h.ageBand} · {h.sex === "F" ? "여" : "남"}
          </div>
        </div>
        <RiskBadge score={score} size="sm" />
      </header>

      <div className="p-3 pb-32">
        <CaseDetail household={h} />
      </div>

      {/* 하단 고정 원탭 액션 바 */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-md dark:border-night-700 dark:bg-night-900/95">
        <div className="mx-auto flex max-w-md items-stretch gap-2">
          <a
            href={`tel:${tel}`}
            className="press flex min-h-[3rem] flex-1 items-center justify-center gap-2 rounded-md bg-brand-500 text-[0.95rem] font-bold text-white active:bg-brand-700"
          >
            <Phone size={18} aria-hidden /> 전화
          </a>
          <a
            href={`sms:${tel}`}
            aria-label="문자 보내기"
            className="press flex min-h-[3rem] w-12 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 active:bg-slate-50 dark:border-night-600 dark:bg-night-800 dark:text-slate-300 dark:active:bg-night-700"
          >
            <MessageSquare size={18} aria-hidden />
          </a>
          <a
            href={mapRouteUrl(h)}
            target="_blank"
            rel="noreferrer"
            aria-label="길찾기 — 외부 지도 앱(예시 위치)"
            className="press flex min-h-[3rem] w-12 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 active:bg-slate-50 dark:border-night-600 dark:bg-night-800 dark:text-slate-300 dark:active:bg-night-700"
          >
            <Navigation size={18} aria-hidden />
          </a>
          <button
            onClick={() => setSosOpen(true)}
            aria-label={emerg ? "긴급 상황 관리" : "긴급 SOS"}
            className={`press flex min-h-[3rem] w-12 items-center justify-center rounded-md transition-colors ${
              emerg
                ? "bg-danger-500 text-white active:bg-danger-700"
                : "border border-danger-500/40 bg-danger-50 text-danger-500 active:bg-danger-50/70 dark:bg-danger-500/10 dark:text-danger-300 dark:active:bg-danger-500/20"
            }`}
          >
            <Siren size={19} aria-hidden />
          </button>
        </div>
      </div>

      {sosOpen && (
        <MobileSosSheet
          household={h}
          registered={emerg}
          onToggle={() => {
            setEmergency(id, !isEmergency(id));
            setSosOpen(false);
          }}
          onClose={() => setSosOpen(false)}
        />
      )}
    </div>
  );
}
