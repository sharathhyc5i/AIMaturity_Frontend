import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  // VITE_API_PROXY (in frontend/.env.local) points the dev server's /api at another API, e.g. the Azure one
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: env.VITE_API_PROXY || "http://localhost:8000",
          changeOrigin: true,
          secure: true,
        },
      },
    },
    build: {
      // frontend/dist: upload this folder to Azure Static Web Apps (the API is hosted separately)
      outDir: "dist",
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("@fluentui")) return "icons";
            if (id.includes("framer-motion")) return "motion";
            if (id.includes("node_modules")) return "vendor";
          },
        },
      },
    },
  };
});
