import { useMemo, useState } from "react";
import { Sparkles, Eye, ArrowUpRight, Info } from "lucide-react";
import { HOUSEHOLDS } from "../../lib/data";
import { computeScore, SIGNAL_KEYS, SIGNAL_META } from "../../lib/scoring";
import { thresholdMethod } from "../../lib/priority";
import { ml, isRapidDecline, anomalyScore } from "../../lib/ml";
import type { Household } from "../../lib/types";
import AnomalyBadge from "./AnomalyBadge";
import SignalTrajectory from "./SignalTrajectory";
import SimBadge from "../SimBadge";

// ★ "사람 눈으로는 못 잡는 결합 급락" (작업 B-5 / 분석 탭).
// 개별 신호는 모두 임계 미만(임계값 OR 방식은 놓침)이지만, 여러 신호가 동시에 최근 꺾여
// 다변량 이상탐지가 '결합 이상'으로 포착한다. = "공무원이 그래프 하나씩 보면 되잖아"의 직접 반증.

// 후보: 잔여 · 급속악화 · OR 임계 미달(모든 단일 신호가 임계 미만) · 이상도 높은 순
const CANDIDATES = HOUSEHOLDS.filter(
  (h) => !h.haengbokFlagged && isRapidDecline(h) && !thresholdMethod(h.signals)
).sort((a, b) => anomalyScore(b) - anomalyScore(a));

export default function CombinedDeclinePanel({
  onGotoCase,
}: {
  onGotoCase: (id: string) => void;
}) {
  const samples = CANDIDATES.slice(0, 3);
  const [idx, setIdx] = useState(0);
  const h: Household | undefined = samples[idx] ?? CANDIDATES[0];

  const changeBySignal = useMemo(() => {
    const map: Record<string, number> = {};
    if (h) for (const cp of ml(h).changePoints) map[cp.signal] = cp.week;
    return map;
  }, [h]);

  if (!h) {
    return (
      <div className="card card-pad text-sm text-slate-500">
        결합 급락 사례가 없습니다. (데이터 재생성 또는 ML 파이프라인 미실행)
      </div>
    );
  }

  const score = computeScore(h.signals, h.profileGroup).score;
  const m = ml(h);
  // 최근 2주에 꺾인 신호 수
  const recentChanged = m.changePoints.filter((c) => c.week >= 6).length;

  return (
    <div className="card overflow-hidden">
      <div className="card-head flex-wrap gap-2">
        <span className="card-title flex items-center gap-1.5">
          <Eye size={15} className="text-rose-500" />
          사람 눈으로는 못 잡는 결합 급락
        </span>
        <SimBadge label="합성 · ML 보조" />
      </div>

      <div className="space-y-3 p-4">
        <p className="text-sm leading-relaxed text-slate-600">
          개별 신호는 <b className="text-slate-800">모두 단일 임계 미만</b>이라 임계값(OR) 방식은
          놓칩니다. 그래프를 <b>하나씩</b> 보는 사람도 놓치기 쉽습니다. 하지만{" "}
          <b className="text-rose-600">{recentChanged}개 신호가 최근 동시에 꺾여</b> 다변량
          이상탐지가 <b className="text-rose-600">결합 이상</b>으로 포착합니다.
        </p>

        {/* 사례 선택 + 헤더 */}
        <div className="flex flex-wrap items-center gap-2">
          {samples.length > 1 && (
            <div className="flex gap-1">
              {samples.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => setIdx(i)}
                  aria-pressed={i === idx}
                  aria-label={`사례 ${s.id}`}
                  className={`chip border font-mono text-[11px] transition-all ${
                    i === idx
                      ? "border-rose-300 bg-rose-50 text-rose-700"
                      : "border-slate-200 bg-white text-slate-500 hover:border-rose-200"
                  }`}
                >
                  {s.id}
                </button>
              ))}
            </div>
          )}
          <span className="ml-auto flex items-center gap-2">
            <span className="text-xs text-slate-400">위험점수</span>
            <span className="tabular-nums text-lg font-bold text-slate-800">{score}</span>
            <AnomalyBadge household={h} />
          </span>
        </div>

        {/* 신호별 8주 궤적 — 작은 다중도 */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {SIGNAL_KEYS.map((key) => (
            <SignalTrajectory
              key={key}
              household={h}
              signalKey={key}
              changeWeek={changeBySignal[key]}
            />
          ))}
        </div>

        {/* 임계 미만 요약 */}
        <div className="flex flex-wrap gap-1.5">
          {SIGNAL_KEYS.filter((k) => SIGNAL_META[k].threshold != null).map((key) => {
            const meta = SIGNAL_META[key];
            const v = h.signals[meta.field];
            const over = v >= (meta.threshold ?? Infinity);
            return (
              <span
                key={key}
                className={`chip border !px-1.5 text-[10px] ${
                  over
                    ? "border-rose-200 bg-rose-50 text-rose-600"
                    : "border-slate-200 bg-slate-50 text-slate-500"
                }`}
              >
                {meta.short} {over ? "임계초과" : "임계미만"}
              </span>
            );
          })}
        </div>

        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50/60 px-3 py-2.5 text-xs leading-relaxed text-slate-600">
          <Info size={14} className="mt-0.5 shrink-0 text-rose-500" />
          <span>
            <b className="text-rose-700">왜 ML이 필요한가:</b> 단일 신호는 다 임계 미달이라 규칙·사람
            모두 놓치기 쉽지만, Isolation Forest가 <b>최근 주간 변화 벡터</b>에서 이 결합 급락을
            이상으로 잡아냅니다. 위험을 <i>판정</i>하는 게 아니라, 사람이 전수로 못 보는 대량 가구에서
            <b> 우선 볼 곳을 가리킬</b> 뿐입니다 — 최종 판단은 담당자.
          </span>
        </div>

        <button
          onClick={() => onGotoCase(h.id)}
          className="btn-secondary w-full !py-2 text-sm"
        >
          이 가구 케이스 상세 보기
          <ArrowUpRight size={15} />
        </button>
      </div>
    </div>
  );
}
