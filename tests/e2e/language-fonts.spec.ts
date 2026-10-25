import {expect,test} from '@playwright/test';
test('language persists across public pages and both fonts remain available offline',async({page,context})=>{
  await page.goto('/personal');
  await page.getByRole('button',{name:'Switch language',exact:true}).click();
  await expect(page.locator('html')).toHaveAttribute('lang','hi');
  await expect(page.getByRole('link',{name:'गोपनीयता',exact:true})).toBeVisible();
  await expect(page.getByRole('link',{name:'Privacy',exact:true})).toHaveCount(0);
  await page.getByRole('link',{name:'संपर्क करें',exact:true}).click();
  await expect(page.getByLabel('आपका नाम',{exact:true})).toBeVisible();
  await expect(page.getByLabel('Your name',{exact:true})).toHaveCount(0);
  await page.reload();await expect(page.locator('html')).toHaveAttribute('lang','hi');
  await page.getByRole('link',{name:'गोपनीयता',exact:true}).click();
  await expect(page.getByRole('heading',{name:'संचालक और संपर्क',exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Operator and contact',exact:true})).toHaveCount(0);
  await page.evaluate(async()=>{await navigator.serviceWorker.ready;await document.fonts.load('16px "Jal Noto Sans"','Water');await document.fonts.load('16px "Jal Noto Devanagari"','जल');});
  await context.setOffline(true);await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang','hi');
  const fonts=await page.evaluate(async()=>{
    await document.fonts.load('16px "Jal Noto Sans"','Water');await document.fonts.load('16px "Jal Noto Devanagari"','जल');
    return ['Jal Noto Sans','Jal Noto Devanagari'].map(name=>[...document.fonts].some(font=>font.family.replaceAll('"','')===name&&font.status==='loaded'));
  });expect(fonts).toEqual([true,true]);
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.getByRole('button',{name:'Change page language to English',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Operator and contact',exact:true})).toBeVisible();
});
