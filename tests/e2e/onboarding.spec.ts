import { test, expect } from '@playwright/test';

test('email signup shows delivery feedback and never asks for a setup key',async({page})=>{
  await page.route('**/api/onboarding/capabilities',route=>route.fulfill({json:{email:true,google:true}}));
  await page.route('**/api/onboarding/verify',async route=>{
    expect(route.request().postDataJSON()).toEqual({email:'signup@example.com'});
    await route.fulfill({json:{ok:true}});
  });
  await page.goto('/signup');
  await expect(page.getByRole('heading',{name:'Create your organisation'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Continue with Google'})).toBeVisible();
  await expect(page.getByLabel('Setup key')).toHaveCount(0);
  await page.getByLabel('Email',{exact:true}).fill('signup@example.com');
  await page.getByRole('button',{name:'Send verification link'}).click();
  await expect(page.getByRole('status')).toContainText('Check your email');
});

test('invitation keeps organisation fixed and removes token from address bar',async({page})=>{
  await page.route('**/api/onboarding/capabilities',route=>route.fulfill({json:{email:true,google:true}}));
  await page.route('**/api/onboarding/inspect',route=>route.fulfill({json:{kind:'invite',email:'worker@example.com',organisation:'River team'}}));
  await page.goto(`/signup#token=${'a'.repeat(64)}`);
  await expect(page.getByRole('heading',{name:'Join your team'})).toBeVisible();
  await expect(page).toHaveURL(/\/signup$/);
  await expect(page.getByText('River team',{exact:true})).toBeVisible();
  await expect(page.getByLabel('Organisation name')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Continue with Google'})).toHaveCount(0);
  await expect(page.getByLabel('Password · at least 12 characters')).toBeVisible();
});

test('Google signup asks for organisation without requesting a Google password',async({page})=>{
  await page.route('**/api/onboarding/capabilities',route=>route.fulfill({json:{email:true,google:true}}));
  await page.route('**/api/onboarding/inspect',route=>route.fulfill({json:{kind:'google-verified',email:'google@example.com'}}));
  await page.goto(`/signup#token=${'b'.repeat(64)}`);
  await expect(page.getByLabel('Organisation name')).toBeVisible();
  await expect(page.getByLabel('Unique username')).toBeVisible();
  await expect(page.locator('input[type=password]')).toHaveCount(0);
});

test('Hindi mobile signup stays within the viewport and expired links show recovery',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.route('**/api/onboarding/capabilities',route=>route.fulfill({json:{email:true,google:true}}));
  await page.route('**/api/onboarding/inspect',route=>route.fulfill({status:400,json:{error:'Expired'}}));
  await page.goto(`/signup#token=${'c'.repeat(64)}`);
  await expect(page.getByRole('alert')).toBeVisible();
  await page.getByRole('button',{name:'हिन्दी'}).click();
  await expect(page.getByRole('heading',{name:'अपना संगठन बनाएँ'})).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('लिंक अमान्य');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
