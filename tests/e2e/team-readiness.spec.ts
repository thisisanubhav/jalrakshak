import {test,expect,type Page} from '@playwright/test';
import {fieldNavigate} from './field-navigation';
import {translate} from '../../src/field/i18n';
const t=translate('en');
async function register(page:Page){
 await page.goto('/personal');await page.getByRole('button',{name:'Register source',exact:true}).click();
 for(const [label,value] of [['State / Union Territory','Jharkhand'],['District','Khunti'],['Source identifier','READY-1'],['Source name','Readiness pump'],['Village','Test village'],['Operator reference','OP']]){
  const input=page.getByLabel(label,{exact:true});if(['State / Union Territory','District'].includes(label))await input.selectOption(value);else await input.fill(value);
 }
 await page.getByRole('button',{name:'Save locally',exact:true}).click();await expect(page.getByRole('heading',{name:'READY-1 · Readiness pump',exact:true})).toBeVisible();
}
test('readiness, offline draft resume and confirmed discard preserve saved sources',async({page,context})=>{
 await register(page);
 await page.getByText('Before you go offline',{exact:true}).click();await page.getByRole('button',{name:'Check device readiness'}).click();await expect(page.getByText(/Sources on this device/)).toContainText('1');
 await fieldNavigate(page,'measure');await page.getByLabel(t('reading1'),{exact:true}).fill('620');await page.getByLabel(t('notes'),{exact:true}).fill('Resume this field note');
 await fieldNavigate(page,'sources');await page.getByText('Unfinished visits',{exact:false}).click();await expect(page.getByRole('button',{name:'Resume draft',exact:true})).toBeVisible();
 await context.setOffline(true);await page.getByRole('button',{name:'Resume draft',exact:true}).click();await expect(page.getByLabel(t('reading1'),{exact:true})).toHaveValue('620');await expect(page.getByLabel(t('notes'),{exact:true})).toHaveValue('Resume this field note');
 await fieldNavigate(page,'sources');await page.getByText('Unfinished visits',{exact:false}).click();await page.getByRole('button',{name:'Discard draft',exact:true}).click();await expect(page.getByRole('button',{name:'Confirm discard'})).toBeVisible();await page.getByRole('button',{name:'Keep draft'}).click();await expect(page.getByRole('button',{name:'Resume draft',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Discard draft',exact:true}).click();await page.getByRole('button',{name:'Confirm discard'}).click();await expect(page.getByRole('button',{name:'Resume draft',exact:true})).toHaveCount(0);await expect(page.getByRole('heading',{name:'READY-1 · Readiness pump',exact:true})).toBeVisible();
});
test('source warning and rescheduling retain the reason and old date',async({page})=>{
 await register(page);await page.getByText(t('visitPlan')+': '+t('unscheduled'),{exact:true}).click();await page.getByLabel(t('scheduleDate'),{exact:true}).fill('2026-11-01');await page.getByRole('button',{name:t('saveSchedule'),exact:true}).click();
 await page.getByText(t('visitPlan')+': 2026-11-01',{exact:true}).click();await page.getByLabel(t('scheduleDate'),{exact:true}).fill('2026-11-02');await page.getByLabel('Reason for changing this plan').selectOption('Source inaccessible');await page.getByRole('button',{name:t('saveSchedule'),exact:true}).click();
 await page.getByText(t('visitPlan')+': 2026-11-02',{exact:true}).click();await page.getByText('Plan change history',{exact:true}).click();await expect(page.getByText(/2026-11-01 → 2026-11-02/)).toContainText('Source inaccessible');
 await page.getByRole('button',{name:'Register source',exact:true}).click();await page.getByLabel('State / Union Territory',{exact:true}).selectOption('Jharkhand');await page.getByLabel('District',{exact:true}).selectOption('Khunti');await page.getByLabel('Source name',{exact:true}).fill('Readiness pump');await page.getByLabel('Village',{exact:true}).fill('Test village');await expect(page.getByText('Possible existing source',{exact:true})).toBeVisible();
});
test('password recovery uses generic feedback and requires matching passwords',async({page})=>{
 await page.route('**/api/onboarding/recover',route=>route.fulfill({json:{ok:true}}));await page.goto('/recover');await page.getByLabel('Verified email',{exact:true}).fill('unknown@example.com');await page.getByRole('button',{name:'Send reset link'}).click();await expect(page.getByRole('status')).toContainText('If this email has an eligible account');
 let calls=0;await page.route('**/api/onboarding/reset-password',route=>{calls++;expect(route.request().postDataJSON().token).toBe('a'.repeat(64));return route.fulfill({json:{ok:true}});});
 await page.goto('/recover#token='+ 'a'.repeat(64));await expect(page).toHaveURL(/\/recover$/);await page.getByLabel('New password',{exact:true}).fill('new-private-password');await page.getByLabel('Confirm password',{exact:true}).fill('different-private-password');await page.getByRole('button',{name:'Save new password'}).click();await expect(page.getByRole('main').getByRole('alert')).toBeVisible();expect(calls).toBe(0);
 await page.getByLabel('Confirm password',{exact:true}).fill('new-private-password');await page.getByRole('button',{name:'Save new password'}).click();await expect(page.getByRole('status')).toContainText('Password changed');expect(calls).toBe(1);
});
