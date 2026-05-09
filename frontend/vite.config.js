import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiTarget = env.VITE_API_PROXY_TARGET || "http://localhost:4000";

  return {
    plugins: [react()],
    server: {
      port: 5173,
      // Proxy API calls in dev so we don't have to deal with CORS.
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
        },
        "/admin": {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: "dist",
      sourcemap: true,
    },
  };
});
