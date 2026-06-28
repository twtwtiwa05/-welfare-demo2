import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// 순수 정적 SPA + PWA(설치 가능한 앱처럼). 백엔드/서버리스 함수 없음(LLM은 시뮬레이션).
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "복지망 발굴·모니터링 보조 시스템",
        short_name: "복지망 보조",
        description:
          "투명 위험 점수 · ML 급속악화 선별 · 방문 동선으로 발굴 명단을 '행동 계획'으로 (합성 데이터 PoC).",
        lang: "ko",
        theme_color: "#2f6bbf",
        background_color: "#f1f5f9",
        display: "standalone",
        orientation: "portrait-primary",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        navigateFallback: "index.html",
      },
    }),
  ],
});
