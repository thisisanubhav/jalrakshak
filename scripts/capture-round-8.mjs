import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const baseURL = process.env.EVIDENCE_BASE_URL ?? "http://127.0.0.1:3100";
const output = resolve("docs/screenshots/round-8");
const browser = await chromium.launch();
await mkdir(output, { recursive: true });
const failures = [];

function monitor(page, name) {
  page.on("pageerror", (error) => failures.push(`${name}: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") failures.push(`${name}: ${message.text()}`);
  });
}

async function shot(page, name) {
  await page.evaluate(() => globalThis.scrollTo(0, 0));
  await page.screenshot({ path: resolve(output, name), animations: "disabled" });
}

async function openDemo(page) {
  await page.goto(baseURL);
  await page.getByRole("button", { name: "Explore Interactive Demo" }).click();
  await page.getByRole("heading", { name: "Explore JalRakshak" }).waitFor();
}

async function load(page, title) {
  const card = page.getByRole("article").filter({ has: page.getByRole("heading", { name: title, exact: true }) });
  const button = card.getByRole("button");
  await button.click();
  await page.getByTestId("judge-scenario-detail").getByRole("heading", { name: title, exact: true }).waitFor();
}

const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: "allow" });
const desktopPage = await desktop.newPage();
monitor(desktopPage, "desktop");
await openDemo(desktopPage);
await shot(desktopPage, "demo-landing-desktop.png");
await desktop.close();

const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "allow" });
const page = await mobile.newPage();
monitor(page, "mobile");
await openDemo(page);
await shot(page, "demo-landing-mobile.png");

await load(page, "Stable Measurements");
await shot(page, "stable-scenario-mobile.png");
await page.getByRole("button", { name: "All scenarios" }).click();
await load(page, "Measurement Disagreement");
await shot(page, "disagreement-scenario-mobile.png");
await page.getByRole("button", { name: "All scenarios" }).click();
await load(page, "Insufficient History");
await shot(page, "insufficient-history-mobile.png");
await page.getByRole("button", { name: "All scenarios" }).click();
await load(page, "EC Change Observed");
await shot(page, "ec-change-scenario-mobile.png");
await page.getByRole("img", { name: "Synthetic EC visit history" }).scrollIntoViewIfNeeded();
await shot(page, "ec-history-mobile.png");
await page.getByRole("button", { name: "Generate investigation report" }).click();
await shot(page, "investigation-report-mobile.png");
await page.getByRole("button", { name: "Back to scenario" }).click();
await mobile.setOffline(true);
await page.reload();
await page.getByTestId("judge-scenario-detail").waitFor();
await shot(page, "offline-demo-mobile.png");
await mobile.setOffline(false);
await mobile.close();

const hindi = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "allow" });
const hindiPage = await hindi.newPage();
monitor(hindiPage, "hindi");
await hindiPage.goto(baseURL);
await hindiPage.getByRole("button", { name: "Switch language" }).click();
await hindiPage.getByRole("button", { name: "इंटरैक्टिव डेमो देखें" }).click();
await hindiPage.getByRole("heading", { name: "जलरक्षक को समझें" }).waitFor();
await shot(hindiPage, "hindi-demo-mobile.png");
await hindi.close();

await browser.close();
if (failures.length) throw new Error(`Browser console errors:\n${failures.join("\n")}`);
process.stdout.write(`Captured Round 8 evidence in ${output}\n`);
