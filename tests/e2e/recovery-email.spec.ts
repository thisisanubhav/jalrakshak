import {test,expect} from '@playwright/test';

test('legacy account requests verification without replacing the current email',async({page})=>{
  await page.route('**/api/onboarding/recovery-email-status',route=>route.fulfill({json:{email:'old@example.com',google:false,available:true}}));
  await page.route('**/api/onboarding/recovery-email-request',async route=>{
    expect(route.request().postDataJSON()).toEqual({email:'new@example.com',password:'current-private-password'});
    await route.fulfill({json:{ok:true}});
  });
  await page.goto('/account');
  await expect(page.getByText('Recovery email verified',{exact:false})).toBeVisible();
  await page.getByLabel('Recovery email address').fill('new@example.com');
  await page.getByLabel('Current password',{exact:true}).fill('current-private-password');
  await page.getByRole('button',{name:'Send verification link'}).click();
  await expect(page.getByRole('status')).toContainText('Check your email');
  await expect(page.getByText('old@example.com',{exact:true})).toBeVisible();
  await expect(page.getByLabel('Current password',{exact:true})).toHaveValue('');
});

test('verification strips the token and requires an explicit confirmation',async({page})=>{
  let confirmed=false;
  await page.route('**/api/onboarding/recovery-email-status',route=>route.fulfill({json:{email:confirmed?'new@example.com':null,google:false,available:true}}));
  await page.route('**/api/onboarding/recovery-email-confirm',async route=>{
    expect(route.request().postDataJSON()).toEqual({token:'a'.repeat(64)});confirmed=true;await route.fulfill({json:{ok:true}});
  });
  await page.goto(`/account#token=${'a'.repeat(64)}`);
  await expect(page).toHaveURL(/\/account$/);
  expect(confirmed).toBe(false);
  await page.getByRole('button',{name:'Verify recovery email',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Your username is unchanged');
  await expect(page.getByText('new@example.com',{exact:true})).toBeVisible();
});

test('signed-out verification asks for sign-in and never submits automatically',async({page})=>{
  await page.route('**/api/onboarding/recovery-email-status',route=>route.fulfill({status:401,json:{error:'Sign in'}}));
  await page.goto(`/account#token=${'b'.repeat(64)}`);
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole('main').getByRole('alert')).toContainText('then reopen the email link');
  await expect(page.getByRole('button',{name:'Verify recovery email',exact:true})).toHaveCount(0);
});

test('Hindi mobile settings and request failures retain actionable feedback',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.route('**/api/onboarding/recovery-email-status',route=>route.fulfill({json:{email:null,google:false,available:true}}));
  await page.route('**/api/onboarding/recovery-email-request',route=>route.fulfill({status:429,json:{error:'Too many'}}));
  await page.goto('/account');
  await page.getByRole('button',{name:'Change page language to Hindi'}).click();
  await expect(page.getByRole('heading',{name:'खाता सेटिंग'})).toBeVisible();
  await page.getByLabel('पुनर्प्राप्ति ईमेल पता').fill('owner@example.com');
  await page.getByLabel('वर्तमान पासवर्ड').fill('current-private-password');
  await page.getByRole('button',{name:'सत्यापन लिंक भेजें'}).click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText('एक घंटे');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
