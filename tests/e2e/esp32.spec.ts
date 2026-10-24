import { expect, test, type Page } from '@playwright/test';
async function openMeasurement(page: Page) {
  await page.goto('/personal');
  await page.getByRole('button', { name: 'Register source', exact: true }).click();
  for (const [label, value] of [['Source identifier', 'USB-01'], ['Source name', 'USB source'], ['Village', 'Village'], ['District', 'District'], ['Operator reference', 'OP-1']]) await page.getByLabel(label, { exact: true }).fill(value);
  await page.getByRole('button', { name: 'Save locally', exact: true }).click();
  await page.getByRole('navigation').getByRole('button', { name: 'Record Measurement', exact: true }).click();
}
async function sample(page: Page, sequence: number, ecUsCm = 501, stable = true) {
  await page.evaluate(packet => window.dispatchEvent(new CustomEvent('serial-test-data', { detail: JSON.stringify(packet) + '\n' })), { protocol: 'jalrakshak.ec.v1', deviceId: 'USB-01', sessionId: 'boot-one', sequence, ecUsCm, temperatureC: 25, stable });
}
test('USB capture requires fresh independent samples, retains evidence and falls back after unplug', async ({ page }) => {
  await page.addInitScript(() => {
    let stream: ReadableStreamDefaultController<Uint8Array>;
    Object.defineProperty(navigator, 'serial', { configurable: true, value: { requestPort: async () => ({
      readable: new ReadableStream<Uint8Array>({ start(controller) { stream = controller; } }),
      open: async () => {}, close: async () => {},
    }) } });
    window.addEventListener('serial-test-data', event => stream.enqueue(new TextEncoder().encode((event as CustomEvent<string>).detail)));
    window.addEventListener('serial-test-unplug', () => stream.close());
  });
  await openMeasurement(page);
  await page.getByRole('button', { name: 'Connect ESP32 by USB', exact: true }).click();
  const capture1 = page.getByRole('button', { name: 'Use for reading 1', exact: true });
  const capture2 = page.getByRole('button', { name: 'Use for reading 2', exact: true });
  await expect(capture1).toBeDisabled();
  await sample(page, 1, 501, false); await expect(page.getByText(/Stabilizing · capture disabled/)).toBeVisible(); await expect(capture1).toBeDisabled();
  await page.getByLabel('Device ID (optional)', { exact: true }).fill('OLD-METER');
  await page.getByLabel('Calibration reference / standard details (optional)', { exact: true }).fill('Old meter standard');
  await sample(page, 2); await expect(capture1).toBeEnabled(); await capture1.click();
  await expect(page.getByLabel('Device ID (optional)', { exact: true })).toHaveValue('USB-01');
  await expect(page.getByLabel('Calibration reference / standard details (optional)', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Reading 1 (µS/cm)', { exact: true })).toHaveValue('501');
  await expect(capture2).toBeDisabled();
  await sample(page, 2); await expect(page.getByText(/Unrecognized or repeated device data/)).toBeVisible(); await expect(capture2).toBeDisabled();
  await sample(page, 3, 502); await expect(capture2).toBeEnabled();
  // A physically disconnected or stalled stream must never reuse an expired sample.
  await expect(page.getByText(/Reading expired/)).toBeVisible({ timeout: 8000 }); await expect(capture2).toBeDisabled();
  await sample(page, 4, 502); await capture2.click();
  await page.evaluate(() => window.dispatchEvent(new Event('serial-test-unplug')));
  await expect(page.getByText(/Device disconnected. Captured values are kept/)).toBeVisible();
  await expect(page.getByLabel('Independent reading 2 (µS/cm)', { exact: true })).toHaveValue('502');
  await page.reload();
  await expect(page.getByLabel('Reading 1 (µS/cm)', { exact: true })).toHaveValue('501');
  await page.getByLabel('Measurement instrument / local identifier', { exact: true }).fill('Calibrated USB meter');
  await page.getByLabel('Operator reference', { exact: true }).fill('OP-1');
  await page.getByRole('button', { name: 'Check repeatability', exact: true }).click();
  await page.getByRole('button', { name: 'Save locally', exact: true }).click();
  await expect(page.getByText(/USB-01 \/ boot-one \/ #2/)).toBeVisible();
  await expect(page.getByText(/USB-01 \/ boot-one \/ #4/)).toBeVisible();
});

test('unsupported USB browser leaves manual entry usable', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'serial', { configurable: true, value: undefined }));
  await openMeasurement(page);
  await page.getByRole('button', { name: 'Connect ESP32 by USB', exact: true }).click();
  await expect(page.getByText(/USB reading is unavailable in this browser/)).toBeVisible();
  await page.getByLabel('Measurement timestamp', { exact: true }).fill('2026-01-01T12:00');
  await page.getByLabel('Reading 1 (µS/cm)', { exact: true }).fill('500');
  await page.getByLabel('Independent reading 2 (µS/cm)', { exact: true }).fill('501');
  await page.getByLabel('Measurement instrument / local identifier', { exact: true }).fill('Manual meter');
  await page.getByLabel('Operator reference', { exact: true }).fill('OP-1');
  await page.getByRole('button', { name: 'Check repeatability', exact: true }).click();
  await page.getByRole('button', { name: 'Save locally', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Measurement History', exact: true })).toBeVisible();
});
