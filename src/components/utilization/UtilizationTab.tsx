import { HOUSEHOLDS } from "../../lib/data";
import { computeScore } from "../../lib/scoring";
import { combinationMethod, rankByPriority } from "../../lib/priority";
import type { Household } from "../../lib/types";
import BeforeList from "./BeforeList";
import AfterCard from "./AfterCard";
import { ArrowRight, ArrowDown } from "lucide-react";

const RESIDUAL = HOUSEHOLDS.filter((h) => !h.haengbokFlagged);
const sc = (h: Household) => computeScore(h.signals, h.profileGroup).score;

// 조합 방식으로 발굴된 잔여 중 상위 7건 — Before/After가 공유하는 '같은 명단'
const SHORTLIST = RESIDUAL.filter((h) => combinationMethod(h))
  .sort((a, b) => sc(b) - sc(a))
  .slice(0, 7);

// ★ ③ 활용도 클라이맥스. 같은 명단, 다른 전달.
// 좌: 점수만 있는 무미건조한 명단. 우: 근거·출처·추세·우선순위·권고가 붙은 행동 가능한 카드.
export default function UtilizationTab({
  onGotoVisit,
  onGotoCase,
}: {
  onGotoVisit: () => void;
  onGotoCase: (id: string) => void;
}) {
  const beforeList = [...SHORTLIST]; // 점수 내림차순
  const ranked = rankByPriority(SHORTLIST); // 추세 반영 우선순위 순으로 재배열

  return (
    <div className="space-y-4">
      {/* 메시지 띠 */}
      <div className="rounded-xl border border-brand-100 bg-brand-50/60 px-4 py-3 text-sm leading-relaxed text-slate-600">
        <span className="mr-1 rounded-md bg-brand-600 px-2 py-0.5 text-xs font-bold text-white">
          ③ 활용도
        </span>{" "}
        발굴 명단은 이미 존재합니다. 문제는 인력이 부족한 현장에서 ‘이 목록 중
        누구를, 왜, 먼저’ 봐야 하는지가 빠져 있다는 것입니다.{" "}
        <b className="text-brand-800">
          데이터는 똑같습니다. 바뀌는 건 담당자가 행동할 수 있느냐입니다.
        </b>
      </div>

      <div className="flex items-center justify-center gap-2 text-caption font-semibold uppercase tracking-wider text-slate-400">
        <span className="h-px w-8 bg-slate-200" />
        같은 잔여 {SHORTLIST.length}가구 · 다른 전달
        <span className="h-px w-8 bg-slate-200" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* BEFORE */}
        <div className="card overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
              <span className="section-label !text-slate-400">Before</span>
              기존 · 명단 통보
            </div>
            <div className="mt-0.5 text-xs text-slate-400">
              점수순 목록은 있으나 “왜·무엇을 먼저”가 없음
            </div>
          </div>
          <BeforeList list={beforeList} />
          <div className="bg-slate-50/50 px-4 py-3 text-center text-sm text-slate-400">
            “이 중 누구를 먼저 봐야 하나?”
          </div>
        </div>

        {/* AFTER */}
        <div className="card overflow-hidden border-brand-300 ring-1 ring-brand-100">
          <div className="border-b border-brand-100 bg-brand-50 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-bold text-brand-700">
              <span className="section-label !text-brand-500">After</span>
              우리 · 근거 + 우선순위 + 추적
            </div>
            <div className="mt-0.5 text-xs text-slate-500">
              같은 명단을 ‘추세 반영 우선순위’로 재배열하고 행동 정보를 더함
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {ranked.map((r) => (
              <AfterCard key={r.household.id} ranked={r} onGotoCase={onGotoCase} />
            ))}
          </div>
          <div className="bg-brand-50/50 px-4 py-3 text-center text-sm font-semibold text-brand-700">
            “{ranked[0]?.household.id}부터, 이 근거·이 순서로.”
          </div>
        </div>
      </div>

      {/* 종착점 연결 — 방문 동선으로 */}
      <button
        onClick={onGotoVisit}
        className="group flex w-full items-center justify-center gap-2 rounded-xl border border-brand-200 bg-white px-4 py-3.5 text-sm font-semibold text-brand-700 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-card-hover"
      >
        <ArrowDown size={15} className="text-brand-400" />
        그럼 오늘, 누구를 어떤 순서·경로로? — 방문 동선 보기
        <ArrowRight
          size={16}
          className="transition-transform duration-200 group-hover:translate-x-0.5"
        />
      </button>

      {/* 책임 분리 고지 */}
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-slate-500 shadow-card">
        ※ 최종 전화·방문 결정은 담당자가 합니다. AI는 근거 서술까지만 기여하고,
        점수·우선순위·동선은 투명 공식이 계산합니다 (책임 분리).
      </div>
    </div>
  );
}
