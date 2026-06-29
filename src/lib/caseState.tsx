import { createContext, useContext, useMemo, useState } from "react";

// 케이스 처리 상태 저장소 — 진짜 케이스 관리 시스템의 워크플로우.
// 여러 화면(리스트·상세·워크리스트·일괄작업)이 같은 상태를 읽고 쓴다.
// 데모이므로 영속 저장은 없고 세션 메모리에만 둔다(원칙 4: AI가 아닌 담당자가 변경).

export type CaseStatus = "new" | "checking" | "visit" | "done";

export const STATUS_ORDER: CaseStatus[] = ["new", "checking", "visit", "done"];

export const STATUS_META: Record<
  CaseStatus,
  { label: string; chip: string; dot: string }
> = {
  new: {
    label: "신규",
    chip: "bg-slate-100 text-slate-600 border-slate-200",
    dot: "bg-slate-400",
  },
  checking: {
    label: "확인중",
    chip: "bg-amber-100 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
  visit: {
    label: "방문예정",
    chip: "bg-brand-100 text-brand-700 border-brand-200",
    dot: "bg-brand-500",
  },
  done: {
    label: "완료",
    chip: "bg-emerald-100 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
};

export const ASSIGNEES = ["김복지", "이상담", "박방문", "정돌봄"];

function seedOf(id: string): number {
  const m = id.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

/** 결정론적 기본 상태 (시드 기반, 재현 가능) */
export function defaultStatus(id: string): CaseStatus {
  const r = seedOf(id) % 10;
  if (r >= 9) return "done";
  if (r === 8) return "visit";
  if (r >= 6) return "checking";
  return "new";
}

export function defaultAssignee(id: string): string {
  return ASSIGNEES[seedOf(id) % ASSIGNEES.length];
}

interface Override {
  status?: CaseStatus;
  assignee?: string;
}

interface CaseStateValue {
  getStatus: (id: string) => CaseStatus;
  getAssignee: (id: string) => string;
  setStatus: (id: string, status: CaseStatus) => void;
  setAssignee: (id: string, assignee: string) => void;
  bulkSetStatus: (ids: string[], status: CaseStatus) => void;
  bulkAssign: (ids: string[], assignee: string) => void;
  /** ★ 긴급 SOS — 방문 중 위급상황 등록. 명단에 적색 표시·담당팀 공유 */
  isEmergency: (id: string) => boolean;
  setEmergency: (id: string, on: boolean) => void;
  emergencyIds: string[];
}

const Ctx = createContext<CaseStateValue | null>(null);

export function CaseStateProvider({ children }: { children: React.ReactNode }) {
  const [overrides, setOverrides] = useState<Record<string, Override>>({});
  const [emergencies, setEmergencies] = useState<Set<string>>(new Set());

  const value = useMemo<CaseStateValue>(() => {
    const getStatus = (id: string) => overrides[id]?.status ?? defaultStatus(id);
    const getAssignee = (id: string) =>
      overrides[id]?.assignee ?? defaultAssignee(id);
    const merge = (id: string, patch: Override) =>
      setOverrides((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
    const bulkMerge = (ids: string[], patch: Override) =>
      setOverrides((prev) => {
        const next = { ...prev };
        ids.forEach((id) => (next[id] = { ...next[id], ...patch }));
        return next;
      });
    return {
      getStatus,
      getAssignee,
      setStatus: (id, status) => merge(id, { status }),
      setAssignee: (id, assignee) => merge(id, { assignee }),
      bulkSetStatus: (ids, status) => bulkMerge(ids, { status }),
      bulkAssign: (ids, assignee) => bulkMerge(ids, { assignee }),
      isEmergency: (id) => emergencies.has(id),
      setEmergency: (id, on) =>
        setEmergencies((prev) => {
          const n = new Set(prev);
          if (on) n.add(id);
          else n.delete(id);
          return n;
        }),
      emergencyIds: [...emergencies],
    };
  }, [overrides, emergencies]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCaseState(): CaseStateValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCaseState must be used within CaseStateProvider");
  return v;
}
