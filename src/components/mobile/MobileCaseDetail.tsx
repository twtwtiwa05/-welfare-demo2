import { ArrowLeft } from "lucide-react";
import { getHousehold } from "../../lib/data";
import RiskBadge from "../RiskBadge";
import CaseDetail from "../CaseDetail";
import { computeScore } from "../../lib/scoring";

// 모바일 케이스 상세 — 풀스크린 푸시 화면(뒤로가기). 기존 CaseDetail 로직 재사용.
export default function MobileCaseDetail({
  id,
  onBack,
}: {
  id: string;
  onBack: () => void;
}) {
  const h = getHousehold(id);
  if (!h) return null;
  const score = computeScore(h.signals, h.profileGroup).score;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 flex items-center gap-2.5 border-b border-slate-200 bg-white/95 px-3 py-2.5 backdrop-blur-md">
        <button
          onClick={onBack}
          aria-label="목록으로 돌아가기"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-600 transition-colors active:bg-slate-100"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[15px] font-bold leading-tight text-slate-800">
            {h.id}
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
    </div>
  );
}
