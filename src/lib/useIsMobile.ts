import { useEffect, useState } from "react";

// 모바일 여부 — Tailwind lg(1024px) 미만이면 모바일 전용 앱으로 분기.
// ⚠️ 데스크톱(발표용 4탭)과 모바일(현장용 2탭)을 완전히 분리한다.
const QUERY = "(max-width: 1023px)";

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(QUERY).matches : false
  );

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const onChange = () => setIsMobile(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
