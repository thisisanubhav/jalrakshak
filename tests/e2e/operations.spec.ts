import {test,expect,type Page,type APIRequestContext} from '@playwright/test';
import QRCode from 'qrcode';
import {readFile,mkdir} from 'node:fs/promises';
import {translate} from '../../src/field/i18n';
import {sourceQrValue} from '../../src/field/operations';
import {fieldNavigate,openTraining} from './field-navigation';
const t=translate('en');const password='test-only-private-password';
test('acceptance: assigned scheduled offline photo visit syncs, is reviewed and restores intact',async({page,browser,request,baseURL})=>{
  test.setTimeout(120000);
  const origin=new URL(baseURL!).origin;await admin(request,origin);
  const username='acceptance-'+Date.now();
  expect((await request.post('/api/team/users',{headers:{Origin:origin},data:{username,name:username,role:'worker',password}})).ok()).toBe(true);
  await login(page,'qa-supervisor');await register(page,username);
  const sourceCard=page.locator('article').filter({has:page.getByRole('heading',{name:username+' · Operations pump',exact:true})});
  await sourceCard.getByText(t('visitPlan')+': '+t('unscheduled'),{exact:true}).click();
  const today=await page.evaluate(()=>{const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10);});
  await sourceCard.getByLabel(t('scheduleDate'),{exact:true}).fill(today);
  await sourceCard.getByLabel(t('scheduleNote'),{exact:true}).fill('Inspect pump apron');
  await sourceCard.getByRole('button',{name:t('saveSchedule'),exact:true}).click();
  await page.getByRole('button',{name:"Sync now"}).click();
  await expect(page.getByText("Team records synchronized.",{exact:true})).toBeVisible();
  await fieldNavigate(page,'investigations');await page.getByRole('button',{name:"Manage team"}).click();
  await page.getByLabel('Source',{exact:true}).selectOption({label:username+' · Operations pump — qa-supervisor'});
  await page.getByLabel('Assigned worker',{exact:true}).selectOption({label:username});
  await page.getByRole('button',{name:'Save assignment',exact:true}).click();
  await expect(page.getByText("Assignment saved. Workers must sync to refresh access.",{exact:true})).toBeVisible();
  await page.getByRole('button',{name:"Back to dashboard"}).click();
  const context=await browser.newContext({baseURL,viewport:{width:390,height:844}});
  const recovery=await browser.newContext({baseURL});
  try{
    const worker=await context.newPage();await login(worker,username);
    const snapshot=await(await context.request.get(origin+'/api/team/records')).json();const source=snapshot.data.sources[0];
    expect(source.schedule.date).toBe(today);
    await worker.getByText(t('scanSource'),{exact:true}).click();
    // Exercise permission failure without accessing a physical camera.
    await worker.evaluate(()=>{Object.defineProperty(navigator.mediaDevices,'getUserMedia',{configurable:true,value:()=>Promise.reject(new DOMException('Denied','NotAllowedError'))});});
    await worker.getByRole('button',{name:t('startCamera'),exact:true}).click();
    await expect(worker.getByText(t('qrCameraError'),{exact:true})).toBeVisible();
    await worker.getByLabel(t('qrImage'),{exact:true}).setInputFiles({name:'source.png',mimeType:'image/png',buffer:await QRCode.toBuffer(sourceQrValue(source.id))});
    await expect(worker.getByLabel(t('select'),{exact:true})).toHaveValue(source.id);
    await fieldNavigate(worker,'sources');
    await worker.getByRole('region',{name:t('visitPlan'),exact:true}).getByRole('button',{name:t('taskMeasureAction')+' · '+username,exact:true}).click();
    await fillVisit(worker);
    await worker.locator('summary').filter({hasText:t('visitPhotos')}).click();
    await worker.getByLabel(t('visitPhotos'),{exact:true}).setInputFiles({name:'evidence.png',mimeType:'image/png',buffer:await QRCode.toBuffer('Acceptance evidence')});
    await worker.getByLabel(t('photoCaption')+' 1',{exact:true}).fill('Apron condition');
    await worker.getByLabel(t('notes'),{exact:true}).click();
    await expect(worker.getByRole('button',{name:t('review'),exact:true})).toBeEnabled();
    await worker.evaluate(async()=>{await navigator.serviceWorker.ready;});await context.setOffline(true);await worker.reload();
    await expect(worker.getByLabel(t('photoCaption')+' 1',{exact:true})).toHaveValue('Apron condition');
    await worker.getByRole('button',{name:t('review'),exact:true}).click();await worker.getByRole('button',{name:t('saveVisit'),exact:true}).click();
    await expect(worker.getByTestId('field-measurement')).toHaveCount(1);
    await worker.reload();await expect(worker.getByRole('img',{name:'Apron condition',exact:true})).toBeVisible();
    await expect(worker.getByTestId('pending-count')).toContainText(/^[1-9]\d* pending records/);
    expect(await worker.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    await mkdir('test-results/acceptance',{recursive:true});
    await worker.screenshot({path:'test-results/acceptance/offline-mobile.png',fullPage:true});
    await context.setOffline(false);
    await expect.poll(async()=>{const s=await(await context.request.get(origin+'/api/team/records')).json();return s.data.measurements.length;},{timeout:15000}).toBe(1);
    const synced=await(await context.request.get(origin+'/api/team/records')).json();
    expect(synced.data.measurements[0].scheduleId).toBe(source.schedule.id);expect(synced.data.measurements[0].photos[0].caption).toBe('Apron condition');
    await page.getByRole('button',{name:"Sync now"}).click();await expect(page.getByText("Team records synchronized.",{exact:true})).toBeVisible();
    await fieldNavigate(page,'investigations');
    const queue=page.getByRole('region',{name:t('visitQueue'),exact:true});
    const card=queue.locator('article').filter({has:page.getByRole('heading',{name:new RegExp('^'+username+' ·')})});
    await card.getByLabel(t('reviewNote'),{exact:true}).fill('Photo and readings checked');await card.getByRole('button',{name:t('saveReview'),exact:true}).click();
    await page.getByRole('button',{name:"Sync now"}).click();await expect(page.getByText("Team records synchronized.",{exact:true})).toBeVisible();
    await worker.getByRole('button',{name:"Sync now"}).click();await expect(worker.getByText("Team records synchronized.",{exact:true})).toBeVisible();
    await fieldNavigate(worker,'dataTools');const download=worker.waitForEvent('download');await worker.getByRole('button',{name:t('downloadBackup'),exact:true}).click();const bytes=await readFile((await(await download).path())!);
    const data=JSON.parse(bytes.toString()).data;
    expect(data.measurements).toEqual(synced.data.measurements);expect(data.sources[0].visitReviews[0].state).toBe('REVIEWED');
    const restored=await recovery.newPage();await restored.goto('/personal');await fieldNavigate(restored,'dataTools');
    await restored.getByLabel(t('backupFile'),{exact:true}).setInputFiles({name:'acceptance.json',mimeType:'application/json',buffer:bytes});await restored.getByRole('button',{name:t('confirmRestore'),exact:true}).click();
    await expect(restored.getByText(t('backupRestored'),{exact:true})).toBeVisible();
    const roundTrip=restored.waitForEvent('download');await restored.getByRole('button',{name:t('downloadBackup'),exact:true}).click();
    expect(JSON.parse(await readFile((await(await roundTrip).path())!,'utf8')).data).toEqual(data);
    await fieldNavigate(restored,'history');await expect(restored.getByRole('img',{name:'Apron condition',exact:true})).toBeVisible();
    await restored.setViewportSize({width:390,height:844});await restored.getByRole('button',{name:"Switch language"}).click();
    await expect(restored.getByRole('img',{name:translate('hi')('trend'),exact:true})).toBeVisible();
    expect(await restored.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    await restored.screenshot({path:'test-results/acceptance/restored-hindi-mobile.png',fullPage:true});
  }finally{await context.close().catch(()=>{});await recovery.close().catch(()=>{});}
});
async function register(page:Page,code:string){await page.getByRole('button',{name:t('add'),exact:true}).click();await page.getByLabel(t('state'),{exact:true}).selectOption('Jharkhand');
  for(const [key,value] of [['code',code],['name','Operations pump'],['village','Village'],['district','Khunti'],['operator','OP']] as const)await (key === 'district' ? page.getByLabel(t(key), { exact: true }).selectOption(value) : page.getByLabel(t(key), { exact: true }).fill(value));await page.getByRole('button',{name:t('save'),exact:true}).click();await expect(page.getByRole('heading',{name:`${code} · Operations pump`})).toBeVisible();}
async function fillVisit(page:Page){
  const at=await page.evaluate(()=>{
    const now=new Date();
    // datetime-local normalizes zero seconds away. Playwright fill compares
    // the supplied value to that normalized value, so use the browser format.
    const input=document.createElement('input');input.type='datetime-local';input.step='1';
    input.value=new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,19);
    return input.value;
  });
  for(const [key,value] of [['measuredAt',at],['reading1','601'],['reading2','603'],['instrument','Meter'],['operator','OP'],['notes','Cracked apron; follow up']] as const)await page.getByLabel(t(key), { exact: true }).fill(value);
}
async function admin(request:APIRequestContext,origin:string){const state=await(await request.get('/api/team/session')).json();if(state.setupRequired)expect((await request.post('/api/team/setup',{headers:{Origin:origin},data:{key:'release-tests-only-setup-key',username:'qa-supervisor',name:'QA supervisor',password}})).ok()).toBe(true);expect((await request.post('/api/team/login',{headers:{Origin:origin},data:{username:'qa-supervisor',password}})).ok()).toBe(true);}
async function login(page:Page,username:string){await page.goto('/');await page.getByLabel('Username',{exact:true}).fill(username);await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page.getByRole('button',{name:t('add'),exact:true})).toBeVisible();}
test('scheduled visit retains photos offline, completes its task, charts readings and restores backup',async({page,context,browser,baseURL},testInfo)=>{
  await page.goto('/personal');await register(page,'PLAN-1');await page.getByText(t('visitPlan')+': '+t('unscheduled'),{exact:true}).click();
  const today=await page.evaluate(()=>{const now=new Date();return new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,10);});
  await page.getByLabel(t('scheduleDate'),{exact:true}).fill(today);await page.getByLabel(t('scheduleNote'),{exact:true}).fill('Inspect apron');await page.getByRole('button',{name:t('saveSchedule'),exact:true}).click();
  const plan=page.getByRole('region',{name:t('visitPlan'),exact:true});await expect(plan.getByRole('button',{name:'Today (1)',exact:true})).toBeVisible();await plan.getByRole('button',{name:t('taskMeasureAction')+' · PLAN-1',exact:true}).click();await fillVisit(page);
  await page.locator('summary').filter({hasText:t('visitPhotos')}).click();
  const photo=await QRCode.toBuffer('photo-test',{type:'png'});await page.getByLabel(t('visitPhotos'),{exact:true}).setInputFiles({name:'condition.png',mimeType:'image/png',buffer:photo});await expect(page.getByRole('button',{name:t('removePhoto')+' 1',exact:true})).toBeVisible();await page.getByLabel(t('photoCaption')+' 1',{exact:true}).fill('Damaged concrete');await page.getByLabel(t('notes'),{exact:true}).click();
  await expect(page.getByRole('button',{name:t('review'),exact:true})).toBeEnabled();await page.evaluate(async()=>{await navigator.serviceWorker.ready;});await context.setOffline(true);await page.reload();await expect(page.getByLabel(t('photoCaption')+' 1',{exact:true})).toHaveValue('Damaged concrete');await expect(page.getByLabel(t('notes'),{exact:true})).toHaveValue('Cracked apron; follow up');
  await page.getByRole('button',{name:t('review'),exact:true}).click();await page.getByRole('button',{name:t('saveVisit'),exact:true}).click();await expect(page.getByTestId('field-measurement')).toHaveCount(1);await expect(page.getByRole('img',{name:'Damaged concrete',exact:true})).toBeVisible();await expect(page.getByRole('img',{name:t('trend'),exact:true})).toBeVisible();
  await testInfo.attach('visit-photo-trend.png',{body:await page.screenshot({fullPage:true}),contentType:'image/png'});
  await fieldNavigate(page,'sources');await plan.getByRole('button',{name:'Completed (1)',exact:true}).click();await expect(plan.getByText('PLAN-1 · Operations pump',{exact:true})).toBeVisible();await fieldNavigate(page,'dataTools');const dl=page.waitForEvent('download');await page.getByRole('button',{name:t('downloadBackup'),exact:true}).click();const bytes=await readFile((await(await dl).path())!);const backup=JSON.parse(bytes.toString());expect(backup.data.measurements[0].photos[0].caption).toBe('Damaged concrete');expect(backup.data.measurements[0].scheduleId).toBe(backup.data.sources[0].schedule.id);
  await context.setOffline(false);const recovery=await browser.newContext({baseURL});try{const restored=await recovery.newPage();await restored.goto('/personal');await fieldNavigate(restored,'dataTools');await restored.getByLabel(t('backupFile'),{exact:true}).setInputFiles({name:'visits.json',mimeType:'application/json',buffer:bytes});await restored.getByRole('button',{name:t('confirmRestore'),exact:true}).click();await expect(restored.getByText(t('backupRestored'),{exact:true})).toBeVisible();await fieldNavigate(restored,'history');await expect(restored.getByRole('img',{name:'Damaged concrete',exact:true})).toBeVisible();}finally{await recovery.close();}
});
test('offline QR image opens the exact source and rejects unknown labels',async({page,context})=>{
  await page.goto('/personal');await register(page,'QR-A');await register(page,'QR-B');await fieldNavigate(page,'dataTools');const dl=page.waitForEvent('download');await page.getByRole('button',{name:t('downloadBackup'),exact:true}).click();const data=JSON.parse(await readFile((await(await dl).path())!,'utf8')).data;const target=data.sources.find((s:{code:string})=>s.code==='QR-B');await fieldNavigate(page,'sources');await page.evaluate(async()=>{await navigator.serviceWorker.ready;});await context.setOffline(true);
  await page.getByText(t('scanSource'),{exact:true}).click();await page.getByLabel(t('qrImage'),{exact:true}).setInputFiles({name:'source.png',mimeType:'image/png',buffer:await QRCode.toBuffer(sourceQrValue(target.id))});await expect(page.getByRole('heading',{name:t('history'),exact:true})).toBeVisible();await expect(page.getByLabel(t('select'),{exact:true})).toHaveValue(target.id);
  await fieldNavigate(page,'sources');await page.getByText(t('scanSource'),{exact:true}).click();await page.getByLabel(t('qrText'),{exact:true}).fill(sourceQrValue('unknown'));await page.getByRole('button',{name:t('openScannedSource'),exact:true}).click();await expect(page.getByText(t('qrUnavailable'),{exact:true})).toBeVisible();await page.getByLabel(t('qrText'),{exact:true}).fill('QR-A');await page.getByRole('button',{name:t('openScannedSource'),exact:true}).click();await expect(page.getByLabel(t('select'),{exact:true})).toHaveValue(data.sources.find((s:{code:string})=>s.code==='QR-A').id);
});
test('supervisor review requests a linked correction and workers cannot mark records reviewed',async({page,browser,request,baseURL},testInfo)=>{
  test.setTimeout(90000);const origin=new URL(baseURL!).origin;await admin(request,origin);const name='ops-'+Date.now();const response=await request.post('/api/team/users',{headers:{Origin:origin},data:{username:name,name,role:'worker',password}});expect(response.ok()).toBe(true);const workerContext=await browser.newContext({baseURL});try{const worker=await workerContext.newPage();await login(worker,name);await register(worker,name);await fieldNavigate(worker,'measure');await fillVisit(worker);await worker.getByRole('button',{name:t('review'),exact:true}).click();await worker.getByRole('button',{name:t('saveVisit'),exact:true}).click();await expect(worker.getByTestId('field-measurement')).toHaveCount(1);
    await expect.poll(async()=>{const data=await(await workerContext.request.get(`${origin}/api/team/records`)).json();return data.data.measurements.length;},{timeout:15000}).toBe(1);
    await login(page,'qa-supervisor');await fieldNavigate(page,'investigations');const queue=page.getByRole('region',{name:t('visitQueue'),exact:true});const card=queue.locator('article').filter({has:page.getByRole('heading',{name:new RegExp('^'+name+' ·')})});await card.getByLabel(t('reviewDecision'),{exact:true}).selectOption('CORRECTIONS');await card.getByLabel(t('reviewNote'),{exact:true}).fill('Repeat with photo of apron');await card.getByRole('button',{name:t('saveReview'),exact:true}).click();
    await page.getByRole('button',{name:"Sync now"}).click();await expect(page.getByText("Team records synchronized.",{exact:true})).toBeVisible();await worker.getByRole('button',{name:"Sync now"}).click();await expect(worker.getByText("Team records synchronized.",{exact:true})).toBeVisible();await fieldNavigate(worker,'investigations');const workerQueue=worker.getByRole('region',{name:t('visitQueue'),exact:true});await workerQueue.getByRole('button',{name:'Needs corrections (1)',exact:true}).click();await expect(workerQueue.getByText('Repeat with photo of apron',{exact:true})).toBeVisible();await expect(workerQueue.getByRole('button',{name:t('saveReview'),exact:true})).toHaveCount(0);await workerQueue.getByRole('button',{name:t('correctionVisit'),exact:true}).click();await fillVisit(worker);await worker.getByRole('button',{name:t('review'),exact:true}).click();await worker.getByRole('button',{name:t('saveVisit'),exact:true}).click();await expect(worker.getByTestId('field-measurement')).toHaveCount(2);
    await expect.poll(async()=>{const data=await(await workerContext.request.get(`${origin}/api/team/records`)).json();return data.data.measurements.length;},{timeout:15000}).toBe(2);await page.getByRole('button',{name:"Sync now"}).click();await expect(page.getByText("Team records synchronized.",{exact:true})).toBeVisible();await fieldNavigate(page,'investigations');await queue.getByRole('button',{name:/^Submitted for review/}).click();const corrected=queue.locator('article').filter({has:page.getByText(/^Correction of visit:/)});await corrected.getByLabel(t('reviewNote'),{exact:true}).fill('Correction checked');await corrected.getByRole('button',{name:t('saveReview'),exact:true}).click();await queue.getByRole('button',{name:/^Reviewed/}).click();await expect(queue.getByText('Correction checked',{exact:true})).toBeVisible();await testInfo.attach('review-queue.png',{body:await page.screenshot({fullPage:true}),contentType:'image/png'});
  }finally{await workerContext.close().catch(()=>{});}
});

test('trend dates preserve retest and disagreement evidence in Hindi on a narrow screen',async({page},testInfo)=>{
  await page.goto('/personal');await openTraining(page);await page.getByRole('button',{name:t('demo'),exact:true}).click();await page.getByRole('button',{name:t('loadDemo'),exact:true}).click();await fieldNavigate(page,'history');await page.getByLabel(t('select'),{exact:true}).selectOption('field-demo-4');const chart=page.locator('figure.visit-trend');await expect(chart.getByRole('row')).toHaveCount(6);await expect(chart.getByText(t('retestMarker'),{exact:false}).last()).toBeVisible();await chart.getByLabel(t('dateRange'),{exact:true}).fill('2026-01-05');await chart.getByLabel(t('dateRangeEnd'),{exact:true}).fill('2026-01-05');await expect(chart.getByRole('row')).toHaveCount(2);
  await chart.getByLabel(t('dateRange'),{exact:true}).fill('2026-01-06');await expect(chart.getByText(t('trendEmpty'),{exact:true})).toBeVisible();await chart.getByLabel(t('dateRange'),{exact:true}).fill('');await chart.getByLabel(t('dateRangeEnd'),{exact:true}).fill('');await page.getByLabel(t('select'),{exact:true}).selectOption('field-demo-2');await expect(chart.getByRole('cell',{name:'610 / 830',exact:true})).toBeVisible();await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:"Switch language"}).click();await expect(chart.getByRole('img',{name:translate('hi')('trend'),exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await testInfo.attach('trend-hindi-mobile.png',{body:await page.screenshot({fullPage:true}),contentType:'image/png'});
});
