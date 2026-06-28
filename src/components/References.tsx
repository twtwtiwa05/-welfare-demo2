import { BookOpen, X, ExternalLink, AlertTriangle } from "lucide-react";
import {
  REFERENCES,
  STRENGTH_STYLE,
  type Reference,
  type RefCategory,
} from "../lib/references";

// 근거·출처 패널 (작업 A / 정직성). 헤더 토글로 on/off.
// "점수의 형식 = Frailty Index, 신호 선택 = 위기정보 체계·실서비스"의 근거를 강도·한계와 함께.
const CATEGORY_META: Record<RefCategory, { label: string; sub: string }> = {
  academic: { label: "학술", sub: "점수 형식·신호의 학술 근거" },
  institutional: { label: "제도·실서비스", sub: "한국 복지 발굴 체계 + 운영 중인 안부살핌" },
  ml: { label: "ML 모델", sub: "보조 선별(이상탐지·군집)의 방법 출처" },
};
const ORDER: RefCategory[] = ["academic", "institutional", "ml"];

export default function References({ onClose }: { onClose: () => void }) {
  return (
    <div className="border-b border-slate-200/70 bg-slate-50/70 backdrop-blur-sm animate-fadeIn">
      <div className="mx-auto max-w-6xl px-4 py-3">
        <div className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <span className="icon-circle-sm !h-6 !w-6 bg-brand-100 text-brand-700">
            <BookOpen size={15} />
          </span>
          점수·모델의 근거와 출처
          <button
            onClick={onClose}
            aria-label="근거 패널 닫기"
            className="icon-circle-sm ml-auto text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600"
          >
            <X size={16} />
          </button>
        </div>
        <p className="mb-3 text-xs leading-relaxed text-slate-500">
          점수의 <b>형식</b>은 Rockwood Frailty Index(결핍누적), 신호의 <b>선택</b>은 한국 복지
          발굴 위기정보 체계·실서비스(한전·통신3사 안부살핌)로 정당화합니다. 모든 상수는 근거/가정/학습
          중 하나로 분류했고, <b className="text-amber-700">약한 근거(우편)에는 가짜 인용을 달지
          않습니다.</b>
        </p>
        <div className="grid gap-3 lg:grid-cols-3">
          {ORDER.map((cat) => (
            <section key={cat} className="space-y-2">
              <div className="flex items-baseline gap-2">
                <h4 className="text-xs font-bold text-slate-700">{CATEGORY_META[cat].label}</h4>
                <span className="text-[10px] text-slate-400">{CATEGORY_META[cat].sub}</span>
              </div>
              <div className="space-y-2">
                {REFERENCES.filter((r) => r.category === cat).map((r) => (
                  <RefCard key={r.id} r={r} />
                ))}
              </div>
            </section>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-slate-400">
          전체 인용·강도·한계는 레포 루트 <code className="rounded bg-slate-100 px-1">REFERENCES.md</code> 참조.
        </p>
      </div>
    </div>
  );
}

function RefCard({ r }: { r: Reference }) {
  return (
    <div className="card !p-3">
      <div className="mb-1 flex items-start gap-1.5">
        <span
          className={`chip shrink-0 !px-1.5 !py-0 text-[10px] ${STRENGTH_STYLE[r.strength]}`}
        >
          {r.strength}
        </span>
        <p className="text-[11px] font-semibold leading-snug text-slate-700">{r.cite}</p>
      </div>
      <p className="text-[11px] leading-relaxed text-slate-500">{r.use}</p>
      {r.limitation && (
        <p className="mt-1 flex gap-1 text-[10px] leading-relaxed text-amber-700">
          <AlertTriangle size={11} className="mt-0.5 shrink-0" />
          <span>{r.limitation}</span>
        </p>
      )}
      {r.url && (
        <a
          href={r.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-brand-600 hover:text-brand-700"
        >
          출처 <ExternalLink size={10} />
        </a>
      )}
    </div>
  );
}
