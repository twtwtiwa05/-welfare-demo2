import { useState } from "react";
import { computeScore } from "../lib/scoring";
import { caseLabel } from "../lib/caseLabels";
import {
  useCaseState,
  STATUS_ORDER,
  STATUS_META,
  ASSIGNEES,
} from "../lib/caseState";
import type { Household } from "../lib/types";
import RiskBadge from "./RiskBadge";
import StatusBadge from "./StatusBadge";
import { CheckSquare, UserPlus, X } from "lucide-react";

const sc = (h: Household) => computeScore(h.signals, h.profileGroup).score;

// 잔여 후보 리스트 — 필터된 목록을 받아 표시. 다중선택·일괄작업·상태배지 지원.
export default function CandidateList({
  list,
  selectedId,
  onSelect,
}: {
  list: Household[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const { getStatus, bulkSetStatus, bulkAssign } = useCaseState();
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const visibleIds = list.map((h) => h.id);
  const allChecked = visibleIds.length > 0 && visibleIds.every((id) => checked.has(id));
  const someChecked = checked.size > 0;

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setChecked(allChecked ? new Set() : new Set(visibleIds));
  }
  function clearSel() {
    setChecked(new Set());
  }
  const selectedIds = [...checked].filter((id) => visibleIds.includes(id));

  return (
    <div className="card overflow-hidden">
      <div className="card-head">
        <label className="flex cursor-pointer select-none items-center gap-2 card-title">
          <input
            type="checkbox"
            checked={allChecked}
            onChange={toggleAll}
            className="h-3.5 w-3.5 accent-brand-600"
            aria-label="전체 선택"
          />
          잔여 후보{" "}
          <span className="tabular-nums font-normal text-slate-400">
            ({list.length})
          </span>
        </label>
        {someChecked && (
          <span className="text-xs font-semibold text-brand-600">
            {selectedIds.length}건 선택
          </span>
        )}
      </div>

      {/* 일괄작업 바 */}
      {someChecked && (
        <div className="flex flex-wrap items-center gap-2 border-b border-brand-100 bg-brand-50/60 px-4 py-2.5 animate-popIn">
          <span className="flex items-center gap-1 text-xs font-bold text-brand-700">
            <CheckSquare size={14} /> 일괄작업
          </span>
          <BulkSelect
            placeholder="상태 변경"
            options={STATUS_ORDER.map((s) => ({ v: s, label: STATUS_META[s].label }))}
            onPick={(v) => {
              bulkSetStatus(selectedIds, v as never);
              clearSel();
            }}
          />
          <BulkSelect
            placeholder="담당자 배정"
            icon={<UserPlus size={13} />}
            options={ASSIGNEES.map((a) => ({ v: a, label: a }))}
            onPick={(v) => {
              bulkAssign(selectedIds, v);
              clearSel();
            }}
          />
          <button
            onClick={clearSel}
            className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-600"
          >
            <X size={13} /> 선택 해제
          </button>
        </div>
      )}

      <div className="scroll-slim max-h-[26rem] divide-y divide-slate-100 overflow-auto">
        {list.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-slate-400">
            조건에 맞는 후보가 없습니다
          </div>
        )}
        {list.map((h) => {
          const cl = caseLabel(h.caseType);
          const isChecked = checked.has(h.id);
          return (
            <div
              key={h.id}
              className={`flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                h.id === selectedId
                  ? "bg-brand-50 ring-1 ring-inset ring-brand-200"
                  : isChecked
                    ? "bg-brand-50/40"
                    : "hover:bg-slate-50"
              }`}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => toggle(h.id)}
                className="h-3.5 w-3.5 shrink-0 accent-brand-600"
                aria-label={`${h.id} 선택`}
              />
              <button
                onClick={() => onSelect(h.id)}
                className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
              >
                <span className="w-7 shrink-0 text-center tabular-nums text-lg font-bold text-slate-800">
                  {sc(h)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs text-slate-500">
                      {h.id}
                    </span>
                    <span className="text-xs text-slate-400">{h.dong}</span>
                    {!h.registeredAlone && (
                      <span className="rounded bg-slate-100 px-1 text-[10px] text-slate-500">
                        등록외
                      </span>
                    )}
                  </div>
                  {cl && (
                    <span className="text-[11px] font-semibold text-brand-600">
                      {cl.tag} · {cl.full}
                    </span>
                  )}
                </div>
                <StatusBadge status={getStatus(h.id)} size="sm" />
                <RiskBadge score={sc(h)} size="sm" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BulkSelect({
  placeholder,
  options,
  onPick,
  icon,
}: {
  placeholder: string;
  options: { v: string; label: string }[];
  onPick: (v: string) => void;
  icon?: React.ReactNode;
}) {
  return (
    <label className="inline-flex items-center gap-1 rounded-lg border border-brand-200 bg-white px-2 py-1 text-xs font-semibold text-brand-700">
      {icon}
      <select
        defaultValue=""
        onChange={(e) => {
          if (e.target.value) onPick(e.target.value);
          e.target.value = "";
        }}
        className="cursor-pointer bg-transparent text-xs font-semibold text-brand-700 focus:outline-none"
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o.v} value={o.v}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
