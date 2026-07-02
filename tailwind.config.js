/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  // 다크모드: html.dark 클래스 토글(테마 설정은 src/lib/theme.tsx가 관리)
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // 대한민국 정부 디자인시스템(KRDS) Primary 스케일 — 정부 표준 블루
        // 500(#256EF4)=기본 액션, 600(#0B50D0)=hover/pressed·본문 강조
        brand: {
          50: "#ECF2FE", // KRDS Primary 5  — 보조버튼/정보패널 배경
          100: "#D8E5FD", // Primary 10 — hover/선택 표면
          200: "#B1CEFB", // Primary 20 — 구분선/보조 그래픽
          300: "#86AFF9", // Primary 30
          400: "#4C87F6", // Primary 40 — 보조 액션/비활성 테두리
          500: "#256EF4", // Primary 50 — ★기본 액션(버튼·활성 링크·포커스)
          600: "#0B50D0", // Primary 60 — hover/pressed·본문 강조
          700: "#083891", // Primary 70 — 강조 텍스트
          800: "#052561", // Primary 80
          900: "#03163A", // Primary 90
          950: "#020F27", // Primary 95
        },
        // KRDS 시맨틱(시스템) 색 — 배지·알림·상태
        // 300 = 다크 표면 위 텍스트용 밝은 단계(500은 다크에서 4.5:1 미달)
        danger: { 50: "#FDEFEC", 300: "#F58A7B", 500: "#DE3412", 700: "#8A240F" },
        warning: { 50: "#FFF3DB", 500: "#FFB114", 700: "#9E6A00" },
        success: { 50: "#EAF6EC", 500: "#228738", 700: "#285D33" },
        info: { 50: "#E7F4FE", 500: "#0B78CB", 700: "#085691" },
        // KRDS Gray 30 — 카드/패널 표준 테두리(연회색)
        line: "#B1B8BE",
        // 다크모드 표면 토큰 — KRDS 톤의 차분한 무채색 다크(청색 끼 최소).
        // 900=페이지 배경, 850=카드, 800=올라온 표면(인풋/호버), 700=테두리, 600=강조 테두리
        night: {
          950: "#0B0D10",
          900: "#111318",
          850: "#181B21",
          800: "#1F232B",
          700: "#2E333D",
          600: "#3E4552",
        },
      },
      fontFamily: {
        sans: [
          "Pretendard GOV",
          "Pretendard Variable",
          "Pretendard",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "Malgun Gothic",
          "sans-serif",
        ],
      },
      // 정보 위계용 의미론적 타이포 스케일 (정제형 고급화)
      // size + lineHeight + weight + tracking을 한 클래스에 묶어 위계를 강제한다.
      fontSize: {
        display: ["1.75rem", { lineHeight: "2.125rem", fontWeight: "700", letterSpacing: "-0.02em" }],
        h1: ["1.375rem", { lineHeight: "1.75rem", fontWeight: "700", letterSpacing: "-0.015em" }],
        h2: ["1.125rem", { lineHeight: "1.5rem", fontWeight: "700", letterSpacing: "-0.01em" }],
        h3: ["0.9375rem", { lineHeight: "1.375rem", fontWeight: "600" }],
        caption: ["0.6875rem", { lineHeight: "0.9375rem", letterSpacing: "0.02em" }],
      },
      // KRDS 톤 — 그림자보다 '테두리'로 위계. 거의 평평하게(관공서 정보밀도)
      boxShadow: {
        card: "0 1px 1px rgba(30,33,36,0.03)",
        "card-hover": "0 1px 2px rgba(30,33,36,0.06), 0 4px 12px rgba(30,33,36,0.07)",
        header: "0 1px 0 rgba(30,33,36,0.06)",
        inset: "inset 0 1px 2px rgba(30,33,36,0.04)",
      },
      // KRDS 라운드: 6~8px 기조(각지게). 기존 rounded-xl/2xl을 KRDS 값으로 축소해
      // 컴포넌트 수정 없이 전체가 각진 정부 톤으로 전환된다.
      borderRadius: {
        DEFAULT: "0.375rem", // 6px
        md: "0.375rem", // 6px — 버튼·인풋·셀렉트(KRDS 기본)
        lg: "0.5rem", // 8px — 카드·패널(KRDS 표준)
        xl: "0.5rem", // 8px (기존 12px→축소)
        "2xl": "0.625rem", // 10px (기존 16px→축소)
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        popIn: {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        // 모바일 화면 푸시 전환(목록→상세) — iOS 내비게이션 감각
        slideIn: {
          from: { opacity: "0", transform: "translateX(14px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        // 바텀시트 등장 — 아래에서 스프링감 있게
        sheetUp: {
          from: { transform: "translateY(100%)" },
          "70%": { transform: "translateY(-0.4%)" },
          to: { transform: "translateY(0)" },
        },
      },
      animation: {
        fadeIn: "fadeIn 0.35s ease",
        popIn: "popIn 0.2s ease-out",
        slideIn: "slideIn 0.28s cubic-bezier(0.22, 1, 0.36, 1)",
        sheetUp: "sheetUp 0.34s cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};
