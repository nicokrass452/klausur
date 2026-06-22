/// <reference types="vitest" />
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const devServerPort = Number(env.VITE_DEV_SERVER_PORT ?? 5177);
  const devHmrClientPort = Number(env.VITE_DEV_HMR_CLIENT_PORT ?? devServerPort);

  return {
    plugins: [react()],
    server: {
      host: "0.0.0.0",
      port: devServerPort,
      strictPort: true,
      hmr: {
        host: "localhost",
        clientPort: devHmrClientPort
      }
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/setupTests.ts',
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return undefined;

            if (
              id.includes("/react/") ||
              id.includes("/react-dom/") ||
              id.includes("/react-router-dom/")
            ) {
              return "react-vendor";
            }

            if (id.includes("/@supabase/")) {
              return "supabase";
            }

            if (id.includes("/lucide-react/")) {
              return "ui";
            }

            if (
              id.includes("/zustand/") ||
              id.includes("/idb/") ||
              id.includes("/clsx/")
            ) {
              return "utils";
            }

            return undefined;
          }
        }
      }
    }
  };
});
