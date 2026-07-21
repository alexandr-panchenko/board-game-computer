import { defineConfig, devices } from "@playwright/test";

const remoteBaseUrl = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  reporter: "line",
  use: {
    baseURL: remoteBaseUrl ?? "http://127.0.0.1:41737",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  ...(remoteBaseUrl === undefined
    ? {
        webServer: {
          command: "bun run dev -- --host 127.0.0.1 --port 41737 --strictPort",
          url: "http://127.0.0.1:41737/api/health",
          reuseExistingServer: false,
          timeout: 120_000,
        },
      }
    : {}),
});
