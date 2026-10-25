import { fieldNavigate } from "./field-navigation";
import { openTraining } from "./field-navigation";
import { expect, test, type Page } from '@playwright/test';
import { translate, type Label } from '../../src/field/i18n';
const t = translate('en');
async function nav(page: Page, key: Label) { await fieldNavigate(page, t(key)); }
async function register(page: Page, coordinates = true, latitude = "23.3", longitude = "85.3") {
  await page.getByRole('button',{name:t('add'),exact:true}).click();
  await page.getByLabel(t('state'),{exact:true}).selectOption('Jharkhand');
  for (const [key,value] of [['code','UNIFIED-1'],['name','Field pump'],['village','Village'],['district','Khunti'],['operator','OP']] as const) await (key === 'district' ? page.getByLabel(t(key), { exact: true }).selectOption(value) : page.getByLabel(t(key), { exact: true }).fill(value));
  if (coordinates) { await page.getByLabel(t('latitude'),{exact:true}).fill(latitude); await page.getByLabel(t('longitude'),{exact:true}).fill(longitude); }
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
test('all field sections fit six target widths in English and Hindi with labelled controls', async ({page}, testInfo) => {
  test.setTimeout(120_000); await page.goto('/personal'); await demo(page);
  for (const locale of ['en','hi'] as const) {
    const tr = translate(locale); if (locale === 'hi') await page.getByRole('button',{name:"Switch language"}).click();
    for (const width of [320,360,390,430,768,1440]) {
      await page.setViewportSize({width,height:900});
      for (const tab of ['sources','measure','history','investigations','reports','dataTools'] as const) {
        await fieldNavigate(page, tr(tab));
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
  await page.goto('/personal'); await register(page,true,'51.5074','-0.1278'); await page.getByRole('button',{name:t('exploreMap'),exact:true}).click();
  await expect(page.getByRole('heading',{name:t('mapTitle'),exact:true})).toBeVisible();
  await expect(page.getByLabel(t('mapLegend'),{exact:true})).toContainText(t('mapUnmeasured'));
  await page.getByRole('button',{name:t('fitSources'),exact:true}).click();
  await page.locator('.source-map-frame').scrollIntoViewIfNeeded();
  await page.evaluate(async base64 => {
    const tile = new Image();
    tile.src = `data:image/png;base64,${base64}`;
    await tile.decode();
  }, png.toString('base64'));
  const marker = page.locator('.map-marker'); await expect(marker).toHaveCount(1);await expect(marker).toHaveText('— UNIFIED-1');await expect(marker).toBeInViewport();
  await marker.focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('region',{name:'Selected location',exact:true})).toContainText('UNIFIED-1');
  await expect(page.getByRole('region',{name:'Selected location',exact:true})).toContainText(t('mapGps'));
  await expect(page.getByRole('region',{name:'Selected location',exact:true}).getByRole('link',{name:'Directions · Google Maps'})).toHaveAttribute('href',/destination=51.5074,-0.1278/);
  await page.getByRole('button',{name:'Switch language',exact:true}).click();
  await expect(page.getByRole('region',{name:'चुना गया स्थान',exact:true})).toContainText('UNIFIED-1');
  await page.getByRole('button',{name:'भाषा बदलें',exact:true}).click();
  await expect(page.getByRole('region',{name:'Selected location',exact:true})).toContainText('UNIFIED-1');
  await expect(page.getByRole('region',{name:'Selected location',exact:true})).toContainText(t('mapNoVisit'));
  await page.getByRole('region',{name:'Selected location',exact:true}).getByRole('button',{name:t('recordVisit'),exact:true}).click();
  await expect(page.getByRole('heading',{name:t('recordVisit'),exact:true}).first()).toBeVisible();
  await expect(page.locator('.visit-source-summary')).toContainText('UNIFIED-1');
  await page.getByRole('navigation',{name:t('primaryNavigation'),exact:true}).getByRole('button',{name:'Map',exact:true}).click();
  await page.locator('.map-marker').focus();await page.keyboard.press('Enter');
  await page.getByRole('region',{name:'Selected location',exact:true}).getByRole('button',{name:/Measurement History/}).click();
  await expect(page.getByRole('heading',{name:t('history'),exact:true})).toBeVisible();
});

test('GPS coordinates require confirmation and show device accuracy',async({page,context})=>{
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({latitude:23.5,longitude:85.3,accuracy:24});
  await page.goto('/personal');
  await page.getByRole('button',{name:t('add'),exact:true}).click();
  await page.getByRole('button',{name:t('gps'),exact:true}).click();
  const confirmation=page.getByRole('region',{name:t('gpsConfirm'),exact:true});
  await expect(confirmation).toContainText('±24 m');
  await expect(page.getByLabel(t('latitude'),{exact:true})).toHaveValue('');
  await confirmation.getByRole('button',{name:t('cancel'),exact:true}).click();
  await expect(confirmation).toHaveCount(0);
  await expect(page.getByLabel(t('latitude'),{exact:true})).toHaveValue('');
  await page.getByRole('button',{name:t('gps'),exact:true}).click();
  await confirmation.getByRole('button',{name:t('gpsConfirm'),exact:true}).click();
  await expect(page.getByLabel(t('latitude'),{exact:true})).toHaveValue('23.5');
  await expect(page.getByLabel(t('longitude'),{exact:true})).toHaveValue('85.3');
});
