import { fieldNavigate } from "./field-navigation";
import { openTraining } from "./field-navigation";
import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { translate, type Label } from "../../src/field/i18n";

const t = translate("en");
async function navigate(page: Page, key: Label) {
  await fieldNavigate(page, t(key));
}
async function register(page: Page) {
  await page.getByRole("button", { name: t("add"), exact: true }).click();
  await page.getByLabel(t('state'),{exact:true}).selectOption('Jharkhand');
  for (const [key, value] of [["code", "MANUAL-QA"], ["name", "QA handpump"], ["village", "QA village"], ["district", "Khunti"], ["operator", "QA-1"]] as const) {
    await (key === 'district' ? page.getByLabel(t(key), { exact: true }).selectOption(value) : page.getByLabel(t(key), { exact: true }).fill(value));
  }
  await page.getByRole("button", { name: t("save"), exact: true }).click();
  await expect(page.getByRole("heading", { name: "MANUAL-QA · QA handpump" })).toBeVisible();
}

test("manual anomaly stays isolated from demo records and CSV neutralizes operator formulas", async ({ page, context }, testInfo) => {
  await page.goto("/personal"); await register(page);
  await page.evaluate(async () => { await navigator.serviceWorker.ready; }); await context.setOffline(true);
  for (let visit = 1; visit <= 4; visit++) {
    await navigate(page, "measure");
    await page.getByText(t("calibrationDetails"),{exact:true}).click();
    for (const [key, value] of [["measuredAt", `2026-01-0${visit}T12:00`], ["reading1", visit === 4 ? "1000" : "600"], ["reading2", visit === 4 ? "1002" : "602"], ["temperature", "25"], ["instrument", "QA meter"], ["calibrationDate", "2026-01-01"], ["calibrationReference", "1413 µS/cm"], ["operator", "QA-1"], ["notes", '=HYPERLINK("https://example.invalid","untrusted")\nहिन्दी टिप्पणी']] as const) {
      await page.getByLabel(t(key), { exact: true }).fill(value);
    }
    await page.getByRole("button", { name: t("review"), exact: true }).click();
    await page.getByRole("button", { name: t("save"), exact: true }).click();
    await expect(page.getByTestId("field-measurement")).toHaveCount(visit);
  }
  await expect(page.getByTestId("field-measurement").first()).toContainText(t("anomaly"));
  await navigate(page, "investigations"); await expect(page.getByRole("heading", { name: t("NEEDS_REVIEW"), exact: true })).toBeVisible();
  await openTraining(page);
  await page.getByRole("button", { name: t("demo"), exact: true }).click();
  await page.getByRole("button", { name: t("loadDemo"), exact: true }).click();
  await expect(page.getByRole("heading", { name: /DEMO-04/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /MANUAL-QA/ })).toHaveCount(0);
  await page.getByRole("button", { name: t("manual"), exact: true }).click();
  await expect(page.getByRole("heading", { name: "MANUAL-QA · QA handpump" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /DEMO-0/ })).toHaveCount(0);
  await navigate(page, "reports");
  const download = page.waitForEvent("download"); await page.getByRole("button", { name: t("csv"), exact: true }).click();
  const csv = await readFile((await (await download).path())!, "utf8");
  expect(csv).toContain("MANUAL-QA"); expect(csv).not.toContain("DEMO-0"); expect(csv).not.toContain("SYNTHETIC_DEMO");
  expect(csv).toContain('"\'=HYPERLINK(""https://example.invalid""'); expect(csv).toContain("हिन्दी टिप्पणी");
  await testInfo.attach("manual-anomaly.csv", { body: Buffer.from(csv), contentType: "text/csv" });
  await context.setOffline(false); await page.reload();
  await expect(page.getByTestId("field-report").getByTestId("field-measurement")).toHaveCount(4);
});

test("real IndexedDB v5 migration preserves legacy data and corrupt field data fails closed", async ({ page }) => {
  // Use a same-origin non-app document to create the old schema before Dexie opens it.
  await page.goto("/manifest.webmanifest");
  await page.evaluate(() => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open("jalrakshak", 50); // Dexie version 5 uses native version 50.
    request.onupgradeneeded = () => {
      const schemas = {
        sources: "sourceCode,syncStatus,createdAt", tests: "sourceId,screeningStatus,syncStatus,testedAt",
        referrals: "testId,sourceId,referralStatus,syncStatus", ecDevices: "deviceId,probeId,createdAt",
        ecMeasurements: "visitId,sourceId,deviceId,measuredAt,measurementQuality,dataOrigin,syncStatus",
        judgeDemoScenarios: "sequence,loadedAt",
      };
      for (const [name, fields] of Object.entries(schemas)) {
        const store = request.result.createObjectStore(name, { keyPath: "id" });
        for (const field of fields.split(",")) store.createIndex(field, field);
      }
      request.transaction!.objectStore("sources").put({ id: "legacy-qa", sourceCode: "LEGACY-QA" });
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => { request.result.close(); resolve(); };
  }));
  await page.goto("/personal"); await register(page);
  const preserved = await page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open("jalrakshak"); request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result; const tx = database.transaction(["sources", "fieldSources"], "readwrite");
      const legacy = tx.objectStore("sources").get("legacy-qa");
      const field = tx.objectStore("fieldSources").openCursor();
      field.onsuccess = () => { if (field.result) field.result.update({ ...field.result.value, code: "" }); };
      tx.oncomplete = () => { resolve({ version: database.version, legacy: legacy.result }); database.close(); };
      tx.onabort = () => reject(tx.error);
    };
  }));
  expect(preserved).toEqual({ version: 70, legacy: { id: "legacy-qa", sourceCode: "LEGACY-QA" } });
  await page.reload(); await expect(page.locator(".field-shell").getByRole("alert")).toContainText(t("corrupt"));
  await expect(page.getByRole("button", { name: t("add"), exact: true })).toBeDisabled();
  await page.getByRole("button", { name: t("retry"), exact: true }).click();
  await expect(page.locator(".field-shell").getByRole("alert")).toContainText(t("corrupt"));
  expect(await page.evaluate(() => new Promise<number>((resolve, reject) => {
    const request = indexedDB.open("jalrakshak"); request.onerror = () => reject(request.error);
    request.onsuccess = () => { const database = request.result; const tx = database.transaction("fieldSources"); const count = tx.objectStore("fieldSources").count(); tx.oncomplete = () => { resolve(count.result); database.close(); }; };
  }))).toBe(1);
});
