import { useState } from "react";
import {
  FlaskConical,
  Target,
  TrendingUp,
  ShieldCheck,
  GitBranch,
  Microscope,
  ScrollText,
  AlertTriangle,
  Check,
  Sparkles,
  BookOpen,
} from "lucide-react";
import {
  PrecisionAtKChart,
  CIForestChart,
  AblationChart,
  LambdaSweepChart,
  ClassDeathRateChart,
  ShapChart,
  MetricComparisonChart,
  MethodTable,
  ChartCard,
} from "./ExperimentCharts";
import { LAMBDAS, headline, pct, signed, type LamKey } from "../../lib/experiment";

// ═══════════════════════════════════════════════════════════════════════════
// 탭5 — 실증 실험 (Empirical Validation)
// experiment/ 의 ML/DL 통제실험을 앱 서사로 이식. 초록→배경→데이터→위험유형→
// 결과(λ 인터랙티브)→우위원천→정직성→한계→결론. 정직성(λ 조건부)을 전면에.
// ═══════════════════════════════════════════════════════════════════════════
export default function ExperimentTab({ onOpenProof }: { onOpenProof?: () => void }) {
  // λ 인터랙티브 — 결과·우위원천 구간이 이 상태에 반응 (기본 궤적구동 λ0.8 = 우리 세계)
  const [lam, setLam] = useState<LamKey>("lam08");
  const h = headline(lam);
  const scenario = LAMBDAS.find((l) => l.key === lam)!;

  return (
    <div className="space-y-6">
      {/* ── 인트로: 증명 경계와의 연결 ── */}
      <div className="rounded-xl border border-brand-200 bg-brand-50/50 px-4 py-3.5 shadow-card">
        <div className="mb-1 flex items-center gap-2">
          <span className="icon-circle-sm !h-6 !w-6 bg-brand-100 text-brand-700">
            <FlaskConical size={15} />
          </span>
          <span className="text-sm font-bold text-slate-800">
            심사 피드백에 답한 통제 실험 — “궤적 ML이 임계값 방식을 정말 이기는가?”
          </span>
        </div>
        <p className="text-[13px] leading-relaxed text-slate-600">
          이 데모의{" "}
          {onOpenProof ? (
            <button
              onClick={onOpenProof}
              className="font-semibold text-brand-600 underline decoration-brand-300 underline-offset-2 hover:text-brand-700"
            >
              증명 경계
            </button>
          ) : (
            <b className="text-brand-700">증명 경계</b>
          )}
          는 “합성 데이터라 발굴 정확도는 증명하지 않는다”고 선언했습니다. 이 탭은{" "}
          <b className="text-slate-800">그 한계를 정면으로 다룬 통제 실험</b>입니다. 순환논증을 막는
          장치(잠재/관측 <b>정보 분리</b> · <b>λ 스윕</b> · <b>특징 제거 분석</b>) 위에서, 다변량 시계열의{" "}
          <b className="text-brand-700">변화 궤적</b>을 학습한 ML/DL이 신호의 <b>현재 수준</b>만 보는 단일변수
          임계값 방식을 이기는지, 그리고 <b>어떤 조건에서</b> 이기는지를 검증합니다.
        </p>
      </div>

      {/* ── 헤드라인 (λ 반응) ── */}
      <section>
        <SectionHead
          icon={<TrendingUp size={16} />}
          title="핵심 결과"
          sub="궤적구동 세계(λ0.8, 표본 10,000가구·사망 약 12%)에서 — 상위 10% 방문 우선순위의 적중률"
        />
        <LambdaSwitcher lam={lam} onChange={setLam} />
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            accent
            icon={<Target size={16} />}
            kicker="방문 적중 배수"
            value={`${h.ratio.toFixed(1)}배`}
            sub={`상위10% 정밀도 ${pct(h.mlP10)} vs 임계값 ${pct(h.orP10)}`}
          />
          <StatCard
            icon={<Sparkles size={16} />}
            kicker="ML 적중률 (상위10%)"
            value={pct(h.mlP10)}
            sub={`경사부스팅 — 임계값 ${pct(h.orP10)} 대비`}
          />
          <StatCard
            icon={<Check size={16} />}
            kicker="AUPRC 향상 (vs 임계값)"
            value={signed(h.auprcDiff.point)}
            sub={`95% CI [${signed(h.auprcDiff.lo)}, ${signed(h.auprcDiff.hi)}]`}
            significant={h.auprcDiff.lo > 0}
          />
          <StatCard
            icon={<GitBranch size={16} />}
            kicker="딥러닝(1D-CNN)도"
            value={pct(h.dlP10)}
            sub="수기특징 없이 원자료만으로 임계값 능가"
          />
        </div>
        <div className="mt-2.5 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-[11px] leading-relaxed text-slate-500">
          <span className="mt-0.5 shrink-0 rounded bg-slate-700 px-1.5 py-0.5 text-[10px] font-bold text-white">
            {scenario.label} · {scenario.regime}
          </span>
          <span>{scenario.blurb}</span>
        </div>
      </section>

      {/* ── 결과 상세: 지표·CI·표 ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="상위 K% 우선순위 정밀도"
          sub="한정된 방문 예산과 직결 — 상위 K%를 방문했을 때 실제 위험가구 적중 비율"
          tag={<RegimeTag lam={lam} />}
        >
          <PrecisionAtKChart lam={lam} />
        </ChartCard>
        <ChartCard
          title="임계값 대비 향상량 · 부트스트랩 95% CI"
          sub="AUPRC 기준 — 0을 넘으면 통계적으로 유의(★). 우연이 아님을 CI로 증명"
          tag={<RegimeTag lam={lam} />}
        >
          <CIForestChart lam={lam} block="ci_auprc" />
        </ChartCard>
      </div>

      <ChartCard
        title="주요 성능지표 비교 · 표"
        sub="AUROC·AUPRC·정밀도@10% — 임계값(기준) / 제안 ML·DL / 이상적 상한(오라클)"
        tag={<RegimeTag lam={lam} />}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <MetricComparisonChart lam={lam} />
          <div className="flex items-center">
            <MethodTable lam={lam} />
          </div>
        </div>
      </ChartCard>

      {/* ── 우위의 출처 ── */}
      <section className="space-y-4">
        <SectionHead
          icon={<Microscope size={16} />}
          title="우위는 어디서 오는가 — 타당성 검증"
          sub="성능 향상이 ‘시계열 정보’에서 기인함을 특징 제거 분석과 변수 기여도(SHAP)로 규명"
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard
            title="특징 제거 분석 (Ablation)"
            sub="동일 부스팅에서 시계열 파생특징을 넣고 뺀 순수 기여"
            tag={<RegimeTag lam={lam} />}
          >
            <AblationChart lam={lam} />
          </ChartCard>
          <ChartCard
            title="변수 기여도 (SHAP)"
            sub="궤적구동(λ0.8) 세계 · 위험 예측 기여 상위 특징"
            tag={<span className="chip bg-slate-100 text-[10px] text-slate-500">λ 0.8 고정</span>}
          >
            <ShapChart />
          </ChartCard>
        </div>
      </section>

      {/* ── 정직성 검증 (λ 스윕) ── */}
      <section className="space-y-4">
        <SectionHead
          icon={<ShieldCheck size={16} />}
          title="정직성 검증 — “무조건 이긴다”가 아니다"
          sub="위험과정 구성 λ를 0.3→0.8로 스윕 — 세계가 궤적구동일 때만 우위가 커진다는 조건부 명제"
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard
            title="λ 스윕 — 시계열 우위의 단조성"
            sub="세계가 궤적구동일수록(λ↑) 시계열 기여·ML 향상이 증가"
          >
            <LambdaSweepChart />
          </ChartCard>
          <ChartCard
            title="잠재 유형별 사망률 — ‘레벨 트랩’"
            sub="만성 고위험형(수준만 높음)은 λ↑에서 저위험으로 — 임계값 오탐의 근거"
          >
            <ClassDeathRateChart />
          </ChartCard>
        </div>
      </section>

      {/* ── 연구 설계·데이터 타당성 (도해) ── */}
      <section className="space-y-4">
        <SectionHead
          icon={<GitBranch size={16} />}
          title="연구 설계 · 데이터 타당성"
          sub="실측 전력(AI-Hub #259)을 앵커로, 인과 순서(잠재→관측·해저드)를 설계해 순환논증을 통제"
        />
        <FigureCard
          src="/experiment/pipeline.png"
          alt="연구 설계 및 실험 절차 개요 — 잠재 건강상태에서 관측 신호와 사망을 파생, 랜드마킹 예측·부트스트랩 평가"
          caption="연구 설계 파이프라인 — 잠재 건강상태 H(t)에서 (i) 측정오차를 부가한 관측 신호와 (ii) 해저드를 거친 사망을 파생. 위험함수는 잠재변수에만 의존 → 예측 모형은 라벨 생성정보에 접근 불가(정보 분리)."
          wide
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <FigureCard
            src="/experiment/risk-space.png"
            alt="수준-궤적 잠재 위험공간에서의 위험 유형 분포 산점도"
            caption="위험 유형 구조 — 만성 고위험형(수준↑·변화 없음)과 급속 악화형은 현재 수준이 비슷해도 변화 궤적에서 갈린다."
          />
          <div className="grid grid-rows-2 gap-4">
            <FigureCard
              src="/experiment/validity-loadcurve.png"
              alt="합성 자료와 실측 자료의 시간대별 전력 부하곡선 비교"
              caption="시간대별 전력 부하곡선 — 합성 전력이 실측(#259)의 형태·계절성을 재현."
              compact
            />
            <FigureCard
              src="/experiment/validity-km.png"
              alt="Kaplan–Meier 생존곡선"
              caption="Kaplan–Meier 생존곡선 — 희귀 사건(사망 약 12%)의 시간 구조."
              compact
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FigureCard
            src="/experiment/example-rapid.png"
            alt="급속 악화·사망 사례의 다변량 신호와 잠재 건강상태 궤적"
            caption="급속 악화·사망 사례 — 여러 신호가 함께 꺾이는 동조 악화(이음누리 모델의 표적)."
            tone="danger"
          />
          <FigureCard
            src="/experiment/example-stable.png"
            alt="안정·생존 사례의 다변량 신호와 잠재 건강상태 궤적"
            caption="안정·생존 사례 — 신호가 안정적으로 유지되는 저위험 궤적."
            tone="ok"
          />
        </div>
      </section>

      {/* ── 한계 (정직) ── */}
      <section className="space-y-3">
        <SectionHead
          icon={<AlertTriangle size={16} />}
          title="한계 — 정직하게"
          sub="합성 자료 기반 개념증명. 결론은 절대 성능이 아니라 임계값 대비 상대 우위와 그 원천에 있다"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          {LIMITS.map((t) => (
            <div key={t.title} className="card card-pad !p-3.5 border-amber-200">
              <div className="mb-1 flex items-center gap-1.5 text-xs font-bold text-amber-700">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                  <AlertTriangle size={12} strokeWidth={2.6} />
                </span>
                {t.title}
              </div>
              <p className="text-[13px] leading-relaxed text-slate-600">{t.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 결론 ── */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
        <div className="mb-1.5 flex items-center gap-2 text-sm font-bold text-slate-800">
          <ScrollText size={16} className="text-brand-600" /> 결론
        </div>
        <p className="text-[13px] leading-relaxed text-slate-600">
          다변량 시계열의 <b className="text-brand-700">변화 궤적·동시 변화</b>를 학습하는 기계학습·딥러닝
          모형은, 신호의 현재 수준만 쓰는 단일변수 임계값 방식보다 독거노인 위험 우선순위 예측에서{" "}
          <b className="text-slate-800">통계적으로 유의하게 우수</b>했다. 이 우위는 특징 제거 분석·변수
          기여도·λ 민감도 분석을 통해 <b>시계열 정보에서 기인</b>함이 확인되었으며, 결과 라벨의 생성정보를
          모형으로부터 분리한 설계 위에서 성립한다. 결론은 “위험이 궤적구동일 때 우월하다”는{" "}
          <b className="text-brand-700">λ 조건부 명제</b>로 제시한다.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-[11px] text-slate-400">
          <BookOpen size={12} />
          <span>
            원자료·코드: <code className="rounded bg-slate-100 px-1">experiment/</code> (dgp·eval·model) ·
            보고서 <code className="rounded bg-slate-100 px-1">experiment/reports/이음누리_실험보고서.docx</code>
          </span>
        </div>
      </section>

      <p className="pb-2 text-center text-[11px] text-slate-400">
        차트는 <code className="rounded bg-slate-100 px-1">experiment/reports/figure_data</code>의 실제 실험
        결과(summary.json·shap)를 앱에서 재구성 · 합성 데이터 기반 통제 실험
      </p>
    </div>
  );
}

// ── λ 세그먼트 스위처 (인터랙티브 핵심) ──────────────────────────────────────
function LambdaSwitcher({ lam, onChange }: { lam: LamKey; onChange: (l: LamKey) => void }) {
  return (
    <div
      role="radiogroup"
      aria-label="위험과정 구성 λ 선택"
      className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1"
    >
      {LAMBDAS.map((l) => {
        const active = l.key === lam;
        return (
          <button
            key={l.key}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(l.key)}
            className={`flex flex-col items-center rounded-md px-4 py-1.5 text-sm font-semibold transition-all ${
              active
                ? "bg-white text-brand-700 shadow-card ring-1 ring-brand-200"
                : "text-slate-400 hover:text-brand-600"
            }`}
          >
            <span>{l.label}</span>
            <span className="text-[10px] font-medium opacity-80">{l.regime}</span>
          </button>
        );
      })}
    </div>
  );
}

function RegimeTag({ lam }: { lam: LamKey }) {
  const s = LAMBDAS.find((l) => l.key === lam)!;
  return (
    <span className="chip shrink-0 border border-brand-200 bg-brand-50 text-[10px] text-brand-700">
      {s.label} · {s.regime}
    </span>
  );
}

// ── 섹션 헤더 (AnalysisTab 톤) ───────────────────────────────────────────────
function SectionHead({
  icon,
  title,
  sub,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
}) {
  return (
    <div className="mb-3 flex items-start gap-2.5">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
        {icon}
      </span>
      <div>
        <h3 className="text-h2 text-slate-800">{title}</h3>
        <p className="text-[11px] leading-relaxed text-slate-400">{sub}</p>
      </div>
    </div>
  );
}

// ── 통계 카드 (헤드라인) ─────────────────────────────────────────────────────
function StatCard({
  icon,
  kicker,
  value,
  sub,
  accent,
  significant,
}: {
  icon: React.ReactNode;
  kicker: string;
  value: string;
  sub: string;
  accent?: boolean;
  significant?: boolean;
}) {
  return (
    <div
      className={`card card-pad !p-4 ${accent ? "border-brand-300 bg-brand-50/40" : ""}`}
    >
      <div className="mb-1.5 flex items-center gap-1.5">
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-lg ${
            accent ? "bg-brand-500 text-white" : "bg-brand-100 text-brand-700"
          }`}
        >
          {icon}
        </span>
        <span className="text-[11px] font-semibold text-slate-500">{kicker}</span>
      </div>
      <div
        className={`flex items-baseline gap-1.5 text-2xl font-extrabold tabular-nums ${
          accent ? "text-brand-700" : "text-slate-800"
        }`}
      >
        {value}
        {significant && (
          <span className="chip bg-success-50 text-[10px] text-success-700">유의 ★</span>
        )}
      </div>
      <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{sub}</p>
    </div>
  );
}

// ── 도해 이미지 카드 ─────────────────────────────────────────────────────────
function FigureCard({
  src,
  alt,
  caption,
  wide,
  compact,
  tone,
}: {
  src: string;
  alt: string;
  caption: string;
  wide?: boolean;
  compact?: boolean;
  tone?: "danger" | "ok";
}) {
  const ring =
    tone === "danger" ? "border-danger-500/30" : tone === "ok" ? "border-success-500/30" : "border-slate-200";
  return (
    <figure className={`card overflow-hidden ${ring}`}>
      <div className={`flex items-center justify-center bg-slate-50/60 p-2 ${wide ? "" : ""}`}>
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className={`w-full object-contain ${compact ? "max-h-[160px]" : wide ? "max-h-[420px]" : "max-h-[280px]"}`}
        />
      </div>
      <figcaption className="border-t border-slate-100 px-3 py-2 text-[11px] leading-relaxed text-slate-500">
        {caption}
      </figcaption>
    </figure>
  );
}

// ── 한계 카드 텍스트 (보고서 6절) ────────────────────────────────────────────
const LIMITS: { title: string; body: string }[] = [
  {
    title: "관측 시점 정보의 상한",
    body:
      "기준 시점 이후에 발생하는 악화는 원리상 예측 불가 → 절대 성능(AUROC)에는 천장이 있다. 결론은 절대 성능이 아니라 임계값 대비 상대 우위와 그 원천.",
  },
  {
    title: "사망 라벨의 외적 타당성",
    body:
      "전력으로 사망을 직접 예측한 선행 문헌이 제한적 → 사망 라벨은 문헌 근거로 설계한 값. 따라서 결론은 궤적구동 조건부 명제이며 λ 민감도로 명시.",
  },
  {
    title: "합성 자료의 한계",
    body:
      "절대적 발굴 규모나 ‘몇 배’ 같은 배수의 정량 일반화는 지양. 여기의 배수는 본 실험 표본 내의 상대적 값이다.",
  },
  {
    title: "실무 적용 조건",
    body:
      "실서비스 적용은 개인정보 법령·지자체 위임·재식별 통제를 전제로 하며, 본 연구는 그 이전 단계의 개념증명(PoC).",
  },
];
