import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { handleData } from "./scripts/data-service.mjs";

// In a browser the data service is the dev server's /data; Tauri runs its own.
const dataService: Plugin = {
  name: "bsdbg-data-service",
  configureServer(server) {
    server.middlewares.use("/data", handleData);
  },
};

// Tauri expects a fixed dev port and serves dist/ when built.
export default defineConfig({
  plugins: [react(), dataService],
  clearScreen: false,
  server: { port: 1420, strictPort: true },
  build: { target: "es2022", chunkSizeWarningLimit: 6000 },
});
