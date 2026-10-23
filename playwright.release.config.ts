import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

// GitHub-hosted Linux CI is the required verification path. Local execution is optional.
// Keep browser sandboxing enabled on every host.
const releaseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3217";
export default defineConfig(base, {
  retries: 0,
  workers: 1,
  timeout: 60_000,
  outputDir: "test-results/release",
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }], ["json", { outputFile: "test-results/release-results.json" }]],
  use: { ...base.use, baseURL: releaseUrl, trace: "retain-on-failure", screenshot: "only-on-failure", video: "retain-on-failure", launchOptions: { chromiumSandbox: true } },
  webServer: process.env.PLAYWRIGHT_BASE_URL ? undefined : {
    command: "npm run start -- --hostname 127.0.0.1 --port 3217",
    url: releaseUrl,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
