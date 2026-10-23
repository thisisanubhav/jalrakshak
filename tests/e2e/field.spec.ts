import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
async function ready(page: Page) { await page.goto("/"); await expect(page.getByRole("button", { name: "Register source", exact: true })).toBeVisible(); }
async function register(page: Page, code = "FIELD-1") {
  await page.getByRole("button", { name: "Register source", exact: true }).click();
  for (const [label, value] of [["Source identifier", code], ["Source name", "Test handpump"], ["Village", "Test village"], ["District", "Khunti"], ["Operator reference", "OP-1"]]) await page.getByLabel(label, { exact: true }).fill(value);
  await page.getByRole("button", { name: "Save locally", exact: true }).click();
  await expect(page.getByRole("heading", { name: `${code} · Test handpump` })).toBeVisible();
}
async function measure(page: Page, readings = [600, 602], timestamp = "2026-01-01T12:00:00") {
  await page.getByLabel("Measurement timestamp", { exact: true }).fill(timestamp);
  await page.getByLabel("Reading 1 (µS/cm)", { exact: true }).fill(String(readings[0]));
  await page.getByLabel("Independent reading 2 (µS/cm)", { exact: true }).fill(String(readings[1]));
  await page.getByLabel("Measurement instrument / local identifier", { exact: true }).fill("Meter A");
  await page.getByLabel("Operator reference", { exact: true }).fill("OP-1");
  await page.getByRole("button", { name: "Check repeatability", exact: true }).click();
  await page.getByRole("button", { name: "Save locally", exact: true }).click();
}
async function nav(page: Page, name: string) { await page.getByRole("navigation").getByRole("button", { name, exact: true }).click(); }
async function loadDemo(page: Page) {
  await ready(page); await page.getByRole("button", { name: "Software-only judge demo", exact: true }).click();
  await page.getByRole("button", { name: "Load four synthetic scenarios", exact: true }).click();
  await expect(page.getByRole("heading", { name: /DEMO-04/ })).toBeVisible();
}

test("offline registration, edit, manual recording, follow-up and report survive refresh", async ({ page, context }) => {
  await ready(page); await page.evaluate(async () => { await navigator.serviceWorker.ready; }); await context.setOffline(true);
  await register(page); await page.getByRole("button", { name: "Edit source", exact: true }).click();
  await page.getByLabel("Location description (optional)").fill("Near community building"); await page.getByRole("button", { name: "Save locally", exact: true }).click();
  await nav(page, "Record Measurement"); await measure(page, [600, 900]);
  await expect(page.getByTestId("field-measurement")).toContainText("Readings disagree");
  await nav(page, "Investigations"); await page.getByLabel("Operator reference", { exact: true }).fill("OP-2"); await page.getByLabel("Explanation / evidence reference").fill("Clean probe and repeat visit");
  await page.getByRole("button", { name: "Save status and evidence" }).click();
  await expect(page.getByRole("heading", { name: "Retest requested", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Record linked retest" }).click();
  const time = await page.evaluate(() => { const date = new Date(); return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 23); });
  await measure(page, [600, 602], time);
  await page.getByLabel("Retest evidence", { exact: true }).selectOption({ index: 1 });
  await page.getByLabel("Operator reference", { exact: true }).fill("OP-2"); await page.getByLabel("Explanation / evidence reference").fill("Repeat readings agree, calibration unavailable");
  await page.getByRole("button", { name: "Save status and evidence" }).click();
  await page.getByLabel("Next status").selectOption("CLOSED_UNCONFIRMED"); await page.getByLabel("Operator reference", { exact: true }).fill("OP-2"); await page.getByLabel("Explanation / evidence reference").fill("No laboratory confirmation available");
  await page.getByRole("button", { name: "Save status and evidence" }).click();
  await page.reload(); await expect(page.getByRole("heading", { name: "Closed without confirmation", exact: true })).toBeVisible();
  await nav(page, "Reports"); const download = page.waitForEvent("download"); await page.getByRole("button", { name: "Download source CSV" }).click();
  const file = await (await download).path(); const csv = await readFile(file!, "utf8");
  expect(csv).toContain("No laboratory confirmation available"); expect(csv).toContain("Near community building"); expect(csv).toContain("MANUAL_FIELD"); expect(csv).not.toContain("SYNTHETIC_DEMO");
  await expect(page.getByTestId("field-report")).toContainText("Repeat readings agree");
});

test("draft refresh, Hindi forms and missing calibration remain explicit", async ({ page }) => {
  await ready(page); await register(page); await nav(page, "Record Measurement");
  await page.getByLabel("Reading 1 (µS/cm)", { exact: true }).fill("610"); await page.reload();
  await expect(page.getByLabel("Reading 1 (µS/cm)", { exact: true })).toHaveValue("610");
  await page.getByRole("button", { name: "Switch language / भाषा बदलें" }).click();
  await expect(page.getByLabel("माप 1 (µS/cm)", { exact: true })).toHaveValue("610");
  await page.getByLabel("माप का समय", { exact: true }).fill("2026-01-01T12:00:00"); await page.getByLabel("स्वतंत्र माप 2 (µS/cm)").fill("612"); await page.getByLabel("माप उपकरण / स्थानीय पहचान").fill("Meter A"); await page.getByLabel("ऑपरेटर संदर्भ", { exact: true }).fill("OP-1");
  await page.getByRole("button", { name: "दोहराव जाँचें", exact: true }).click(); await page.getByRole("button", { name: "स्थानीय रूप से सहेजें", exact: true }).click();
  await expect(page.getByTestId("field-measurement")).toContainText("अंशांकन साक्ष्य अधूरा"); await expect(page.locator("html")).toHaveAttribute("lang", "hi");
});

test("four deterministic scenarios and scoped print report work offline", async ({ page, context }) => {
  await loadDemo(page); await page.evaluate(async () => { await navigator.serviceWorker.ready; }); await context.setOffline(true); await page.reload();
  await nav(page, "Reports"); await page.getByLabel("Select a source", { exact: true }).selectOption("field-demo-4");
  const report = page.getByTestId("field-report"); await expect(report).toContainText("SYNTHETIC DEMONSTRATION DATA"); await expect(report).toContainText("Persistent historical change"); await expect(report).toContainText("Closed without confirmation");
  await expect(report).not.toContainText("DEMO-03"); await page.emulateMedia({ media: "print" }); await expect(report).toBeVisible(); await expect(page.getByRole("button", { name: "Print / Save as PDF" })).toBeHidden();
  const pdf = await page.pdf({ format: "A4" }); expect(pdf.byteLength).toBeGreaterThan(10000);
});

test("320px bilingual screens have labels, keyboard focus and no overflow", async ({ page }) => {
  await loadDemo(page);
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    for (const tab of ["Water Sources", "Record Measurement", "Measurement History", "Investigations", "Reports"]) {
      await nav(page, tab); expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
      expect(await page.locator("input,select,textarea").evaluateAll(elements => elements.every(e => Boolean(e.closest("label") || e.getAttribute("aria-label"))))).toBe(true);
    }
  }
  await page.getByRole("button", { name: "Switch language / भाषा बदलें" }).click(); await page.setViewportSize({ width: 320, height: 844 });
  await expect(page.getByTestId("field-report")).toContainText("मैदानी माप और जाँच रिपोर्ट"); expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  await page.keyboard.press("Tab"); expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe("BODY");
});

test("invalid input cannot save and duplicate identifiers are rejected", async ({ page }) => {
  await ready(page); await register(page); await nav(page, "Record Measurement");
  await page.getByRole("button", { name: "Check repeatability" }).click(); await expect(page.getByRole("button", { name: "Save locally", exact: true })).toHaveCount(0);
  await nav(page, "Water Sources"); await page.getByRole("button", { name: "Register source", exact: true }).click();
  for (const [label, value] of [["Source identifier", "FIELD-1"], ["Source name", "Duplicate"], ["Village", "Village"], ["District", "Khunti"], ["Operator reference", "OP-1"]]) await page.getByLabel(label, { exact: true }).fill(value);
  await page.getByRole("button", { name: "Save locally", exact: true }).click(); await expect(page.getByRole("alert")).toContainText("identifier already exists");
});

test("denied storage produces a visible warning without deleting records", async ({ page }) => {
  await page.addInitScript(() => { IDBFactory.prototype.open = () => { throw new DOMException("Denied", "InvalidStateError"); }; });
  await page.goto("/"); await expect(page.getByRole("alert")).toContainText("Device storage is unavailable"); await expect(page.getByRole("button", { name: "Register source", exact: true })).toHaveCount(0);
});

test("blocked localStorage does not crash field navigation", async ({ page }) => {
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new DOMException("Quota", "QuotaExceededError"); }; });
  await ready(page); await expect(page.getByRole("alert")).toContainText("Device storage is unavailable"); await page.getByRole("button", { name: "Register source", exact: true }).click(); await expect(page.getByLabel("Source identifier")).toBeEditable();
});
