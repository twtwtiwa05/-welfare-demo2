// 방문 체크·한 줄 메모 로컬 영속화 — 현장에서 앱을 닫아도 오늘 진행 상황이 남는다.
// ⚠️ 데모: localStorage(단말 로컬)에만 저장. 실서비스는 서버 동기화 + 권한 통제 필요.

export interface VisitLog {
  /** 방문 완료한 대상자 id */
  visited: string[];
  /** id → 한 줄 메모 */
  memos: Record<string, string>;
}

/** 오늘 날짜 기반 저장 키 — 자정 롤오버 감지용으로 export */
export function todayKey(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `eum.visitlog.${d.getFullYear()}-${mm}-${dd}`;
}

export const EMPTY_LOG: VisitLog = { visited: [], memos: {} };

export function loadVisitLog(): VisitLog {
  try {
    const raw = localStorage.getItem(todayKey());
    if (!raw) return EMPTY_LOG;
    const parsed = JSON.parse(raw) as Partial<VisitLog>;
    return {
      visited: Array.isArray(parsed.visited) ? parsed.visited : [],
      memos: parsed.memos && typeof parsed.memos === "object" ? parsed.memos : {},
    };
  } catch {
    return EMPTY_LOG;
  }
}

/**
 * 저장은 호출자가 로드한 날의 키에 고정한다 — 자정을 넘겨도 어제 기록이
 * 오늘 키로 이월되지 않는다(키 미지정 시 오늘 키).
 */
export function saveVisitLog(log: VisitLog, key: string = todayKey()): void {
  try {
    localStorage.setItem(key, JSON.stringify(log));
  } catch {
    /* 저장 불가 환경 — 세션 메모리로만 동작 */
  }
}

// ── 마지막 동기화 시각 (pull-to-refresh와 연동) ─────────────────
const SYNC_KEY = "eum.lastSync";

/** "09:00" 형식. 저장된 값이 없으면 데모 기본값 "09:00" */
export function loadLastSync(): string {
  try {
    return localStorage.getItem(SYNC_KEY) ?? "09:00";
  } catch {
    return "09:00";
  }
}

export function stampLastSync(): string {
  const d = new Date();
  const t = `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
  try {
    localStorage.setItem(SYNC_KEY, t);
  } catch {
    /* noop */
  }
  return t;
}
