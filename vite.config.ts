import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// 순수 정적 SPA + PWA(설치 가능한 앱처럼). 백엔드/서버리스 함수 없음(LLM은 시뮬레이션).
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt", // 새 배포 시 자동 새로고침 대신 토스트로 안내(PwaUpdateToast)
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        id: "/",
        name: "이음누리 — 복지 사각지대 발굴·모니터링",
        short_name: "이음누리",
        description:
          "끊긴 위기 신호와 복지를 잇는 보조 시스템 — 투명 위험 점수 · ML 급속악화 선별 · 방문 동선 (합성 데이터 PoC).",
        lang: "ko",
        theme_color: "#256EF4",
        background_color: "#f4f5f6",
        display: "standalone",
        orientation: "portrait-primary",
        start_url: "/",
        scope: "/",
        categories: ["government", "utilities", "productivity"],
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // 앱 셸 + 번들(합성 데이터 JSON 포함)을 프리캐시 → 오프라인에서 명단·상세 열람 가능
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        navigateFallback: "index.html",
        runtimeCaching: [
          {
            // OSM 지도 타일 — 한 번 본 동선 지도는 현장(오프라인)에서도 보인다
            urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "osm-tiles",
              expiration: { maxEntries: 300, maxAgeSeconds: 7 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Pretendard CDN(css·woff2) — 오프라인에서도 동일 타이포
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "cdn-fonts",
              expiration: { maxEntries: 40, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
});
