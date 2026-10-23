import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

// Run on a normal user terminal or Linux host. Never weaken OS/browser security
// to work around an agent process that cannot register macOS browser services.
export default defineConfig(base, {
  retries: 0,
  workers: 1,
  timeout: 60_000,
  outputDir: "test-results/release",
  reporter: [["list"], ["json", { outputFile: "test-results/release-results.json" }]],
  use: { ...base.use, launchOptions: { chromiumSandbox: true } },
  webServer: base.webServer ? { ...base.webServer, reuseExistingServer: false } : undefined,
});
