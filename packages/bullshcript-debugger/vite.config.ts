import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
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

// CI passes the build as JSON in BSDBG_BUILD_INFO; anywhere else it is an
// untracked build.
function buildInfo(): unknown {
  const fromEnv = process.env.BSDBG_BUILD_INFO;
  if (fromEnv) {
    return JSON.parse(fromEnv);
  }
  const script = fileURLToPath(
    new URL("./scripts/compute-build-string.mjs", import.meta.url)
  );
  const stdout = execFileSync(process.execPath, [script], {
    encoding: "utf8",
    env: { ...process.env, BSDBG_UNTRACKED: "1" },
  });
  return JSON.parse(stdout);
}

// gibbon's exports do not include its package.json, so the version is read
// from disk here.
function gibbonVersion(): string {
  const file = fileURLToPath(
    new URL("./node_modules/@blamnetwork/gibbon/package.json", import.meta.url)
  );
  return (JSON.parse(readFileSync(file, "utf8")) as { version: string })
    .version;
}

// Tauri expects a fixed dev port and serves dist/ when built.
export default defineConfig({
  plugins: [react(), dataService],
  clearScreen: false,
  server: { port: 1420, strictPort: true },
  define: {
    __BSDBG_BUILD__: JSON.stringify(buildInfo()),
    __BSDBG_GIBBON_VERSION__: JSON.stringify(gibbonVersion()),
    // Tauri sets TAURI_ENV_PLATFORM for the dev and build commands it runs; a
    // plain vite build gets false, so desktop-only code such as the update
    // check is left out of it.
    __BSDBG_DESKTOP__: JSON.stringify(Boolean(process.env.TAURI_ENV_PLATFORM)),
  },
  build: { target: "es2022", chunkSizeWarningLimit: 6000 },
});
