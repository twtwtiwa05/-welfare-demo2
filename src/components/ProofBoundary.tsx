import { ShieldCheck, Check, X, AlertTriangle } from "lucide-react";

// ★ 증명 경계 패널 (plan §5, 정직성). 헤더 토글로 on/off (기본 숨김).
// "증명하는 것 / 증명하지 않는 것 / 시뮬·합성 지점"의 경계를 선제적으로 밝힌다.
export default function ProofBoundary({ onClose }: { onClose: () => void }) {
  return (
    <div className="border-b border-slate-200/70 bg-slate-50/70 backdrop-blur-sm animate-fadeIn">
      <div className="mx-auto max-w-6xl px-4 py-3">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <span className="icon-circle-sm !h-6 !w-6 bg-brand-100 text-brand-700">
            <ShieldCheck size={15} />
          </span>
          이 데모가 증명하는 것 / 증명하지 않는 것
          <button
            onClick={onClose}
            aria-label="증명 경계 닫기"
            className="icon-circle-sm ml-auto text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600"
          >
            <X size={16} />
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <BoundaryCard
            tone="prove"
            title="증명하는 것"
            items={[
              "분석 파이프라인의 실제 작동",
              "위험 점수의 투명성·재현성 (슬라이더로 즉시 재계산)",
              "근거·우선순위·동선이 명단을 ‘행동 계획’으로 바꾸는 UX",
            ]}
          />
          <BoundaryCard
            tone="disprove"
            title="증명하지 않는 것"
            items={[
              "발굴 정확도 · “몇 배 더 찾았다” 같은 수치",
              "실제 위험 예측력 (정답을 우리가 설계한 합성 데이터)",
              "방문 동선의 이동시간 절감 수치 (실제 지리·도로 데이터 필요)",
            ]}
            footnote="→ 실데이터 파일럿에서만 검증 (기획서 6.2)"
          />
          <BoundaryCard
            tone="sim"
            title="시뮬·합성 지점"
            items={[
              "행복e음 중복제거 플래그 (실서비스는 연동)",
              "합성 데이터셋 — 정답을 우리가 설계(순환)",
              "LLM 근거 — 실서비스 LLM 자리를 시뮬로",
              "가구 좌표 — 합성, 실서비스는 재식별 필요",
            ]}
          />
        </div>
      </div>
    </div>
  );
}

type Tone = "prove" | "disprove" | "sim";

const TONE_STYLE: Record<
  Tone,
  { border: string; title: string; iconBg: string; dot: string; icon: React.ReactNode }
> = {
  prove: {
    border: "border-brand-200",
    title: "text-brand-700",
    iconBg: "bg-brand-100 text-brand-700",
    dot: "bg-brand-400",
    icon: <Check size={13} strokeWidth={3} />,
  },
  disprove: {
    border: "border-slate-200",
    title: "text-slate-500",
    iconBg: "bg-slate-100 text-slate-500",
    dot: "bg-slate-300",
    icon: <X size={13} strokeWidth={3} />,
  },
  sim: {
    border: "border-amber-200",
    title: "text-amber-700",
    iconBg: "bg-amber-100 text-amber-700",
    dot: "bg-amber-400",
    icon: <AlertTriangle size={12} strokeWidth={2.6} />,
  },
};

function BoundaryCard({
  tone,
  title,
  items,
  footnote,
}: {
  tone: Tone;
  title: string;
  items: string[];
  footnote?: string;
}) {
  const t = TONE_STYLE[tone];
  return (
    <div className={`card card-pad !p-3.5 ${t.border}`}>
      <div className={`mb-2 flex items-center gap-1.5 text-xs font-bold ${t.title}`}>
        <span className={`flex h-5 w-5 items-center justify-center rounded-full ${t.iconBg}`}>
          {t.icon}
        </span>
        {title}
      </div>
      <ul className="space-y-1.5 text-sm text-slate-600">
        {items.map((it) => (
          <li key={it} className="flex gap-2">
            <span className={`mt-2 h-1 w-1 shrink-0 rounded-full ${t.dot}`} />
            {it}
          </li>
        ))}
        {footnote && (
          <li className="pl-3 pt-0.5 text-xs text-slate-400">{footnote}</li>
        )}
      </ul>
    </div>
  );
}
