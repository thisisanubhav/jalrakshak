import { openTraining } from "./field-navigation";
import { expect, test, type Page } from '@playwright/test';
import { translate, type Label } from '../../src/field/i18n';
const t = translate('en');
async function nav(page: Page, key: Label) { await page.getByRole('navigation', { name:t('title'), exact:true }).getByRole('button', {name:t(key),exact:true}).click(); }
async function register(page: Page, coordinates = true) {
  await page.getByRole('button',{name:t('add'),exact:true}).click();
  for (const [key,value] of [['code','UNIFIED-1'],['name','Field pump'],['village','Village'],['district','Khunti'],['operator','OP']] as const) await page.getByLabel(t(key),{exact:true}).fill(value);
  if (coordinates) { await page.getByLabel(t('latitude'),{exact:true}).fill('23.3'); await page.getByLabel(t('longitude'),{exact:true}).fill('85.3'); }
  await page.getByRole('button',{name:t('save'),exact:true}).click();
  await expect(page.getByRole('heading',{name:'UNIFIED-1 · Field pump'})).toBeVisible();
}
async function demo(page: Page) {
  await openTraining(page);
  await page.getByRole('button',{name:t('demo'),exact:true}).click();
  await page.getByRole('button',{name:t('loadDemo'),exact:true}).click();
  await expect(page.getByRole('heading',{name:/DEMO-04/})).toBeVisible();
}
test('field map uses registered coordinates and retains source navigation offline', async ({page,context}) => {
  await page.goto('/personal'); await register(page);
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.getByRole('button',{name:t('mapView'),exact:true}).click();
  await expect(page.locator('.field-map-list')).toContainText('23.3, 85.3');
  await context.setOffline(true); await page.reload();
  await page.getByRole('button',{name:t('mapView'),exact:true}).click();
  await expect(page.getByText(t('mapUnavailable'),{exact:true})).toBeVisible();
  await page.locator('.field-map-list').getByRole('button',{name:'UNIFIED-1 · Field pump',exact:true}).click();
  await expect(page.getByRole('heading',{name:t('history'),exact:true})).toBeVisible();
  await context.setOffline(false); await nav(page,'sources');
  await page.getByRole('button',{name:t('listView'),exact:true}).click();
  await expect(page.getByRole('heading',{name:'UNIFIED-1 · Field pump'})).toBeVisible();
});
test('overview filters all sources and synthetic reset cannot delete manual records', async ({page}) => {
  await page.goto('/personal'); await register(page,false); await demo(page); await nav(page,'investigations');
  await expect(page.getByTestId('metric-sources')).toHaveText(`4 · ${t('sources')}`);
  await expect(page.getByTestId('metric-eligible')).toHaveText(`3 · ${t('eligibleSources')}`);
  await expect(page.getByTestId('metric-open')).toHaveText(`2 · ${t('openCount')}`);
  await page.getByTestId('metric-closed').click();
  await expect(page.getByRole('heading',{name:t('CLOSED_UNCONFIRMED'),exact:true})).toBeVisible();
  await page.getByTestId('metric-followup').click();
  await expect(page.getByRole('heading',{name:t('NEEDS_REVIEW'),exact:true})).toHaveCount(2);
  await page.getByTestId('metric-eligible').click();
  await expect(page.getByRole('heading',{name:/DEMO-0/})).toHaveCount(3);
  await page.getByRole('button',{name:t('resetFieldDemo'),exact:true}).click();
  await page.getByRole('button',{name:t('confirmReset'),exact:true}).click();
  await expect(page.getByRole('heading',{name:/DEMO-0/})).toHaveCount(0);
  await page.getByRole('button',{name:t('manual'),exact:true}).click();
  await expect(page.getByRole('heading',{name:'UNIFIED-1 · Field pump'})).toBeVisible();
  await nav(page,'investigations'); await expect(page.getByTestId('metric-sources')).toHaveText(`1 · ${t('sources')}`);
  await expect(page.getByTestId('metric-open')).toHaveText(`0 · ${t('openCount')}`);
});
test('embedded screening completes and persists without changing manual metrics or legacy records', async ({page}) => {
  await page.goto('/personal'); await register(page); await openTraining(page);
  const training = page.locator('section').filter({has:page.getByRole('heading',{name:t('training'),exact:true})});
  await training.getByRole('button',{name:t('screeningSimulator'),exact:true}).click();
  await expect(training.getByText(t('simulatedWarning'),{exact:true})).toBeVisible();
  await training.getByRole('button',{name:'Start screening',exact:true}).click();
  await page.getByLabel('Source name / identifier').fill('TRAINING ONLY');
  await page.getByRole('button',{name:/Continue to testing/}).click();
  await page.getByLabel('Demo scenario').selectOption('normal');
  await page.locator('.field-training').getByRole('button',{name:'Start screening',exact:true}).last().click();
  await page.getByRole('button',{name:'Save Test',exact:true}).click();
  await expect(page.getByRole('button',{name:/Saved on device/})).toBeDisabled();
  await page.reload();
  await page.getByRole('button',{name:t('screeningSimulator'),exact:true}).click();
  await expect(page.locator('.field-training')).toContainText('TRAINING ONLY');
  await nav(page,'investigations'); await expect(page.getByTestId('metric-sources')).toHaveText(`1 · ${t('sources')}`);
  await expect(page.getByTestId('metric-open')).toHaveText(`0 · ${t('openCount')}`);
  await page.goto('/personal?legacy=1'); await expect(page.getByText('TRAINING ONLY',{exact:true})).toHaveCount(0);
});
test('conditional third reading and full event timeline preserve failed evidence', async ({page}) => {
  await page.goto('/personal'); await register(page); await nav(page,'measure');
  await expect(page.getByLabel(t('reading3'),{exact:true})).toHaveCount(0);
  await page.getByLabel(t('reading1'),{exact:true}).fill('600'); await page.getByLabel(t('reading2'),{exact:true}).fill('900');
  await expect(page.getByLabel(t('reading3'),{exact:true})).toBeVisible();
  await page.getByLabel(t('reading3'),{exact:true}).fill('602');
  await page.getByLabel(t('measuredAt'),{exact:true}).fill('2026-01-01T12:00');
  await page.getByLabel(t('instrument'),{exact:true}).fill('Meter'); await page.getByLabel(t('operator'),{exact:true}).fill('OP');
  await page.getByRole('button',{name:t('review'),exact:true}).click(); await page.getByRole('button',{name:t('save'),exact:true}).click();
  await expect(page.getByTestId('field-measurement')).toContainText('900');
  await expect(page.getByTestId('field-measurement')).toContainText(t('calibration'));
  await demo(page); await nav(page,'history'); await page.getByLabel(t('select'),{exact:true}).selectOption('field-demo-4');
  await expect(page.getByRole('heading',{name:t('eventLog'),exact:true})).toHaveCount(5);
  await expect(page.getByTestId('field-measurement')).toHaveCount(5);
  await page.getByLabel(t('select'),{exact:true}).selectOption('field-demo-2');
  await expect(page.getByRole('figure')).toContainText(t('excluded'));
});
test('all six tabs fit six target widths in English and Hindi with labelled controls', async ({page}, testInfo) => {
  test.setTimeout(120_000); await page.goto('/personal'); await demo(page);
  for (const locale of ['en','hi'] as const) {
    const tr = translate(locale); if (locale === 'hi') await page.getByRole('button',{name:'Switch language / भाषा बदलें'}).click();
    for (const width of [320,360,390,430,768,1440]) {
      await page.setViewportSize({width,height:900});
      for (const tab of ['sources','measure','history','investigations','reports','dataTools'] as const) {
        await page.getByRole('navigation',{name:tr('title'),exact:true}).getByRole('button',{name:tr(tab),exact:true}).click();
        expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
        expect(await page.locator('input,select,textarea').evaluateAll(items => items.every(e => !!e.closest('label') || !!e.getAttribute('aria-label')))).toBe(true);
        if (tab === 'dataTools' || tab === 'investigations') await testInfo.attach(`unified-${locale}-${width}-${tab}.png`,{body:await page.screenshot({fullPage:true}),contentType:'image/png'});
      }
    }
  }
  await page.keyboard.press('Tab'); expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe('BODY');
});

test('MapLibre marker opens the correct field source with deterministic tile fixtures', async ({page,context}) => {
  // Valid PNG chunk checksums are required by Chromium's tile image decoder.
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=', 'base64');
  await context.route('https://tile.openstreetmap.org/**', route => route.fulfill({contentType:'image/png',body:png}));
  await page.goto('/personal'); await register(page); await page.getByRole('button',{name:t('mapView'),exact:true}).click();
  await page.evaluate(async base64 => {
    const tile = new Image();
    tile.src = `data:image/png;base64,${base64}`;
    await tile.decode();
  }, png.toString('base64'));
  const marker = page.locator('.map-marker'); await expect(marker).toHaveCount(1);
  await marker.focus(); await page.keyboard.press('Enter');
  await expect(page.locator('.maplibregl-popup-content')).toContainText('UNIFIED-1');
  await page.locator('.maplibregl-popup-content').getByRole('button',{name:/Measurement History/}).click();
  await expect(page.getByRole('heading',{name:t('history'),exact:true})).toBeVisible();
});
