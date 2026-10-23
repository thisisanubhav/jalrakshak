import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

// Run on a normal user terminal or Linux host. Never weaken OS/browser security
// to work around an agent process that cannot register macOS browser services.
const releaseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3217";
export default defineConfig(base, {
  retries: 0,
  workers: 1,
  timeout: 60_000,
  outputDir: "test-results/release",
  reporter: [["list"], ["json", { outputFile: "test-results/release-results.json" }]],
  use: { ...base.use, baseURL: releaseUrl, launchOptions: { chromiumSandbox: true } },
  webServer: process.env.PLAYWRIGHT_BASE_URL ? undefined : {
    command: "npm run start -- --hostname 127.0.0.1 --port 3217",
    url: releaseUrl,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
