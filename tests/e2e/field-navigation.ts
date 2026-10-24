import type { Page } from '@playwright/test';
import { translate } from '../../src/field/i18n';
export async function fieldNavigate(page: Page, name: string) {
  const locale = await page.locator('html').getAttribute('lang') === 'hi' ? 'hi' : 'en';
  const t = translate(locale);
  const key = (['sources','measure','history','investigations','reports','dataTools'] as const).find(key => key === name || t(key) === name);
  if (!key) throw new Error(`Unknown field destination: ${name}`);
  const primary = key === 'sources' ? 'navHome' : key === 'measure' || key === 'history' ? 'navTests' : 'navDashboard';
  await page.getByRole('navigation', { name: t('primaryNavigation'), exact: true }).getByRole('button', { name: t(primary), exact: true }).click();
  if (key !== 'sources') await page.getByRole('group', { name: t('title'), exact: true }).getByRole('button', { name: t(key), exact: true }).click();
}
export async function openTraining(page: Page) {
  const t = translate('en');
  await fieldNavigate(page, 'dataTools');
  await page.getByText(t('optionalTraining'), { exact: true }).click();
  await page.getByRole('button', { name: t('training'), exact: true }).click();
}
