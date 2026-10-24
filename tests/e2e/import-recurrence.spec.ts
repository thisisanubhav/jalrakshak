import { test,expect,type Page } from '@playwright/test';
import { readFile,mkdir } from 'node:fs/promises';
import { translate } from '../../src/field/i18n';
import { fieldNavigate } from './field-navigation';
const t=translate('en');
const header='code,name,village,district,category,latitude,longitude,operator,location\n';
const csv=header+'BULK-A,School pump,Rampur,Khunti,HANDPUMP,23.61,85.52,OP,Near school\nBULK-B,Community well,Rampur,Khunti,WELL,,,OP,Near gate\n';
async function upload(page:Page,value=csv){await page.getByText(t('bulkImport'),{exact:true}).click();await page.getByLabel(t('csvFile'),{exact:true}).setInputFiles({name:'sources.csv',mimeType:'text/csv',buffer:Buffer.from(value)});}
async function fillVisit(page:Page){
  const timestamp=await page.evaluate(()=>{const d=new Date();const input=document.createElement('input');input.type='datetime-local';input.value=new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,19);return input.value;});
  for(const [key,value] of [['measuredAt',timestamp],['reading1','600'],['reading2','602'],['instrument','Meter'],['operator','OP']] as const)await page.getByLabel(t(key),{exact:true}).fill(value);
  await page.getByRole('button',{name:t('review'),exact:true}).click();await page.getByRole('button',{name:t('save'),exact:true}).click();
}
test('bulk import previews, blocks errors and duplicates, and persists an offline corrected batch',async({page,context})=>{
  await page.goto('/personal');await page.evaluate(async()=>{await navigator.serviceWorker.ready;});await context.setOffline(true);
  await upload(page,csv.replace('23.61','999'));
  await expect(page.getByText(t('csvCoordinates'),{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:t('csvConfirm'),exact:true})).toBeDisabled();
  await expect(page.getByRole('heading',{name:'BULK-A · School pump',exact:true})).toHaveCount(0);
  await page.getByLabel(t('csvContent'),{exact:true}).fill(csv);await page.getByRole('button',{name:t('csvPreview'),exact:true}).click();
  await expect(page.getByRole('region',{name:t('csvPreview'),exact:true})).toContainText('2 / 2');
  await mkdir('test-results/acceptance',{recursive:true});await page.screenshot({path:'test-results/acceptance/bulk-import.png',fullPage:true});
  await page.getByRole('button',{name:t('csvConfirm'),exact:true}).click();await expect(page.getByText(t('csvDone'),{exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'BULK-A · School pump',exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'BULK-B · Community well',exact:true})).toBeVisible();
  await page.reload();await expect(page.getByRole('heading',{name:'BULK-B · Community well',exact:true})).toBeVisible();
  await upload(page);await expect(page.getByText(t('csvDuplicate'),{exact:true})).toHaveCount(2);await expect(page.getByRole('button',{name:t('csvConfirm'),exact:true})).toBeDisabled();
  await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Switch language / भाषा बदलें'}).click();
  await expect(page.getByText(translate('hi')('csvDuplicate'),{exact:true})).toHaveCount(2);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
test('weekly visits advance offline, finish at the end date and retain occurrence evidence in backup',async({page,context,browser,baseURL})=>{
  await page.goto('/personal');await upload(page,header+csv.split('\n')[1]+'\n');await page.getByRole('button',{name:t('csvConfirm'),exact:true}).click();
  await expect(page.getByRole('heading',{name:'BULK-A · School pump',exact:true})).toBeVisible();
  const dates=await page.evaluate(()=>{const today=new Date();const prior=new Date();prior.setDate(prior.getDate()-7);const fmt=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;return {today:fmt(today),prior:fmt(prior)};});
  await page.getByText(t('visitPlan')+': '+t('unscheduled'),{exact:true}).click();
  await page.getByLabel(t('scheduleDate'),{exact:true}).fill(dates.prior);await page.getByLabel(t('recurrence'),{exact:true}).selectOption('WEEKLY');await page.getByLabel(t('recurrenceEnd'),{exact:true}).fill(dates.today);await page.getByRole('button',{name:t('saveSchedule'),exact:true}).click();
  const plan=page.getByRole('region',{name:t('visitPlan'),exact:true});await plan.getByRole('button',{name:'Overdue (1)',exact:true}).click();
  await page.evaluate(async()=>{await navigator.serviceWorker.ready;});await context.setOffline(true);
  await plan.getByRole('button',{name:t('taskMeasureAction')+' · BULK-A',exact:true}).click();await fillVisit(page);await fieldNavigate(page,'sources');
  await plan.getByRole('button',{name:'Today (1)',exact:true}).click();await expect(plan.getByText(dates.today,{exact:true})).toBeVisible();
  await plan.getByRole('button',{name:t('taskMeasureAction')+' · BULK-A',exact:true}).click();await page.reload();await fillVisit(page);await expect(page.getByTestId('field-measurement')).toHaveCount(2);
  await fieldNavigate(page,'sources');await plan.getByRole('button',{name:'Completed (1)',exact:true}).click();await expect(plan.getByRole('button',{name:t('taskMeasureAction')+' · BULK-A',exact:true})).toHaveCount(0);
  await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await mkdir('test-results/acceptance',{recursive:true});await page.screenshot({path:'test-results/acceptance/recurring-schedule-mobile.png',fullPage:true});
  await fieldNavigate(page,'dataTools');const download=page.waitForEvent('download');await page.getByRole('button',{name:t('downloadBackup'),exact:true}).click();const bytes=await readFile((await(await download).path())!);
  const data=JSON.parse(bytes.toString()).data;expect(data.sources[0].schedule.recurrence).toBe('WEEKLY');expect(data.measurements.map((m:{scheduleId:string})=>m.scheduleId)).toEqual([data.sources[0].schedule.id,data.sources[0].schedule.id+'@'+dates.today]);
  await context.setOffline(false);const recovery=await browser.newContext({baseURL});try{const restored=await recovery.newPage();await restored.goto('/personal');await fieldNavigate(restored,'dataTools');await restored.getByLabel(t('backupFile'),{exact:true}).setInputFiles({name:'schedule.json',mimeType:'application/json',buffer:bytes});await restored.getByRole('button',{name:t('confirmRestore'),exact:true}).click();await expect(restored.getByText(t('backupRestored'),{exact:true})).toBeVisible();await fieldNavigate(restored,'sources');await expect(restored.getByRole('region',{name:t('visitPlan'),exact:true}).getByRole('button',{name:'Completed (1)',exact:true})).toBeVisible();}finally{await recovery.close();}
});
test('supervisor imports sources and shares monthly schedules with an assigned worker',async({page,browser,request,baseURL})=>{
  const origin=new URL(baseURL!).origin,password='test-only-private-password';const state=await(await request.get('/api/team/session')).json();
  if(state.setupRequired)expect((await request.post('/api/team/setup',{headers:{Origin:origin},data:{key:'release-tests-only-setup-key',username:'qa-supervisor',name:'QA supervisor',password}})).ok()).toBe(true);
  expect((await request.post('/api/team/login',{headers:{Origin:origin},data:{username:'qa-supervisor',password}})).ok()).toBe(true);
  const username='import-'+Date.now();const response=await request.post('/api/team/users',{headers:{Origin:origin},data:{username,name:username,role:'worker',password}});expect(response.ok()).toBe(true);const user=(await response.json()).user;
  async function login(target:Page,name:string){await target.goto('/');await target.getByLabel('Username / उपयोगकर्ता नाम',{exact:true}).fill(name);await target.getByLabel('Password / पासवर्ड',{exact:true}).fill(password);await target.getByRole('button',{name:'Sign in / लॉगिन',exact:true}).click();await expect(target.getByRole('button',{name:t('add'),exact:true})).toBeVisible();}
  await login(page,'qa-supervisor');await upload(page,header+`${username},Team pump,Village,Khunti,WELL,,,OP,\n`);await page.getByRole('button',{name:t('csvConfirm'),exact:true}).click();await expect(page.getByRole('heading',{name:username+' · Team pump',exact:true})).toBeVisible();
  const card=page.locator('article').filter({has:page.getByRole('heading',{name:username+' · Team pump',exact:true})});await card.getByText(t('visitPlan')+': '+t('unscheduled'),{exact:true}).click();await card.getByLabel(t('scheduleDate'),{exact:true}).fill('2026-01-31');await card.getByLabel(t('recurrence'),{exact:true}).selectOption('MONTHLY');await card.getByRole('button',{name:t('saveSchedule'),exact:true}).click();
  await page.getByRole('button',{name:'Sync now / अभी सिंक करें'}).click();await expect(page.getByText('Team records synchronized. / टीम रिकॉर्ड सिंक हैं।',{exact:true})).toBeVisible();
  const snapshot=await(await request.get('/api/team/records')).json();const source=snapshot.data.sources.find((s:{code:string})=>s.code===username);expect(source.schedule.recurrence).toBe('MONTHLY');expect((await request.post('/api/team/assign',{headers:{Origin:origin},data:{sourceId:source.id,userId:user.id}})).ok()).toBe(true);
  const workerContext=await browser.newContext({baseURL});try{
    const worker=await workerContext.newPage();await login(worker,username);await expect(worker.getByText(t('bulkImport'),{exact:true})).toHaveCount(0);await expect(worker.getByLabel(t('recurrence'),{exact:true})).toHaveCount(0);
    const plan=worker.getByRole('region',{name:t('visitPlan'),exact:true});await plan.getByRole('button',{name:'Overdue (1)',exact:true}).click();await plan.getByRole('button',{name:t('taskMeasureAction')+' · '+username,exact:true}).click();await fillVisit(worker);
    await worker.getByRole('button',{name:'Sync now / अभी सिंक करें'}).click();await expect(worker.getByText('Team records synchronized. / टीम रिकॉर्ड सिंक हैं।',{exact:true})).toBeVisible();await fieldNavigate(worker,'sources');await plan.getByRole('button',{name:'Overdue (1)',exact:true}).click();await expect(plan.getByText('2026-02-28',{exact:true})).toBeVisible();
    const remote=await(await workerContext.request.get(origin+'/api/team/records')).json();expect(remote.data.sources[0].schedule.id).toBe(source.schedule.id);expect(remote.data.measurements[0].scheduleId).toBe(source.schedule.id);
  }finally{await workerContext.close();}
});
