/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";

// FM_API_PROXY points the dev server's /api at another backend, e.g. the running app
// on http://127.0.0.1:8765 to check a layout against real data. Default: local backend.
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  server: {
    host: "127.0.0.1",
    proxy: { "/api": loadEnv(mode, ".", "FM_").FM_API_PROXY || "http://127.0.0.1:8000" },
  },
  test: {
    environment: "jsdom",
    // Legacy Library regression tests cover the explicit rollback mode; release
    // integration tests opt in and the default-build contract is tested separately.
    env: { VITE_FM_GROUPED_TOURNAMENTS: "0" },
    setupFiles: ["./src/test/setup.ts"],
    css: false,
  },
}));
