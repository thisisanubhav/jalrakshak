import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const baseURL = process.env.EVIDENCE_BASE_URL ?? "http://127.0.0.1:3100";
const output = resolve("docs/screenshots/round-6");
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
  await page.screenshot({ path: resolve(output, name), animations: "disabled" });
}
async function openEC(page) {
  await page.goto(baseURL);
  await page.getByRole("button", { name: "Open Experimental EC" }).click();
}
async function saveVisit(page, one, two, three) {
  await page.getByLabel(/Reading 1/).fill(String(one));
  await page.getByLabel(/Reading 2/).fill(String(two));
  await page.getByRole("button", { name: "Review repeatability" }).click();
  if (three !== undefined) {
    await page.getByLabel(/Reading 3/).fill(String(three));
    await page.getByRole("button", { name: "Review repeatability" }).click();
  } else {
    await page.getByRole("button", { name: "Save experimental measurement" }).click();
  }
  await page.getByText("Measurement saved on this device", { exact: true }).waitFor();
}

const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "allow" });
const page = await mobile.newPage();
monitor(page, "mobile");
await page.goto(baseURL);
await shot(page, "home-mobile.png");
await openEC(page);
await shot(page, "experimental-ec-home-mobile.png");
await page.getByRole("button", { name: "Start EC measurement" }).click();
await page.getByRole("button", { name: "Register and continue" }).click();
await page.getByRole("heading", { name: "Experimental device record" }).waitFor();
await page.evaluate(() => window.scrollTo(0, 0));
await shot(page, "device-registration-mobile.png");
await page.getByLabel("Device ID").fill("JR-ROUND6-A");
await page.getByLabel("Probe ID").fill("JR-ROUND6-A-P");
await page.getByLabel("CALIBRATION RECORDED").check();
await page.getByLabel("Last calibration date").fill(new Date().toISOString().slice(0, 10));
await page.getByLabel("Calibration standard (µS/cm)").fill("1413");
await page.getByRole("button", { name: "Save device and continue" }).click();
await page.getByRole("heading", { name: "Record repeatable EC readings" }).waitFor();
await page.evaluate(() => window.scrollTo(0, 0));
await shot(page, "ec-measurement-mobile.png");
await page.getByLabel(/Reading 1/).fill("600");
await page.getByLabel(/Reading 2/).fill("605");
await page.getByRole("button", { name: "Review repeatability" }).click();
await page.getByText("Measurements agree", { exact: true }).scrollIntoViewIfNeeded();
await shot(page, "repeatability-result-mobile.png");
await page.getByRole("button", { name: "Save experimental measurement" }).click();

await page.getByRole("button", { name: "Add another visit" }).click();
await page.getByLabel(/Reading 1/).fill("500");
await page.getByLabel(/Reading 2/).fill("700");
await page.getByRole("button", { name: "Review repeatability" }).click();
await page.getByText("Measurements do not agree", { exact: true }).scrollIntoViewIfNeeded();
await shot(page, "measurement-disagreement-mobile.png");
await page.getByLabel(/Reading 3/).fill("505");
await shot(page, "third-reading-mobile.png");
await page.getByRole("button", { name: "Review repeatability" }).click();

await page.getByRole("button", { name: "Add another visit" }).click();
await saveVisit(page, 610, 612);
await page.getByRole("button", { name: "Add another visit" }).click();
await saveVisit(page, 620, 622);
await page.getByRole("button", { name: "Back" }).click();
await page.getByRole("button", { name: "Start EC measurement" }).click();
await page.getByRole("button", { name: "Use selected source" }).click();
await page.getByLabel("Device ID").fill("JR-ROUND6-B");
await page.getByLabel("Probe ID").fill("JR-ROUND6-B-P");
await page.getByLabel("CALIBRATION RECORDED").check();
await page.getByLabel("Last calibration date").fill(new Date().toISOString().slice(0, 10));
await page.getByLabel("Calibration standard (µS/cm)").fill("1413");
await page.getByRole("button", { name: "Save device and continue" }).click();
await saveVisit(page, 615, 617);
await page.getByRole("button", { name: "Back" }).click();
await page.getByRole("button", { name: "Start EC measurement" }).click();
await page.getByRole("button", { name: "Use selected source" }).click();
await page.getByLabel("Select a saved device").selectOption({ label: "JR-ROUND6-A / JR-ROUND6-A-P" });
await page.getByRole("button", { name: "Use selected device" }).click();
await saveVisit(page, 800, 805);
await shot(page, "ec-change-comparison-mobile.png");

await page.getByRole("button", { name: "View EC history" }).click();
await shot(page, "ec-history-mobile.png");
await page.getByText(/Different device or probe/).scrollIntoViewIfNeeded();
await shot(page, "incomparable-history-mobile.png");
await page.getByRole("button", { name: "Back" }).click();
await page.getByRole("button", { name: "Start EC measurement" }).click();
await page.getByRole("button", { name: "Use selected source" }).click();
await page.getByRole("button", { name: "Use selected device" }).click();
await mobile.setOffline(true);
await page.getByLabel(/Reading 1/).fill("650");
await page.getByLabel(/Reading 2/).fill("652");
await page.getByRole("button", { name: "Review repeatability" }).click();
await page.getByRole("button", { name: "Save experimental measurement" }).click();
await page.getByText("Measurement saved on this device", { exact: true }).waitFor();
await shot(page, "offline-ec-state-mobile.png");
await mobile.setOffline(false);
await page.getByRole("button", { name: "Switch language" }).click();
await shot(page, "hindi-ec-result-mobile.png");
await mobile.close();

const screening = await browser.newContext({ viewport: { width: 390, height: 844 } });
const screeningPage = await screening.newPage();
monitor(screeningPage, "screening");
await screeningPage.goto(baseURL);
await screeningPage.getByRole("button", { name: "Test Water Source" }).click();
await screeningPage.getByRole("button", { name: /Continue to testing/ }).click();
await screeningPage.getByRole("heading", { name: "Water screening" }).waitFor();
await screeningPage.evaluate(() => window.scrollTo(0, 0));
await shot(screeningPage, "screening-demo-mobile.png");
await screening.close();

const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const desktopPage = await desktop.newPage();
monitor(desktopPage, "desktop");
await desktopPage.goto(baseURL);
await shot(desktopPage, "home-desktop.png");
await desktopPage.getByRole("button", { name: "Test Water Source" }).click();
await desktopPage.getByRole("button", { name: /Continue to testing/ }).click();
await desktopPage.getByRole("heading", { name: "Water screening" }).waitFor();
await desktopPage.getByLabel("Demo scenario").selectOption("referral");
await desktopPage.getByRole("button", { name: "Start screening" }).click();
await desktopPage.getByRole("heading", { name: "Laboratory confirmation advised" }).waitFor();
await desktopPage.getByRole("button", { name: "Save Test" }).click();
await desktopPage.getByRole("button", { name: /Saved on device/ }).waitFor();
await desktopPage.getByRole("navigation").getByRole("button", { name: "Dashboard" }).click();
await shot(desktopPage, "dashboard-desktop.png");
await desktop.close();

await browser.close();
if (failures.length) {
  throw new Error(`Browser console errors:\n${failures.join("\n")}`);
}
process.stdout.write(`Captured Round 6 evidence in ${output}\n`);
