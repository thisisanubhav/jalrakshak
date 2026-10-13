import { expect, test, type Page } from "@playwright/test";

const today = new Date().toISOString().slice(0, 10);

async function openExperimentalEC(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Open Experimental EC" }).click();
  await expect(page.getByRole("heading", { name: "Experimental EC" })).toBeVisible();
}

async function registerECSource(page: Page, suffix: string) {
  await page.getByRole("button", { name: "Start EC measurement" }).click();
  await page.getByLabel("Source name / identifier").fill(`E2E handpump ${suffix}`);
  await page.getByRole("button", { name: "Register and continue" }).click();
  await expect(page.getByRole("heading", { name: "Experimental device record" })).toBeVisible();
}

async function createDevice(
  page: Page,
  id: string,
  calibration: "recorded" | "unrecorded" = "recorded",
) {
  await page.getByLabel("Device ID").fill(id);
  await page.getByLabel("Probe ID").fill(`${id}-P`);
  if (calibration === "recorded") {
    await page.getByLabel("CALIBRATION RECORDED").check();
    await page.getByLabel("Last calibration date").fill(today);
    await page.getByLabel("Calibration standard (µS/cm)").fill("1413");
  }
  await page.getByRole("button", { name: "Save device and continue" }).click();
  await expect(page.getByRole("heading", { name: "Record repeatable EC readings" })).toBeVisible();
}

async function saveECVisit(
  page: Page,
  first: number,
  second: number,
  third?: number,
) {
  await page.getByLabel(/Reading 1/).fill(String(first));
  await page.getByLabel(/Reading 2/).fill(String(second));
  await page.getByRole("button", { name: "Review repeatability" }).click();
  if (third !== undefined) {
    await expect(page.getByText("Measurements do not agree", { exact: true })).toBeVisible();
    await page.getByLabel(/Reading 3/).fill(String(third));
    await page.getByRole("button", { name: "Review repeatability" }).click();
  } else {
    await expect(page.getByRole("button", { name: "Save experimental measurement" })).toBeVisible();
    await page.getByRole("button", { name: "Save experimental measurement" }).click();
  }
  await expect(page.getByText("Measurement saved on this device", { exact: true })).toBeVisible();
}

async function returnToECHome(page: Page) {
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page.getByRole("heading", { name: "Experimental EC" })).toBeVisible();
}

test("Screening Demo completes referral, map, history, and dashboard flow", async ({ page, context }) => {
  await context.route("https://tile.openstreetmap.org/**", (route) => route.abort());
  await page.goto("/");
  await page.getByRole("button", { name: "Test Water Source" }).click();
  await page.getByLabel("Source name / identifier").fill("E2E referral handpump");
  await page.getByRole("button", { name: /Continue to testing/ }).click();
  await page.getByLabel("Demo scenario").selectOption("referral");
  await page.getByRole("button", { name: "Start screening" }).click();
  await expect(page.getByRole("heading", { name: "Laboratory confirmation advised" })).toBeVisible();
  await page.getByRole("button", { name: "Save Test" }).click();
  await expect(page.getByRole("button", { name: /Saved on device/ })).toBeDisabled();
  await page.getByRole("button", { name: "Refer to Lab" }).click();
  await expect(page.getByRole("button", { name: /Referral created/ })).toBeDisabled();
  await page.getByRole("button", { name: /See source on map/ }).click();
  await expect(page.getByRole("heading", { name: "Water source map" })).toBeVisible();
  await page.getByRole("button", { name: /Open source history/ }).first().click();
  await expect(page.getByRole("heading", { name: "Source screening history" })).toBeVisible();
  await expect(page.getByText("Laboratory referral", { exact: true })).toBeVisible();
  await page.getByRole("navigation").getByRole("button", { name: "Dashboard" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByRole("row", { name: /Khunti Handpump Lab referral/ })).toBeVisible();
});

test("device calibration states and disagreement recovery are explicit", async ({ page }) => {
  await openExperimentalEC(page);
  await registerECSource(page, "quality");

  await expect(page.getByLabel("CALIBRATION NOT RECORDED")).toBeChecked();
  await expect(page.getByLabel("Calibration standard (µS/cm)")).toHaveCount(0);
  await createDevice(page, "JR-E2E-NOCAL", "unrecorded");
  await expect(page.getByText("CALIBRATION NOT RECORDED", { exact: true })).toBeVisible();
  await saveECVisit(page, 500, 700, 505);
  await expect(page.getByRole("heading", { name: "Measurement quality failure" })).toBeVisible();

  await returnToECHome(page);
  await page.getByRole("button", { name: "Start EC measurement" }).click();
  await page.getByRole("button", { name: "Use selected source" }).click();
  await page.getByLabel("Device ID").fill("JR-E2E-CAL");
  await page.getByLabel("Probe ID").fill("JR-E2E-CAL-P");
  await page.getByLabel("CALIBRATION RECORDED").check();
  await page.getByRole("button", { name: "Save device and continue" }).click();
  await expect(page.getByText(/Use a real calibration date/)).toBeVisible();
  await page.getByLabel("Last calibration date").fill(today);
  await page.getByLabel("Calibration standard (µS/cm)").fill("1413");
  await page.getByRole("button", { name: "Save device and continue" }).click();
  await expect(page.getByText("CALIBRATION RECORDED", { exact: true })).toBeVisible();
});

test("history baseline excludes incompatible visits from the analytical trend", async ({ page }) => {
  await openExperimentalEC(page);
  await registerECSource(page, "history");
  await createDevice(page, "JR-E2E-A");
  await saveECVisit(page, 600, 605);
  for (const readings of [[610, 612], [620, 622]] as const) {
    await page.getByRole("button", { name: "Add another visit" }).click();
    await saveECVisit(page, readings[0], readings[1]);
  }

  await returnToECHome(page);
  await page.getByRole("button", { name: "Start EC measurement" }).click();
  await page.getByRole("button", { name: "Use selected source" }).click();
  await createDevice(page, "JR-E2E-B");
  await saveECVisit(page, 615, 617);

  await returnToECHome(page);
  await page.getByRole("button", { name: "Start EC measurement" }).click();
  await page.getByRole("button", { name: "Use selected source" }).click();
  await page.getByLabel("Select a saved device").selectOption({ label: "JR-E2E-A / JR-E2E-A-P" });
  await page.getByRole("button", { name: "Use selected device" }).click();
  await saveECVisit(page, 800, 805);
  await expect(page.getByRole("heading", { name: "EC change observed" })).toBeVisible();
  await page.getByRole("button", { name: "View EC history" }).click();
  await expect(page.getByText("Comparable measurements", { exact: true })).toBeVisible();
  await expect(page.getByText("Not included in comparison", { exact: true })).toBeVisible();
  await expect(page.getByText(/Different device or probe/)).toBeVisible();
});

test("offline EC save survives refresh and reconnect without duplication", async ({ page, context }) => {
  await openExperimentalEC(page);
  await registerECSource(page, "offline");
  await createDevice(page, "JR-E2E-OFFLINE");
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await context.setOffline(true);
  await saveECVisit(page, 640, 642);
  await expect(page.getByText(/Works offline — records stay/)).toBeVisible();
  await page.reload();
  await expect(page.getByText("Measurement saved on this device", { exact: true })).toBeVisible();
  await context.setOffline(false);
  await page.reload();
  await page.getByRole("button", { name: "View EC history" }).click();
  await expect(page.getByText("1 visits", { exact: false })).toBeVisible();
  await expect(page.getByText("641 µS/cm", { exact: false })).toBeVisible();
});

test("Hindi language switch preserves EC entries and completes the journey", async ({ page }) => {
  await openExperimentalEC(page);
  await registerECSource(page, "hindi");
  await createDevice(page, "JR-E2E-HI");
  await page.getByLabel(/Reading 1/).fill("680");
  await page.getByLabel(/Reading 2/).fill("682");
  await page.getByRole("button", { name: /Switch language|भाषा/ }).click();
  await expect(page.getByLabel(/माप 1/)).toHaveValue("680");
  await page.getByRole("button", { name: "दोहराव जाँचें" }).click();
  await expect(page.getByText("माप सहमत हैं", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "प्रायोगिक माप सुरक्षित करें" }).click();
  await expect(page.getByText("माप इस डिवाइस पर सुरक्षित है", { exact: true })).toBeVisible();
  await expect(page.getByText(/कंडक्टिविटी यह तय नहीं करती/)).toBeVisible();
});
