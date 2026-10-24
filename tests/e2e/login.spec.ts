import { test,expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
test('login switches language preserves inputs and shows loading and clear errors',async({page})=>{
  await page.route('**/api/team/session',route=>route.fulfill({status:401,json:{error:'Sign in required.'}}));
  await page.goto('/');await expect(page.getByRole('heading',{name:'Sign in to JalRakshak',exact:true})).toBeVisible();
  await page.evaluate(()=>document.fonts.ready);
  for(const width of [1280,390,320]){
    await page.setViewportSize({width,height:900});
    const card=page.locator('.team-login-card');const english=await card.boundingBox();
    await page.getByRole('button',{name:'Switch to Hindi',exact:true}).click();const hindi=await card.boundingBox();
    expect(Math.abs(english!.width-hindi!.width)).toBeLessThanOrEqual(1);expect(Math.abs(english!.height-hindi!.height)).toBeLessThanOrEqual(1);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    await page.getByRole('button',{name:'Switch to English',exact:true}).click();
  }
  await page.setViewportSize({width:1280,height:900});
  const password=page.getByLabel('Password',{exact:true});await page.getByLabel('Username',{exact:true}).fill('login-test');await password.fill('private-test-password');
  await expect(password).toHaveAttribute('type','password');await page.getByRole('button',{name:'Show password',exact:true}).click();await expect(password).toHaveAttribute('type','text');await page.getByRole('button',{name:'Hide password',exact:true}).click();await expect(password).toHaveAttribute('type','password');
  await page.getByRole('button',{name:'Switch to Hindi',exact:true}).click();await expect(page.getByLabel('उपयोगकर्ता नाम',{exact:true})).toHaveValue('login-test');await expect(page.getByLabel('पासवर्ड',{exact:true})).toHaveValue('private-test-password');await expect(page.getByRole('button',{name:'साइन इन करें',exact:true})).toBeVisible();
  await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await mkdir('test-results/acceptance',{recursive:true});await page.screenshot({path:'test-results/acceptance/login-hindi-mobile.png',fullPage:true});
  let release:()=>void=()=>{};const gate=new Promise<void>(resolve=>{release=resolve;});
  await page.route('**/api/team/login',async route=>{await gate;await route.fulfill({status:401,json:{error:'Username or password is incorrect.'}});});
  await page.getByRole('button',{name:'साइन इन करें',exact:true}).click();await expect(page.getByRole('button',{name:'साइन इन हो रहा है…',exact:true})).toBeDisabled();release();await expect(page.locator('form').getByRole('alert')).toHaveText('उपयोगकर्ता नाम या पासवर्ड गलत है।');
  await page.getByRole('button',{name:'Switch to English',exact:true}).click();await expect(page.locator('form').getByRole('alert')).toHaveText('Username or password is incorrect.');
  await page.unroute('**/api/team/login');await page.route('**/api/team/login',route=>route.abort());await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page.locator('form').getByRole('alert')).toContainText('Cannot reach the server');await expect(page.getByRole('button',{name:'Sign in',exact:true})).toBeEnabled();
  await page.setViewportSize({width:1280,height:900});await page.screenshot({path:'test-results/acceptance/login-english-desktop.png',fullPage:true});
});
test('first supervisor setup keeps its required fields and reports invalid setup keys',async({page})=>{
  await page.route('**/api/team/session',route=>route.fulfill({json:{setupRequired:true}}));await page.route('**/api/team/setup',route=>route.fulfill({status:403,json:{error:'Setup key is incorrect.'}}));
  await page.goto('/');await page.getByLabel('Setup key',{exact:true}).fill('wrong-key');await page.getByLabel('Name',{exact:true}).fill('Supervisor');await page.getByLabel('Username',{exact:true}).fill('first-supervisor');await page.getByLabel('Password',{exact:true}).fill('private-test-password');await page.getByRole('button',{name:'Create supervisor',exact:true}).click();await expect(page.locator('form').getByRole('alert')).toHaveText('The setup key is incorrect.');
});
