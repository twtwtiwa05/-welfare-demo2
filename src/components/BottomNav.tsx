import type { ReactNode } from "react";

// 모바일 하단 탭바 (작업 C). 엄지 도달 영역 · 터치 타겟 ≥44px. 데스크톱은 숨김(상단 탭 유지).
export interface BottomNavItem<K extends string> {
  key: K;
  label: string;
  icon: ReactNode;
  star?: boolean;
}

export default function BottomNav<K extends string>({
  items,
  active,
  onChange,
}: {
  items: BottomNavItem<K>[];
  active: K;
  onChange: (key: K) => void;
}) {
  return (
    <nav
      aria-label="하단 탭"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      <div className="mx-auto grid max-w-md grid-cols-4">
        {items.map((it) => {
          const isActive = it.key === active;
          return (
            <button
              key={it.key}
              onClick={() => onChange(it.key)}
              aria-current={isActive ? "page" : undefined}
              className={`relative flex min-h-[56px] flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[11px] font-semibold transition-colors ${
                isActive ? "text-brand-700" : "text-slate-400"
              }`}
            >
              {isActive && (
                <span className="absolute top-0 h-0.5 w-8 rounded-full bg-brand-600" />
              )}
              <span className="relative">
                {it.icon}
                {it.star && (
                  <span
                    aria-hidden="true"
                    className={`absolute -right-1.5 -top-1 h-1.5 w-1.5 rounded-full ${
                      isActive ? "bg-brand-500" : "bg-amber-400"
                    }`}
                  />
                )}
              </span>
              {it.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
