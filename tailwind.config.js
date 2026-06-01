/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // 차분한 행정 도구 톤 — 남색/파랑 기조 (5-A.7)
        brand: {
          50: "#f3f7fc",
          100: "#e3edf8",
          200: "#c9d9ef",
          300: "#a0bce2",
          400: "#6f97d1",
          500: "#4a76bf",
          600: "#2f6bbf",
          700: "#2a548f",
          800: "#284975",
          900: "#263f61",
          950: "#1b2c45",
        },
      },
      fontFamily: {
        sans: [
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
      // 은은한 그림자 위계 — '정제된' 깊이감 (네온·글로우 금지, 5-A.7)
      boxShadow: {
        card: "0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.05)",
        "card-hover":
          "0 2px 4px rgba(15,23,42,0.05), 0 6px 16px rgba(15,23,42,0.08)",
        header: "0 1px 0 rgba(15,23,42,0.04), 0 1px 12px rgba(15,23,42,0.03)",
        inset: "inset 0 1px 2px rgba(15,23,42,0.04)",
      },
      borderRadius: {
        xl: "0.75rem",
        "2xl": "1rem",
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
      },
      animation: {
        fadeIn: "fadeIn 0.35s ease",
        popIn: "popIn 0.2s ease-out",
      },
    },
  },
  plugins: [],
};
