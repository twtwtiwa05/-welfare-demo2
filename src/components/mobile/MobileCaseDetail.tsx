import { useState } from "react";
import { ArrowLeft, Siren } from "lucide-react";
import { getHousehold } from "../../lib/data";
import { computeScore } from "../../lib/scoring";
import { useCaseState } from "../../lib/caseState";
import RiskBadge from "../RiskBadge";
import CaseDetail from "../CaseDetail";
import MobileSosSheet from "./MobileSosSheet";

// 모바일 케이스 상세 — 풀스크린 푸시 화면(뒤로가기) + 하단 긴급 SOS 바. CaseDetail 재사용.
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
  const emerg = isEmergency(id);

  return (
    <div className="min-h-screen bg-slate-50">
      <header
        className={`sticky top-0 z-30 flex items-center gap-2.5 border-b px-3 py-2.5 backdrop-blur-md ${
          emerg ? "border-red-300 bg-red-50/95" : "border-slate-200 bg-white/95"
        }`}
      >
        <button
          onClick={onBack}
          aria-label="목록으로 돌아가기"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-600 transition-colors active:bg-slate-100"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h1 className="font-mono text-[15px] font-bold leading-tight text-slate-800">
              {h.id}
            </h1>
            {emerg && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                <Siren size={9} aria-hidden /> 긴급 SOS
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-400">
            {h.dong} · {h.ageBand} · {h.sex === "F" ? "여" : "남"}
          </div>
        </div>
        <RiskBadge score={score} size="sm" />
      </header>

      <div className="p-3 pb-28">
        <CaseDetail household={h} />
      </div>

      {/* 하단 고정 긴급 SOS 바 */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-md">
        <button
          onClick={() => setSosOpen(true)}
          className={`flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-base font-bold transition-colors ${
            emerg
              ? "bg-red-600 text-white active:bg-red-700"
              : "border-2 border-red-300 bg-red-50 text-red-600 active:bg-red-100"
          }`}
        >
          <Siren size={20} aria-hidden /> {emerg ? "긴급 상황 — 관리" : "긴급 SOS"}
        </button>
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
