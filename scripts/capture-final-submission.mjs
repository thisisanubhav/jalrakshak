import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const baseURL = process.env.EVIDENCE_BASE_URL ?? "https://jalrakshak-jharkhand.vercel.app";
const output = resolve("docs/submission/screenshots");
const browser = await chromium.launch();
await mkdir(output, { recursive: true });
const failures = [];

function monitor(page, name) {
  page.on("pageerror", (error) => failures.push(`${name}: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") failures.push(`${name}: ${message.text()}`);
  });
}

async function shot(page, name, fullPage = false) {
  await page.screenshot({
    path: resolve(output, name),
    animations: "disabled",
    fullPage,
  });
}

async function openDemo(page) {
  await page.goto(baseURL, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Explore Interactive Demo" }).click();
  await page.getByRole("heading", { name: "Explore JalRakshak" }).waitFor();
}

async function load(page, title) {
  const card = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: title, exact: true }),
  });
  await card.getByRole("button", { name: "Load Demo Scenario" }).click();
  await page
    .getByTestId("judge-scenario-detail")
    .getByRole("heading", { name: title, exact: true })
    .waitFor();
}

const mobile = await browser.newContext({
  viewport: { width: 390, height: 844 },
  serviceWorkers: "allow",
});
const page = await mobile.newPage();
monitor(page, "mobile");

await page.goto(baseURL, { waitUntil: "networkidle" });
await shot(page, "home-mobile.png");
await page.getByRole("button", { name: "Explore Interactive Demo" }).click();
await page.getByRole("heading", { name: "Explore JalRakshak" }).waitFor();
await shot(page, "interactive-demo-mobile.png");

await load(page, "Stable Measurements");
await shot(page, "stable-source-mobile.png", true);
await page.getByRole("img", { name: "Synthetic EC visit history" }).scrollIntoViewIfNeeded();
await shot(page, "ec-history-mobile.png");

await page.getByRole("button", { name: "All scenarios" }).click();
await load(page, "Measurement Disagreement");
await shot(page, "measurement-disagreement-mobile.png", true);

await page.getByRole("button", { name: "All scenarios" }).click();
await load(page, "Insufficient History");
await shot(page, "insufficient-history-mobile.png", true);

await page.getByRole("button", { name: "All scenarios" }).click();
await load(page, "EC Change Observed");
await shot(page, "ec-change-mobile.png", true);
await page.getByRole("button", { name: "Generate investigation report" }).click();
await page.getByRole("button", { name: "Back to scenario" }).click();

await page.evaluate(async () => globalThis.navigator.serviceWorker.ready);
await mobile.setOffline(true);
await page.reload();
await page.getByTestId("judge-scenario-detail").waitFor();
await shot(page, "offline-state-mobile.png");
await mobile.setOffline(false);
await mobile.close();

const hindi = await browser.newContext({
  viewport: { width: 390, height: 844 },
  serviceWorkers: "allow",
});
const hindiPage = await hindi.newPage();
monitor(hindiPage, "hindi");
await hindiPage.goto(baseURL, { waitUntil: "networkidle" });
await hindiPage.getByRole("button", { name: "Switch language" }).click();
await hindiPage.getByRole("button", { name: "इंटरैक्टिव डेमो देखें" }).click();
await hindiPage.getByRole("heading", { name: "जलरक्षक को समझें" }).waitFor();
await shot(hindiPage, "hindi-ui-mobile.png");
await hindi.close();

const desktop = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  serviceWorkers: "allow",
});
const desktopPage = await desktop.newPage();
monitor(desktopPage, "desktop");
await desktopPage.route("https://tile.openstreetmap.org/**", (route) => route.abort());
await openDemo(desktopPage);
await load(desktopPage, "EC Change Observed");
await desktopPage.getByRole("button", { name: "Generate investigation report" }).click();
await desktopPage.emulateMedia({ media: "print" });
await shot(desktopPage, "investigation-report-desktop.png", true);
await desktop.close();

const dashboard = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  serviceWorkers: "allow",
});
const dashboardPage = await dashboard.newPage();
monitor(dashboardPage, "dashboard");
await dashboardPage.route("https://tile.openstreetmap.org/**", (route) => route.abort());
await dashboardPage.goto(baseURL, { waitUntil: "networkidle" });
await dashboardPage.getByRole("button", { name: "Test Water Source" }).click();
await dashboardPage.getByLabel("Source name / identifier").fill("Synthetic submission handpump");
await dashboardPage.getByRole("button", { name: /Continue to testing/ }).click();
await dashboardPage.getByLabel("Demo scenario").selectOption("referral");
await dashboardPage.getByRole("button", { name: "Start screening" }).click();
await dashboardPage.getByRole("heading", { name: "Laboratory confirmation advised" }).waitFor();
await dashboardPage.getByRole("button", { name: "Save Test" }).click();
await dashboardPage.getByRole("button", { name: "Refer to Lab" }).click();
await dashboardPage.getByRole("navigation").getByRole("button", { name: "Dashboard" }).click();
await dashboardPage.getByRole("heading", { name: "Dashboard" }).waitFor();
await shot(dashboardPage, "dashboard-desktop.png");
await dashboard.close();

await browser.close();

if (failures.length) {
  throw new Error(`Production screenshot console errors:\n${failures.join("\n")}`);
}

process.stdout.write(`Captured public-production evidence from ${baseURL} in ${output}\n`);
