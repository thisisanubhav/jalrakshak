import { defineConfig, devices } from "@playwright/test";

const deployedBaseUrl = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  // One worker everywhere: the suite shares a single test server and team database,
  // so parallel spec files overwrite each other's accounts, sources and assignments.
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: deployedBaseUrl ?? "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: deployedBaseUrl
    ? undefined
    : {
        // Never let the suite reach a developer's real private-data database, and
        // never reuse a server started with different environment variables. The
        // setup key matches the value the specs post to /api/team/setup.
        env: {
          JALRAKSHAK_SETUP_TOKEN: "release-tests-only-setup-key",
          JALRAKSHAK_TEAM_DB: "test-results/team-local.sqlite",
        },
        command: "npm run start -- --hostname 127.0.0.1 --port 3100",
        url: "http://127.0.0.1:3100",
        reuseExistingServer: false,
        timeout: 120_000,
      },
});
