import { X, Quote } from "lucide-react";

// 도입 훅 — 2025.4 수원 모녀 사건 (plan 1.1). 헤더 토글로 on/off (기본 숨김).
// 톤: 비극을 다루므로 절제된 남색. 빨강·과장 금지.
export default function IntroHook({ onClose }: { onClose: () => void }) {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-4">
      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card animate-fadeIn">
        <div className="absolute inset-y-0 left-0 w-1 bg-brand-600" aria-hidden />
        <div className="flex items-start gap-3 p-4 pl-5 sm:p-5 sm:pl-6">
          <span className="icon-circle-md mt-0.5 bg-brand-50 text-brand-700 ring-1 ring-brand-100">
            <Quote size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-h3 text-slate-800">2025년 4월, 수원 모녀 사건</h2>
              <span className="chip bg-slate-100 text-slate-500">실제 사건</span>
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
              생활고 끝에 숨진 모녀는 사망 직전까지{" "}
              <b className="font-semibold text-slate-800">8차례</b> 복지 사각지대
              발굴 대상자로 통보됐지만, 8번 중 7번이 단순 상담·민간 연계에
              그쳤습니다.{" "}
              <b className="font-semibold text-brand-700">
                시스템은 위험을 8번 감지했지만, 그 반복·악화가 담당자의
                우선순위로 전환되지 못했습니다.
              </b>
            </p>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-800">
              문제는 ‘발굴’이 아니라 ‘행동’입니다. 같은 명단에 근거·우선순위·동선을
              입혀 ‘오늘의 행동 계획’으로 바꿉니다.
            </p>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              ※ 이 비극의 더 큰 원인은 복지 문턱·인력 부족(제도)이며 본 데모의 범위
              밖입니다. 우리는 ‘명단이 우선순위 없이 처리된’ 한 조각만 다룹니다.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="도입 안내 닫기"
            className="icon-circle-sm shrink-0 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
