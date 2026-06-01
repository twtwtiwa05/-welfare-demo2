import { HOUSEHOLDS } from "../../lib/data";
import { splitByHaengbok } from "../../lib/dedup";
import SimBadge from "../SimBadge";
import { Filter } from "lucide-react";

const r = splitByHaengbok(HOUSEHOLDS);
const pct = (n: number) => (n / r.total) * 100;

// ②단계 압축 — 중복제거 한 줄 요약 + 비율 바. 길게 설명하지 않는다.
export default function DedupSummary() {
  return (
    <div className="card card-pad">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="icon-circle-sm bg-brand-50 text-brand-600">
          <Filter size={15} />
        </span>
        <span className="text-sm leading-relaxed text-slate-600">
          전체 합성 <b className="text-slate-800">{r.total}</b>가구 → 행복e음 기포착{" "}
          <b className="text-slate-500">{r.alreadyFound.length}</b> 제외 →{" "}
          <b className="text-brand-700">잔여 {r.residual.length}가구</b>만 분석합니다.
        </span>
        <SimBadge
          label="행복e음 플래그 = 시뮬"
          title="실서비스에선 행복e음 연동으로 기포착 여부를 받지만, 데모에서는 임의 설정한 플래그입니다."
        />
      </div>
      <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div className="bg-slate-300" style={{ width: `${pct(r.alreadyFound.length)}%` }} />
        <div className="bg-brand-500" style={{ width: `${pct(r.residual.length)}%` }} />
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-slate-400">
        <span>회색 = 기포착(보완 대상 아님)</span>
        <span>파랑 = 잔여 후보(우리 분석)</span>
      </div>
    </div>
  );
}
