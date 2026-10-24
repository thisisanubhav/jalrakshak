import { test,expect } from '@playwright/test';
import { readFile,mkdir } from 'node:fs/promises';
import { fieldNavigate } from './field-navigation';
import { translate } from '../../src/field/i18n';
const t=translate('en');
test('monthly reports filter offline records, export CSV and print a mobile report',async({page,context})=>{
  await page.goto('/personal');await page.getByText(t('bulkImport'),{exact:true}).click();
  await page.getByLabel(t('csvFile'),{exact:true}).setInputFiles({name:'sources.csv',mimeType:'text/csv',buffer:Buffer.from('code,name,village,district,category,operator\nMONTH,Monthly pump,Village,D,WELL,OP\nOTHER,Other pump,Elsewhere,D,WELL,OTHER\n')});
  await page.getByRole('button',{name:t('csvConfirm'),exact:true}).click();await expect(page.getByRole('heading',{name:'MONTH · Monthly pump',exact:true})).toBeVisible();
  const card=page.locator('article').filter({has:page.getByRole('heading',{name:'MONTH · Monthly pump',exact:true})});
  await card.getByText(t('visitPlan')+': '+t('unscheduled'),{exact:true}).click();await card.getByLabel(t('scheduleDate'),{exact:true}).fill('2026-01-31');await card.getByLabel(t('recurrence'),{exact:true}).selectOption('MONTHLY');await card.getByRole('button',{name:t('saveSchedule'),exact:true}).click();
  await fieldNavigate(page,'reports');await page.getByRole('button',{name:'Monthly reports / मासिक रिपोर्ट',exact:true}).click();
  await page.getByLabel('Report month / रिपोर्ट माह',{exact:true}).fill('2026-02');await page.getByLabel('Report village',{exact:true}).selectOption('Village');
  const report=page.getByTestId('monthly-report');await expect(report).toContainText('MONTH · 2026-02-28 · overdue');await expect(report).not.toContainText('OTHER');
  await page.evaluate(async()=>{await navigator.serviceWorker.ready;});await context.setOffline(true);
  const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Download monthly CSV / मासिक CSV डाउनलोड करें',exact:true}).click();const download=await pending;const csv=await readFile((await download.path())!,'utf8');expect(csv).toContain('"schedule","MONTH","2026-02-28"');expect(csv).not.toContain('Other pump');
  await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await mkdir('test-results/acceptance',{recursive:true});await page.screenshot({path:'test-results/acceptance/monthly-report-mobile.png',fullPage:true});
  await page.emulateMedia({media:'print'});await expect(report).toBeVisible();await expect(page.getByTestId('field-report')).toHaveCount(0);await page.pdf({path:'test-results/acceptance/monthly-report.pdf',format:'A4'});
});
test('backup health is supervisor-only and clearly displays failure stale and offline states',async({page,request,browser,baseURL})=>{
  const origin=new URL(baseURL!).origin,password='test-only-private-password';const session=await(await request.get('/api/team/session')).json();
  if(session.setupRequired)expect((await request.post('/api/team/setup',{headers:{Origin:origin},data:{key:'release-tests-only-setup-key',username:'qa-supervisor',name:'QA supervisor',password}})).ok()).toBe(true);
  expect((await request.post('/api/team/login',{headers:{Origin:origin},data:{username:'qa-supervisor',password}})).ok()).toBe(true);
  expect((await request.get('/api/team/backups')).ok()).toBe(true);
  const username='health-'+Date.now();expect((await request.post('/api/team/users',{headers:{Origin:origin},data:{username,name:'Health worker',role:'worker',password}})).ok()).toBe(true);
  const worker=await browser.newContext({baseURL});try{await worker.request.post('/api/team/login',{headers:{Origin:origin},data:{username,password}});expect((await worker.request.get('/api/team/backups')).status()).toBe(403);}finally{await worker.close();}
  await page.goto('/');await page.getByLabel('Username',{exact:true}).fill('qa-supervisor');await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page.getByRole('button',{name:t('add'),exact:true})).toBeVisible();
  let status='missing';const at='2026-01-01T12:00:00.000Z';
  await page.route('**/api/team/backups',route=>status==='offline'?route.abort():route.fulfill({json:{status,checkedAt:new Date().toISOString(),lastFailure:status==='failed'?at:null,lastBackup:status==='missing'?null:{at,records:12,bytes:4096,integrity:'ok',retention:30},storage:'server'}}));
  await fieldNavigate(page,'dataTools');const panel=page.getByRole('region',{name:'Backup health / बैकअप स्थिति',exact:true});await expect(panel).toContainText('No verified backup recorded');
  for(const [state,message] of [['healthy','Verified backup is recent'],['overdue','Backup overdue'],['failed','Backup failed or copy is missing'],['offline','Cannot check server backups']]){status=state;await panel.getByRole('button',{name:'Refresh backup health / बैकअप स्थिति जाँचें',exact:true}).click();await expect(panel).toContainText(message);}
  status='overdue';await panel.getByRole('button',{name:'Refresh backup health / बैकअप स्थिति जाँचें',exact:true}).click();await expect(panel).toContainText('Backup overdue');await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await panel.scrollIntoViewIfNeeded();await mkdir('test-results/acceptance',{recursive:true});await panel.screenshot({path:'test-results/acceptance/backup-health-mobile.png'});
});
