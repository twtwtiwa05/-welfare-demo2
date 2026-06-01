import { useEffect, useMemo, useState } from "react";
import CandidateList from "./CandidateList";
import CaseDetail from "./CaseDetail";
import TodayWork from "./TodayWork";
import FilterToolbar, { EMPTY_FILTER, type CaseFilter } from "./FilterToolbar";
import { HOUSEHOLDS } from "../lib/data";
import { computeScore, riskBand } from "../lib/scoring";
import { useCaseState, STATUS_META } from "../lib/caseState";
import { caseMeta } from "../lib/caseMeta";
import type { Household } from "../lib/types";
import { RadioTower } from "lucide-react";

const RESIDUAL = HOUSEHOLDS.filter((h) => !h.haengbokFlagged);
const sc = (h: Household) => computeScore(h.signals, h.profileGroup).score;
const DONG_OPTIONS = [...new Set(RESIDUAL.map((h) => h.dong))].sort();

function downloadCsv(rows: string[][], filename: string) {
  const csv = rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  // 한글 깨짐 방지용 BOM
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// 대시보드 — 발굴 + 모니터링 운영 콘솔.
export default function Dashboard({
  selectedId,
  onSelect,
  globalQuery,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
  globalQuery: string;
}) {
  const { getStatus, getAssignee } = useCaseState();
  const [filter, setFilter] = useState<CaseFilter>(EMPTY_FILTER);

  // 헤더 글로벌 검색이 들어오면 대시보드 필터에 반영
  useEffect(() => {
    if (globalQuery) setFilter((f) => ({ ...f, query: globalQuery }));
  }, [globalQuery]);

  const filtered = useMemo(() => {
    const q = filter.query.trim().toLowerCase();
    return RESIDUAL.filter((h) => {
      if (q && !(`${h.id} ${h.dong}`.toLowerCase().includes(q))) return false;
      if (filter.dong && h.dong !== filter.dong) return false;
      if (filter.band && riskBand(sc(h)) !== filter.band) return false;
      if (filter.status && getStatus(h.id) !== filter.status) return false;
      if (filter.regOutOnly && h.registeredAlone) return false;
      return true;
    }).sort((a, b) => sc(b) - sc(a));
  }, [filter, getStatus]);

  const selected = HOUSEHOLDS.find((h) => h.id === selectedId) ?? RESIDUAL[0];

  function exportCsv() {
    const header = [
      "ID",
      "행정동",
      "연령대",
      "성별",
      "집단모형",
      "위험점수",
      "위험구간",
      "케이스유형",
      "처리상태",
      "담당자",
      "최근접촉(일)",
    ];
    const rows = filtered.map((h) => {
      const score = sc(h);
      return [
        h.id,
        h.dong,
        h.ageBand,
        h.sex === "F" ? "여" : "남",
        h.profileGroup,
        String(score),
        { high: "고위험", mid: "주의", low: "관찰" }[riskBand(score)],
        h.caseType ?? "-",
        STATUS_META[getStatus(h.id)].label,
        getAssignee(h.id),
        String(caseMeta(h, score).lastContactDays),
      ];
    });
    downloadCsv([header, ...rows], "잔여후보_명단.csv");
  }

  return (
    <div className="space-y-4">
      {/* 운영 콘솔 헤더 */}
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-slate-800">
            잔여 사각지대 모니터링
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            행복e음이 놓친 잔여 후보를 발굴하고 추세를 추적합니다
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <RadioTower size={13} /> 실시간 모니터링 중
        </span>
      </div>

      <FilterToolbar
        filter={filter}
        setFilter={setFilter}
        dongOptions={DONG_OPTIONS}
        resultCount={filtered.length}
        totalCount={RESIDUAL.length}
        onExportCsv={exportCsv}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <TodayWork selectedId={selectedId} onSelect={onSelect} />
          <CandidateList
            list={filtered}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        </div>
        <CaseDetail key={selected.id} household={selected} />
      </div>
    </div>
  );
}
