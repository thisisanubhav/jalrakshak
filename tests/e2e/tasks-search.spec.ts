import { expect, test, type Page } from '@playwright/test';
import { translate } from '../../src/field/i18n';
import { fieldNavigate, openTraining } from './field-navigation';
const t=translate('en');
async function register(page:Page,code:string,village:string,category:string) {
  await page.getByRole('button',{name:t('add'),exact:true}).click();
  for(const [key,value] of [['code',code],['name',`Pump ${code}`],['village',village],['district','Khunti'],['operator','OP']] as const)await page.getByLabel(t(key),{exact:true}).fill(value);
  await page.getByLabel(t('category'),{exact:true}).selectOption(category);
  await page.getByRole('button',{name:t('save'),exact:true}).click();
  await expect(page.getByRole('heading',{name:`${code} · Pump ${code}`,exact:true})).toBeVisible();
}
test('source search combines village, type and status filters in list and map; tasks open the correct source',async({page})=>{
  await page.goto('/personal');await register(page,'SEARCH-A','North','HANDPUMP');await register(page,'SEARCH-B','South','WELL');
  const tasks=page.getByRole('region',{name:t('taskTitle'),exact:true});await expect(tasks.getByRole('button',{name:/Open task/})).toHaveCount(2);
  await page.getByLabel(t('sourceSearch'),{exact:true}).fill('search-b');
  await page.getByLabel(t('filterVillage'),{exact:true}).selectOption('South');await page.getByLabel(t('filterCategory'),{exact:true}).selectOption('WELL');await page.getByLabel(t('filterStatus'),{exact:true}).selectOption('unmeasured');
  await expect(page.getByRole('heading',{name:'SEARCH-A · Pump SEARCH-A',exact:true})).toHaveCount(0);await expect(page.getByRole('heading',{name:'SEARCH-B · Pump SEARCH-B',exact:true})).toBeVisible();
  await page.getByRole('button',{name:t('mapView'),exact:true}).click();
  await expect(page.getByText('SEARCH-B · Pump SEARCH-B',{exact:true})).toBeVisible();await expect(page.getByText('SEARCH-A · Pump SEARCH-A',{exact:true})).toHaveCount(0);
  await page.getByLabel(t('filterVillage'),{exact:true}).selectOption('North');await expect(page.getByText(t('noMatchingSources'),{exact:true})).toBeVisible();
  await page.getByRole('button',{name:t('clearSourceFilters'),exact:true}).click();await fieldNavigate(page,'sources');
  await tasks.getByRole('button',{name:/Open task · SEARCH-B/}).click();
  await expect(page.getByLabel(t('select'),{exact:true}).locator('option:checked')).toHaveText('SEARCH-B · Pump SEARCH-B');
  for(const [key,value] of [['measuredAt','2026-01-01T12:00'],['reading1','600'],['reading2','602'],['instrument','Meter'],['operator','OP']] as const)await page.getByLabel(t(key),{exact:true}).fill(value);
  await page.getByRole('button',{name:t('review'),exact:true}).click();await page.getByRole('button',{name:t('save'),exact:true}).click();
  await fieldNavigate(page,'sources');await expect(tasks.getByRole('button',{name:/Open task · SEARCH-B/})).toHaveCount(0);await expect(tasks.getByRole('button',{name:/Open task · SEARCH-A/})).toBeVisible();
});

test('follow-up tasks navigate to their source and search has a Hindi empty state without changing saved data',async({page})=>{
  await page.goto('/personal');await openTraining(page);await page.getByRole('button',{name:t('demo'),exact:true}).click();await page.getByRole('button',{name:t('loadDemo'),exact:true}).click();
  const tasks=page.getByRole('region',{name:t('taskTitle'),exact:true});await tasks.getByRole('button',{name:/Open task · DEMO-02/}).click();
  await expect(page.getByLabel(t('select'),{exact:true})).toHaveValue('field-demo-2');await expect(page.getByRole('heading',{name:t('NEEDS_REVIEW'),exact:true})).toBeVisible();
  await fieldNavigate(page,'sources');await page.getByRole('button',{name:'Switch language / भाषा बदलें'}).click();const hi=translate('hi');
  await page.getByLabel(hi('sourceSearch'),{exact:true}).fill('missing-source');await expect(page.getByText(hi('noMatchingSources'),{exact:true})).toBeVisible();
  await page.getByRole('button',{name:hi('clearSourceFilters'),exact:true}).click();await expect(page.getByRole('heading',{name:/DEMO-0/})).toHaveCount(4);
});
