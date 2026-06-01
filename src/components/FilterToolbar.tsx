import { useState } from "react";
import { Search, X, FileDown, Printer, SlidersHorizontal } from "lucide-react";
import { STATUS_ORDER, STATUS_META } from "../lib/caseState";

export interface CaseFilter {
  query: string;
  dong: string;
  band: string;
  status: string;
  regOutOnly: boolean;
}

export const EMPTY_FILTER: CaseFilter = {
  query: "",
  dong: "",
  band: "",
  status: "",
  regOutOnly: false,
};

const BAND_OPTIONS = [
  { v: "", label: "전체 위험도" },
  { v: "high", label: "고위험" },
  { v: "mid", label: "주의" },
  { v: "low", label: "관찰" },
];

export default function FilterToolbar({
  filter,
  setFilter,
  dongOptions,
  resultCount,
  totalCount,
  onExportCsv,
}: {
  filter: CaseFilter;
  setFilter: (f: CaseFilter) => void;
  dongOptions: string[];
  resultCount: number;
  totalCount: number;
  onExportCsv: () => void;
}) {
  const [toast, setToast] = useState<string | null>(null);
  const patch = (p: Partial<CaseFilter>) => setFilter({ ...filter, ...p });
  const active =
    filter.query || filter.dong || filter.band || filter.status || filter.regOutOnly;

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  }
  function handleCsv() {
    onExportCsv();
    showToast(`CSV ${resultCount}건을 내보냈습니다`);
  }
  function handlePdf() {
    showToast("인쇄 미리보기를 엽니다 (PDF 저장)");
    window.setTimeout(() => window.print(), 400);
  }

  return (
    <div className="card card-pad !py-3">
      <div className="flex flex-wrap items-center gap-2">
        {/* 검색 */}
        <div className="relative min-w-[180px] flex-1">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={filter.query}
            onChange={(e) => patch({ query: e.target.value })}
            placeholder="대상자 ID·행정동 검색"
            className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-9 pr-8 text-sm text-slate-700 placeholder:text-slate-400 focus-visible:border-brand-400"
          />
          {filter.query && (
            <button
              onClick={() => patch({ query: "" })}
              aria-label="검색어 지우기"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* 필터 셀렉트 */}
        <Select
          value={filter.dong}
          onChange={(v) => patch({ dong: v })}
          options={[
            { v: "", label: "전체 행정동" },
            ...dongOptions.map((d) => ({ v: d, label: d })),
          ]}
        />
        <Select
          value={filter.band}
          onChange={(v) => patch({ band: v })}
          options={BAND_OPTIONS}
        />
        <Select
          value={filter.status}
          onChange={(v) => patch({ status: v })}
          options={[
            { v: "", label: "전체 상태" },
            ...STATUS_ORDER.map((s) => ({ v: s, label: STATUS_META[s].label })),
          ]}
        />

        <label className="flex cursor-pointer select-none items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600">
          <input
            type="checkbox"
            checked={filter.regOutOnly}
            onChange={(e) => patch({ regOutOnly: e.target.checked })}
            className="h-3.5 w-3.5 accent-brand-600"
          />
          등록 외만
        </label>

        {active && (
          <button
            onClick={() => setFilter(EMPTY_FILTER)}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-400 hover:text-slate-600"
          >
            <X size={13} /> 초기화
          </button>
        )}

        {/* 내보내기 */}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={handleCsv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-all hover:border-brand-300 hover:text-brand-700 active:translate-y-px"
          >
            <FileDown size={14} /> Excel(CSV)
          </button>
          <button
            onClick={handlePdf}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-all hover:border-brand-300 hover:text-brand-700 active:translate-y-px"
          >
            <Printer size={14} /> PDF
          </button>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
        <SlidersHorizontal size={12} />
        <span>
          <b className="tabular-nums text-slate-600">{resultCount}</b>
          <span className="text-slate-400"> / {totalCount}건 표시</span>
        </span>
      </div>

      {toast && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-xl bg-slate-900/90 px-4 py-2.5 text-sm font-semibold text-white shadow-card-hover backdrop-blur animate-popIn">
          {toast}
        </div>
      )}
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { v: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-600 focus-visible:border-brand-400"
    >
      {options.map((o) => (
        <option key={o.v} value={o.v}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
