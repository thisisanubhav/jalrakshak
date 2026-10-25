import { expect, test } from '@playwright/test';
import { translate } from '../../src/field/i18n';
test('reference navigation keeps four destinations, mobile docking and map selection after refresh', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/personal');
  const t = translate('en'); const nav = page.getByRole('navigation', { name: t('primaryNavigation'), exact: true });
  await expect(nav.getByRole('button')).toHaveText(['Home','Map','Tests','Dashboard']);
  await expect(nav.getByRole('button', { name: 'Home', exact: true })).toHaveAttribute('aria-current','page');
  expect(await nav.evaluate(el => { const r = el.getBoundingClientRect(); return Math.abs(innerHeight-r.bottom); })).toBeLessThan(2);
  await nav.getByRole('button', { name: 'Map', exact: true }).click();
  await expect(page.getByRole('heading', { name: t('mapTitle'), exact: true })).toBeVisible();
  await page.reload();
  await expect(nav.getByRole('button', { name: 'Map', exact: true })).toHaveAttribute('aria-current','page');
  await nav.getByRole('button', { name: 'Tests', exact: true }).click();
  const sections = page.getByRole('group', { name: t('title'), exact: true });
  await expect(sections.getByRole('button')).toHaveText([t('measure'),t('history')]);
  await nav.getByRole('button', { name: 'Dashboard', exact: true }).click();
  await expect(sections.getByRole('button')).toHaveText([t('investigations'),t('reports'),t('dataTools')]);
  await nav.getByRole('button', { name: 'Home', exact: true }).click();
  await expect(page.getByRole('button',{name:t('add'),exact:true})).toBeVisible();
  await testInfo.attach('four-destination-mobile.png',{body:await page.screenshot({fullPage:true}),contentType:'image/png'});
  await page.getByRole('button',{name:"Switch language"}).click();
  await expect(page.getByRole('navigation',{name:translate('hi')('primaryNavigation'),exact:true}).getByRole('button')).toHaveText(['होम','मानचित्र','जाँच','डैशबोर्ड']);
  await page.setViewportSize({width:1440,height:900});
  expect(await page.getByRole('navigation',{name:translate('hi')('primaryNavigation'),exact:true}).evaluate(el => el.getBoundingClientRect().width)).toBeLessThanOrEqual(672);
});

test('footer cannot intercept fixed navigation on phones or tablets',async({page})=>{
  for(const width of [390,820]){
    await page.setViewportSize({width,height:844});await page.goto('/personal');
    const nav=page.getByRole('navigation',{name:'Primary navigation',exact:true});
    await expect(nav.getByRole('button',{name:'Home',exact:true})).toBeVisible();
    await page.getByRole('contentinfo',{name:'JalRakshak information',exact:true}).scrollIntoViewIfNeeded();
    const home=nav.getByRole('button',{name:'Home',exact:true});
    expect(await home.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})).toBe(true);
    await home.click();await expect(page.getByRole('button',{name:'Register source',exact:true})).toBeVisible();
    await page.getByRole('contentinfo',{name:'JalRakshak information',exact:true}).scrollIntoViewIfNeeded();
    await page.getByRole('link',{name:"Contact Us",exact:true}).click();
    await expect(page.getByRole('heading',{name:"Contact Us",exact:true})).toBeVisible();
  }
});
