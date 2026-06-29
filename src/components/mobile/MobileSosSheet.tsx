import { Siren, Phone, AlertTriangle } from "lucide-react";
import type { Household } from "../../lib/types";
import { computeScore } from "../../lib/scoring";
import { caseMeta } from "../../lib/caseMeta";
import BottomSheet from "./BottomSheet";

// 긴급 SOS 시트 — 방문 중 위급상황(상태 악화·실종 등) 즉시 보고.
// 긴급 등록 → 명단에 적색 표시·담당팀 공유 대상. + 119/지역센터 빠른 연락.
// ⚠️ 데모: 실제 운영 시 119·지역 응급체계 연동. 119 연결은 단말 다이얼러에서 한 번 더 확인.
export default function MobileSosSheet({
  household,
  registered,
  onToggle,
  onClose,
}: {
  household: Household;
  registered: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const score = computeScore(household.signals, household.profileGroup).score;
  const meta = caseMeta(household, score);
  const centerTel = "031-000-0000"; // 데모 지역센터 번호

  return (
    <BottomSheet
      accent="danger"
      onClose={onClose}
      title={
        <>
          <Siren size={18} aria-hidden /> 긴급 SOS
        </>
      }
    >
      <div className="px-4 py-3">
        <div className="mb-1 flex items-center gap-2">
          <span className="font-mono text-base font-bold text-slate-800">{household.id}</span>
          <span className="text-xs text-slate-400">
            {household.dong} · {meta.maskedAddress}
          </span>
        </div>
        <p className="text-sm leading-relaxed text-slate-600">
          {registered ? (
            <>
              이 가구는 <b className="text-red-600">긴급 등록 상태</b>입니다. 상황이 종료되면
              해제하세요.
            </>
          ) : (
            <>
              방문 중 <b className="text-red-600">위급 상황</b>(상태 악화·실종·무응답 등)입니까?
              긴급 등록하면 <b>명단에 적색으로 표시</b>되고 담당팀 공유 대상으로 올라갑니다.
            </>
          )}
        </p>

        {/* 긴급 등록/해제 (핵심) */}
        <button
          onClick={onToggle}
          className={`mt-3.5 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-base font-bold shadow-sm ${
            registered
              ? "border-2 border-red-200 bg-white text-red-600 active:bg-red-50"
              : "bg-red-600 text-white active:bg-red-700"
          }`}
        >
          <Siren size={20} aria-hidden /> {registered ? "긴급 해제" : "긴급 상황 등록"}
        </button>

        {/* 긴급 연락 */}
        <div className="mt-4">
          <div className="mb-2 text-[11px] font-semibold text-slate-500">긴급 연락</div>
          <div className="grid grid-cols-2 gap-2">
            <a
              href="tel:119"
              className="flex items-center justify-center gap-1.5 rounded-xl border-2 border-red-200 bg-red-50 py-3 text-sm font-bold text-red-700 active:bg-red-100"
            >
              <Phone size={15} aria-hidden /> 119 응급신고
            </a>
            <a
              href={`tel:${centerTel}`}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-600 active:bg-slate-50"
            >
              <Phone size={15} aria-hidden /> 지역센터
            </a>
          </div>
        </div>

        <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-400">
          <AlertTriangle size={12} className="mt-0.5 shrink-0 text-amber-500" aria-hidden />
          데모입니다 — 실제 운영 시 119·지역 응급체계와 연동되며, 통화 연결은 단말에서 한 번 더 확인합니다.
        </p>
      </div>
    </BottomSheet>
  );
}
