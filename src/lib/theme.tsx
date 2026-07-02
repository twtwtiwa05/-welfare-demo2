import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

// 화면 테마 — KRDS 토큰 기반 다크모드 + 큰글씨(공무원 연령대 배려).
// html.dark 클래스와 html font-size만 조작한다. 컴포넌트는 dark: 토큰만 참조.

export type ThemeMode = "system" | "light" | "dark";
export type FontScale = "base" | "lg";

const MODE_KEY = "eum.theme.mode";
const FONT_KEY = "eum.theme.font";
/** index.css html 기본 17px(KRDS 최소) ↔ 큰글씨 19px */
const FONT_PX: Record<FontScale, string> = { base: "17px", lg: "19px" };
/** PWA 상태바 색 — 라이트=정부블루, 다크=다크 표면(night-900) */
const THEME_COLOR = { light: "#256EF4", dark: "#111318" };

function readStored<T extends string>(key: string, allowed: T[], fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return allowed.includes(v as T) ? (v as T) : fallback;
  } catch {
    return fallback;
  }
}

function systemDark(): boolean {
  return typeof window !== "undefined"
    ? window.matchMedia("(prefers-color-scheme: dark)").matches
    : false;
}

interface ThemeValue {
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  fontScale: FontScale;
  setFontScale: (f: FontScale) => void;
  /** 현재 실제로 다크인지 (mode=system 해석 결과 포함) */
  isDark: boolean;
}

const Ctx = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(() =>
    readStored(MODE_KEY, ["system", "light", "dark"], "system")
  );
  const [fontScale, setFontScale] = useState<FontScale>(() =>
    readStored(FONT_KEY, ["base", "lg"], "base")
  );
  const [sysDark, setSysDark] = useState(systemDark);

  // 시스템 다크 변경 구독 (mode=system일 때 반영)
  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSysDark(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  const isDark = mode === "dark" || (mode === "system" && sysDark);

  // html.dark + 글자 크기 + PWA 상태바 색 적용
  useEffect(() => {
    const html = document.documentElement;
    html.classList.toggle("dark", isDark);
    html.style.fontSize = FONT_PX[fontScale];
    html.style.colorScheme = isDark ? "dark" : "light";
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", isDark ? THEME_COLOR.dark : THEME_COLOR.light);
  }, [isDark, fontScale]);

  const value = useMemo<ThemeValue>(
    () => ({
      mode,
      setMode: (m) => {
        setMode(m);
        try {
          localStorage.setItem(MODE_KEY, m);
        } catch {
          /* 사생활 모드 등 저장 불가 환경 — 세션 메모리로만 유지 */
        }
      },
      fontScale,
      setFontScale: (f) => {
        setFontScale(f);
        try {
          localStorage.setItem(FONT_KEY, f);
        } catch {
          /* noop */
        }
      },
      isDark,
    }),
    [mode, fontScale, isDark]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTheme must be used within ThemeProvider");
  return v;
}
