import { useState } from "react";
import { HOUSEHOLDS } from "../../lib/data";
import type { Household } from "../../lib/types";
import DedupSummary from "./DedupSummary";
import Step3Score from "../Step3Score";
import Step5Priority from "../Step5Priority";

const RESIDUAL = HOUSEHOLDS.filter((h) => !h.haengbokFlagged);
const byId = (id: string) => HOUSEHOLDS.find((h) => h.id === id);
const pickType = (t: "A" | "B" | "C") => RESIDUAL.find((h) => h.caseType === t);
const motif = RESIDUAL.find((h) => h.repeatedFlags >= 8);

// 점수 카드로 살펴볼 대표 사례 (집단 토글 역전·임계 미만 조합을 잘 보여주는 가구)
const SAMPLES = [
  pickType("C") && { id: pickType("C")!.id, label: "유형 C · 중장년 특화" },
  pickType("B") && { id: pickType("B")!.id, label: "유형 B · 임계 미만 조합" },
  motif && { id: motif.id, label: "반복 통보 가구" },
].filter(Boolean) as { id: string; label: string }[];

// 탭1 — 분석 (받침 ①②). 5단계를 1화면으로 압축. ③ 활용도를 신뢰하게 하는 최소 근거.
export default function AnalysisTab({ onGotoCase }: { onGotoCase: (id: string) => void }) {
  const [selId, setSelId] = useState(SAMPLES[0]?.id ?? RESIDUAL[0]?.id ?? "");
  const selected = byId(selId) ?? RESIDUAL[0];

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-slate-600 shadow-card">
        <span className="mr-1 rounded-md bg-slate-700 px-2 py-0.5 text-xs font-bold text-white">
          ① 재해석 · ② 집단특화
        </span>{" "}
        같은 데이터를 어떻게 다르게 보는가 —{" "}
        <b className="text-slate-800">③ 활용도를 신뢰하게 하는 받침</b>입니다. 빠르게
        훑고 본체(활용도·방문계획)로 넘어갑니다.
      </div>

      <Section n={1} title="통합 · 중복제거" sub="행복e음이 이미 본 가구는 빼고 ‘잔여’만">
        <DedupSummary />
      </Section>

      <Section
        n={2}
        title="투명 점수 · 집단 모형"
        sub="슬라이더로 즉시 재계산 · 집단 모형을 바꾸면 점수가 재배열 — 블랙박스 없음"
      >
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs font-semibold text-slate-500">사례:</span>
          {SAMPLES.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelId(s.id)}
              className={`chip border transition-all ${
                selId === s.id
                  ? "border-brand-300 bg-brand-50 text-brand-700"
                  : "border-slate-200 bg-white text-slate-500 hover:border-brand-200 hover:text-brand-600"
              }`}
            >
              {s.label}
            </button>
          ))}
          <span className="ml-1 text-[11px] text-slate-400">
            ‘유형 C’에서 집단 모형을 바꿔 점수 역전을 확인해 보세요
          </span>
        </div>
        <Step3Score key={selected.id} household={selected} />
      </Section>

      <Section
        n={3}
        title="임계값 vs 조합"
        sub="임계 미만 조합도 후보로 — 거짓음성(놓침) 관점. 절대 배수 주장 없음"
      >
        <Step5Priority onSelect={onGotoCase} />
      </Section>
    </div>
  );
}

function Section({
  n,
  title,
  sub,
  children,
}: {
  n: number;
  title: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2.5 flex items-center gap-2.5">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-700 text-xs font-bold text-white">
          {n}
        </span>
        <div>
          <h3 className="text-h3 text-slate-800">{title}</h3>
          <p className="text-[11px] text-slate-400">{sub}</p>
        </div>
      </div>
      {children}
    </section>
  );
}
