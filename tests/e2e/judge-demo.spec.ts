import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

async function openJudgeDemo(page: Page) {
  await page.goto("/?legacy=1");
  await page.getByRole("button", { name: "Explore Interactive Demo" }).click();
  await expect(page.getByRole("heading", { name: "Explore JalRakshak" })).toBeVisible();
  await expect(page.getByText("SYNTHETIC DEMONSTRATION DATA").first()).toBeVisible();
}

async function loadScenario(page: Page, title: string) {
  const card = page.getByRole("article").filter({ has: page.getByRole("heading", { name: title }) });
  await card.getByRole("button", { name: "Load Demo Scenario" }).click();
  await expect(page.getByTestId("judge-scenario-detail").getByRole("heading", { name: title, exact: true })).toBeVisible();
}

test("stable scenario explains repeatability and source history", async ({ page }) => {
  await openJudgeDemo(page);
  await loadScenario(page, "Stable Measurements");
  await expect(page.getByText("Measurements repeatable", { exact: true })).toBeVisible();
  await expect(page.getByText("No unusual EC change observed", { exact: true })).toBeVisible();
  await expect(page.getByRole("img", { name: "Synthetic EC visit history" })).toBeVisible();
  await expect(page.getByTestId("judge-scenario-detail").getByText("610 µS/cm", { exact: true })).toBeVisible();
  await expect(page.getByTestId("judge-scenario-detail").getByText("618 µS/cm", { exact: true })).toBeVisible();
});

test("disagreement scenario requests a third reading and withholds source conclusion", async ({ page }) => {
  await openJudgeDemo(page);
  await loadScenario(page, "Measurement Disagreement");
  await expect(page.getByText("Measurement disagreement", { exact: true })).toBeVisible();
  await expect(page.getByText("Third reading required", { exact: true })).toBeVisible();
  await expect(page.getByText("No source-level conclusion", { exact: true })).toBeVisible();
  await expect(page.getByText(/610 µS\/cm and Reading 2 is 830 µS\/cm/)).toBeVisible();
});

test("insufficient scenario refuses to produce a baseline conclusion", async ({ page }) => {
  await openJudgeDemo(page);
  await loadScenario(page, "Insufficient History");
  await expect(page.getByText("Baseline not established", { exact: true })).toBeVisible();
  await expect(page.getByText(/More compatible repeatable visits are needed/)).toBeVisible();
  await expect(page.getByText("No unusual EC change observed", { exact: true })).toHaveCount(0);
});

test("change scenario shows transparent comparison and print-ready report", async ({ page }) => {
  await openJudgeDemo(page);
  await loadScenario(page, "EC Change Observed");
  await expect(page.getByText("Historical median", { exact: true })).toBeVisible();
  await expect(page.getByTestId("judge-scenario-detail").getByText("1,020 µS/cm", { exact: true })).toBeVisible();
  await expect(page.getByText("EC change observed", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Generate investigation report" }).click();
  await expect(page.getByRole("heading", { name: "EC Investigation Record" })).toBeVisible();
  await expect(page.getByText("Experimental software record — not a laboratory certificate")).toBeVisible();
  await expect(page.getByText("SYNTHETIC_DEMO", { exact: true })).toBeVisible();
  await expect(page.getByText(/Electrical conductivity does not identify specific contaminants/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Print / Save as PDF" })).toBeVisible();
  await page.emulateMedia({ media: "print" });
  await expect(page.getByRole("heading", { name: "EC Investigation Record" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Print / Save as PDF" })).toBeHidden();
  const pdf = await page.pdf({ format: "A4", printBackground: true });
  expect(pdf.byteLength).toBeGreaterThan(10_000);
});

test("demo snapshot and CSV export remain available offline after refresh", async ({ page, context }) => {
  await openJudgeDemo(page);
  await loadScenario(page, "Stable Measurements");
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByTestId("judge-scenario-detail").getByRole("heading", { name: "Stable Measurements" })).toBeVisible();
  await expect(page.getByText(/Offline · Stored locally/)).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export scenario CSV" }).click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).not.toBeNull();
  const csv = await readFile(path!, "utf8");
  expect(csv).toContain('"SYNTHETIC_DEMO"');
  expect(csv).toContain('"calibration_standard_us_cm"');
  await context.setOffline(false);
});

test("Hindi demo preserves synthetic and scientific guidance", async ({ page }) => {
  await page.goto("/?legacy=1");
  await page.getByRole("button", { name: /Switch language/ }).click();
  await page.getByRole("button", { name: "इंटरैक्टिव डेमो देखें" }).click();
  await expect(page.getByRole("heading", { name: "जलरक्षक को समझें" })).toBeVisible();
  const card = page.getByRole("article").filter({ has: page.getByRole("heading", { name: "EC में बदलाव दिखा" }) });
  await card.getByRole("button", { name: "डेमो परिदृश्य लोड करें" }).click();
  await expect(page.getByText("कृत्रिम प्रदर्शन डेटा").first()).toBeVisible();
  await expect(page.getByText(/केवल EC कारण या जल-सुरक्षा नहीं बता सकता/)).toBeVisible();
  await expect(page.getByRole("button", { name: "जाँच रिपोर्ट बनाएँ" })).toBeVisible();
});

test("judge demo has no horizontal overflow across supported widths", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openJudgeDemo(page);
  for (const width of [320, 360, 390, 430, 768, 1440]) {
    await page.setViewportSize({ width, height: width >= 768 ? 900 : 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  }
});
