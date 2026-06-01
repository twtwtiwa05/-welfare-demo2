import Dashboard from "../Dashboard";

// 탭4 — 케이스 관리 (운영 콘솔). Phase 8에서 Heatmap/RisingTop 제거 + 우선순위 일치 정리.
export default function CaseBoard(props: {
  selectedId: string;
  onSelect: (id: string) => void;
  globalQuery: string;
}) {
  return <Dashboard {...props} />;
}
