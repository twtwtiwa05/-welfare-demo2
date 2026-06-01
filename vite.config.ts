import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 순수 정적 SPA. 백엔드/서버리스 함수 없음(LLM은 시뮬레이션).
export default defineConfig({
  plugins: [react()],
});
