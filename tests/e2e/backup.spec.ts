import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { translate } from '../../src/field/i18n';
const t = translate('en');
test('real field records can be backed up and restored offline without duplicates', async ({ page, browser, baseURL }, testInfo) => {
  await page.goto('/personal');
  await expect(page.getByRole('button', { name: t('demo'), exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: t('add'), exact: true }).click();
  for (const [key, value] of [['code','BACKUP-1'],['name','Community pump'],['village','Village'],['district','Khunti'],['operator','OP-1']] as const) await page.getByLabel(t(key), { exact: true }).fill(value);
  await page.getByRole('button', { name: t('save'), exact: true }).click();
  await expect(page.getByRole('heading', { name: 'BACKUP-1 · Community pump' })).toBeVisible();
  await page.getByRole('navigation').getByRole('button', { name: t('measure'), exact: true }).click();
  for (const [key, value] of [['measuredAt','2026-01-01T12:00'],['reading1','600'],['reading2','900'],['instrument','Meter'],['operator','OP-1']] as const) await page.getByLabel(t(key), { exact: true }).fill(value);
  await page.getByRole('button', { name: t('review'), exact: true }).click();
  await page.getByRole('button', { name: t('save'), exact: true }).click();
  await expect(page.getByTestId('field-measurement')).toBeVisible();
  await page.getByRole('navigation').getByRole('button', { name: t('dataTools'), exact: true }).click();
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: t('downloadBackup'), exact: true }).click();
  const bytes = await readFile((await (await downloading).path())!);
  const backup = JSON.parse(bytes.toString());
  expect(backup.data.sources).toHaveLength(1); expect(backup.data.measurements).toHaveLength(1); expect(backup.data.investigations).toHaveLength(1);
  await testInfo.attach('field-backup.json', { body: bytes, contentType: 'application/json' });
  const recovery = await browser.newContext({baseURL});
  try {
    const restored = await recovery.newPage(); await restored.goto('/personal');
    await restored.evaluate(async () => { await navigator.serviceWorker.ready; });
    await recovery.setOffline(true);
    await restored.getByRole('navigation').getByRole('button', { name: t('dataTools'), exact: true }).click();
    for (let attempt = 0; attempt < 2; attempt++) {
      await restored.getByLabel(t('backupFile'), { exact: true }).setInputFiles({ name:'backup.json', mimeType:'application/json', buffer:bytes });
      await expect(restored.getByRole('heading', { name: t('restorePreview'), exact: true })).toBeVisible();
      await restored.getByRole('button', { name: t('confirmRestore'), exact: true }).click();
      await expect(restored.getByText(t('backupRestored'), { exact: true })).toBeVisible();
    }
    await restored.reload();
    await restored.getByRole('navigation').getByRole('button', { name: t('sources'), exact: true }).click();
    await expect(restored.getByRole('heading', { name: 'BACKUP-1 · Community pump' })).toHaveCount(1);
    await restored.getByRole('navigation').getByRole('button', { name: t('history'), exact: true }).click();
    await expect(restored.getByTestId('field-measurement')).toHaveCount(1);
    await restored.getByRole('navigation').getByRole('button', { name: t('investigations'), exact: true }).click();
    await expect(restored.getByRole('heading', { name: t('NEEDS_REVIEW'), exact: true })).toBeVisible();
  } finally { await recovery.close(); }
});
test('invalid backup is rejected and Hindi backup controls fit a narrow device', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 }); await page.goto('/personal');
  await page.getByRole('navigation').getByRole('button', { name: t('dataTools'), exact: true }).click();
  await page.getByLabel(t('backupFile'), { exact: true }).setInputFiles({ name:'invalid.json', mimeType:'application/json', buffer:Buffer.from('{"version":999}') });
  await expect(page.locator('.field-shell').getByRole('alert')).toHaveText(t('backupInvalid'));
  await expect(page.getByRole('button', { name:t('confirmRestore'), exact:true })).toHaveCount(0);
  await page.getByRole('button', { name:'Switch language / भाषा बदलें' }).click();
  await expect(page.getByRole('button', { name:translate('hi')('downloadBackup'), exact:true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
});
