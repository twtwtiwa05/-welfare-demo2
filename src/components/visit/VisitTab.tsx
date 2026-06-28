import { useState } from "react";
import { HOUSEHOLDS } from "../../lib/data";
import { combinationMethod, rankByPriority } from "../../lib/priority";
import { groupByProximity } from "../../lib/routing";
import type { Household } from "../../lib/types";
import PriorityList from "./PriorityList";
import RouteMap from "./RouteMap";
import RouteCard from "./RouteCard";
import ClusterGroups from "../ml/ClusterGroups";
import { Route, Users2 } from "lucide-react";

const RESIDUAL = HOUSEHOLDS.filter((h) => !h.haengbokFlagged);

// 우선순위 후보(조합 발굴된 잔여, 추세 반영 정렬) 상위 12건
const RANKED = rankByPriority(RESIDUAL.filter((h) => combinationMethod(h)));
const TOP = RANKED.slice(0, 12);
const TOP_HH = TOP.map((r) => r.household);

// 근접 권역 묶음 — group 0 = 최우선(수원 모녀 모티프)의 라동 일대
const GROUPS = groupByProximity(TOP_HH, { maxGroupSize: 4, radius: 0.2 });

// 탭3 — 방문계획 (③ 종착점). "오늘 누구를, 어떤 순서·경로로".
export default function VisitTab({ onGotoCase }: { onGotoCase: (id: string) => void }) {
  // 묶음별 편집 가능한 동선(순서/제외) — 담당자가 최종 결정
  const [routes, setRoutes] = useState<Household[][]>(() =>
    GROUPS.map((g) => g.ordered)
  );
  const [idx, setIdx] = useState(0);
  const stops = routes[idx] ?? [];

  function updateStops(next: Household[]) {
    setRoutes((rs) => rs.map((r, i) => (i === idx ? next : r)));
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= stops.length) return;
    const next = [...stops];
    [next[i], next[j]] = [next[j], next[i]];
    updateStops(next);
  }
  function remove(id: string) {
    updateStops(stops.filter((h) => h.id !== id));
  }
  // 가구 선택 → 그 가구가 속한 묶음으로 전환
  function pickHousehold(id: string) {
    const gi = routes.findIndex((r) => r.some((h) => h.id === id));
    if (gi >= 0) setIdx(gi);
  }

  const selectedIds = new Set(stops.map((h) => h.id));

  return (
    <div className="space-y-4">
      {/* 메시지 띠 */}
      <div className="rounded-xl border border-brand-100 bg-brand-50/60 px-4 py-3 text-sm leading-relaxed text-slate-600">
        <span className="mr-1 rounded-md bg-brand-600 px-2 py-0.5 text-xs font-bold text-white">
          ③ 종착점
        </span>{" "}
        ‘왜 이 사람인가’에서 멈추지 않습니다.{" "}
        <b className="text-brand-800">
          오늘 누구를, 어떤 순서·경로로 방문할지까지
        </b>{" "}
        — 한정된 인력이 한 번의 외근으로 인접 가구를 함께 점검하도록 묶습니다.
      </div>

      {/* ML 대량 선별 메시지 (작업 B) */}
      <div className="flex items-start gap-2.5 rounded-xl border border-rose-100 bg-rose-50/50 px-4 py-3 text-sm leading-relaxed text-slate-600">
        <Users2 size={18} className="mt-0.5 shrink-0 text-rose-500" />
        <span>
          한 명이 수십 가구를 담당하는 현실에서, ML이{" "}
          <b className="text-rose-700">급속·다변량 악화 가구를 자동 선별</b>해 건초더미를 줄입니다.
          ML은 판정하지 않습니다 — 우선 볼 곳을 가릴 뿐, 방문 결정은 담당자.{" "}
          <span className="text-slate-400">
            (한전·통신3사 ‘AI 안부살핌’이 운영 중인 접근 — 그 교육용 PoC)
          </span>
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
        {/* 좌: 우선순위 */}
        <PriorityList
          ranked={TOP}
          selectedIds={selectedIds}
          onPick={pickHousehold}
          onGotoCase={onGotoCase}
        />

        {/* 우: 동선 묶음 선택 + 지도 + 동선 카드 */}
        <div className="space-y-4">
          {/* 묶음 선택 칩 */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-caption font-semibold uppercase tracking-wider text-slate-400">
              <Route size={13} /> 방문 묶음
            </span>
            {GROUPS.map((g, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={`chip border transition-all ${
                  i === idx
                    ? "border-brand-300 bg-brand-50 text-brand-700"
                    : "border-slate-200 bg-white text-slate-500 hover:border-brand-200 hover:text-brand-600"
                }`}
              >
                {g.dong} {routes[i]?.length ?? g.ordered.length}
              </button>
            ))}
          </div>

          <RouteMap all={TOP_HH} stops={stops} onPick={pickHousehold} />
          <RouteCard
            dong={GROUPS[idx]?.dong ?? ""}
            stops={stops}
            onMove={move}
            onRemove={remove}
            onGotoCase={onGotoCase}
          />
        </div>
      </div>

      {/* 궤적 군집 (우선순위 그룹화) — ML 보조선별 */}
      <ClusterGroups households={RESIDUAL} onPick={onGotoCase} />
    </div>
  );
}
