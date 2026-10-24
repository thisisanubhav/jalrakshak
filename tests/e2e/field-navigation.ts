import type { Page } from '@playwright/test';
import { translate } from '../../src/field/i18n';
export async function openTraining(page: Page) {
  const t = translate('en');
  await page.getByRole('navigation', { name: t('title'), exact: true }).getByRole('button', { name: t('dataTools'), exact: true }).click();
  await page.getByText(t('optionalTraining'), { exact: true }).click();
  await page.getByRole('button', { name: t('training'), exact: true }).click();
}
