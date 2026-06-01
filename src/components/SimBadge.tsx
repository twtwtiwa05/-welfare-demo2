import { FlaskConical } from "lucide-react";

// "시뮬레이션" 라벨 뱃지 — 진짜 계산이 아니라 미리 정해둔 값임을 명시(plan 0절 원칙 3).
// 정직함이 이 프로젝트의 핵심 무기. 시뮬 지점마다 부착한다.
export default function SimBadge({
  label = "시뮬레이션",
  title,
}: {
  label?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 align-middle text-xs font-semibold text-amber-700 shadow-sm"
    >
      <FlaskConical size={12} strokeWidth={2.2} />
      {label}
    </span>
  );
}
