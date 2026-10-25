import { test, expect, type Page } from '@playwright/test';
import { fieldNavigate } from './field-navigation';
import { translate } from '../../src/field/i18n';
const t=translate('en'),password='test-only-private-password';
test.use({launchOptions:{chromiumSandbox:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']}});
async function register(page:Page,code:string){
  await page.getByRole('button',{name:t('add'),exact:true}).click();
  await page.getByLabel(t('state'),{exact:true}).fill('Jharkhand');
  for(const [key,value] of [['code',code],['name','AI test pump'],['village','Village'],['district','Khunti'],['operator','OP']] as const)await page.getByLabel(t(key),{exact:true}).fill(value);
  await page.getByRole('button',{name:t('save'),exact:true}).click();await expect(page.getByRole('heading',{name:`${code} · AI test pump`})).toBeVisible();
}
async function login(page:Page,user:string){await page.goto('/');await page.getByLabel('Username',{exact:true}).fill(user);await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page.getByRole('button',{name:t('add'),exact:true})).toBeVisible();}
test('voice recording and transcript drafts survive offline reload and require explicit use',async({page,context})=>{
  await page.goto('/personal');await register(page,'VOICE-OFFLINE');await fieldNavigate(page,'measure');
  await page.evaluate(async()=>{await navigator.serviceWorker.ready;});await context.setOffline(true);
  await page.getByText('Voice notes & AI draft',{exact:true}).click();
  await page.getByRole('button',{name:'Record voice note',exact:true}).click();await expect(page.getByRole('button',{name:'Stop recording',exact:true})).toBeVisible();
  await page.waitForTimeout(1500);await page.getByRole('button',{name:'Stop recording',exact:true}).click();
  await expect(page.getByRole('button',{name:'Transcribe recording',exact:true})).toBeEnabled();
  await page.getByLabel('Transcript — edit before drafting',{exact:true}).fill('Platform cracked; inspect drainage.');
  await expect(page.getByText('Voice draft saved on this device.',{exact:true})).toBeVisible();
  await expect(page.getByLabel(t('notes'),{exact:true})).toHaveValue('');
  await page.reload();await fieldNavigate(page,'measure');await page.getByText('Voice notes & AI draft',{exact:true}).click();
  await expect(page.getByLabel('Transcript — edit before drafting',{exact:true})).toHaveValue('Platform cracked; inspect drainage.');
  await expect(page.getByRole('button',{name:'Transcribe recording',exact:true})).toBeVisible();
  await page.getByLabel(t('notes'),{exact:true}).fill('Existing observation.');await page.getByRole('button',{name:'Use transcript in notes',exact:true}).click();
  await expect(page.getByLabel(t('notes'),{exact:true})).toHaveValue('Existing observation.\n\nPlatform cracked; inspect drainage.');
  await page.getByRole('button',{name:'Draft observation note',exact:true}).click();await expect(page.getByText('Sign in again. Your draft is preserved.',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Delete recording',exact:true}).click();await expect(page.getByRole('button',{name:'Transcribe recording',exact:true})).toHaveCount(0);
  await page.setViewportSize({width:320,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('button',{name:'Switch language / भाषा बदलें'}).click();await expect(page.getByText('वॉइस नोट और AI मसौदा',{exact:true})).toBeVisible();
});
test('worker drafts and supervisor summaries preserve manual notes and require review confirmation',async({page,request,browser,baseURL})=>{
  const origin=new URL(baseURL!).origin;const state=await(await request.get('/api/team/session')).json();
  if(state.setupRequired)expect((await request.post('/api/team/setup',{headers:{Origin:origin},data:{key:'release-tests-only-setup-key',username:'qa-supervisor',name:'QA supervisor',password}})).ok()).toBe(true);
  expect((await request.post('/api/team/login',{headers:{Origin:origin},data:{username:'qa-supervisor',password}})).ok()).toBe(true);
  const username='voice-'+Date.now(),code='VOICE-'+Date.now();await request.post('/api/team/users',{headers:{Origin:origin},data:{username,name:'Voice worker',password,role:'worker'}});
  await login(page,username);await register(page,code);await fieldNavigate(page,'measure');await page.getByText('Voice notes & AI draft',{exact:true}).click();
  await page.getByLabel(t('notes'),{exact:true}).fill('Manual note.');await page.getByLabel('Transcript — edit before drafting',{exact:true}).fill('Platform cracked.');
  let calls=0;await page.route('**/api/ai/note',async route=>{calls++;expect(route.request().headers()['x-jalrakshak-account']).toBeTruthy();await route.fulfill({status:calls===1?503:200,json:calls===1?{error:'AI_UNAVAILABLE'}:{text:'Observation: platform cracked.',model:'fixture-local'}});});
  await page.getByRole('button',{name:'Draft observation note',exact:true}).click();await expect(page.getByText('AI is unavailable. Keep your draft and retry, or enter notes manually.',{exact:true})).toBeVisible();
  await expect(page.getByLabel(t('notes'),{exact:true})).toHaveValue('Manual note.');await page.getByRole('button',{name:'Draft observation note',exact:true}).click();
  await expect(page.getByLabel('AI draft — review and edit',{exact:true})).toHaveValue('Observation: platform cracked.');await expect(page.getByLabel(t('notes'),{exact:true})).toHaveValue('Manual note.');
  await page.getByLabel('AI draft — review and edit',{exact:true}).fill('Reviewed: platform cracked.');await page.getByRole('button',{name:'Use reviewed draft in notes',exact:true}).click();
  await expect(page.getByLabel(t('notes'),{exact:true})).toHaveValue('Manual note.\n\nReviewed: platform cracked.');
  for(const [key,value] of [['measuredAt','2026-10-24T10:00'],['reading1','600'],['reading2','602'],['instrument','Meter'],['operator','OP']] as const)await page.getByLabel(t(key),{exact:true}).fill(value);
  await page.getByRole('button',{name:t('review'),exact:true}).click();await page.getByRole('button',{name:t('save'),exact:true}).click();await expect(page.getByText(t('saved'),{exact:true})).toBeVisible();
  await expect.poll(async()=>{const snap=await(await request.get('/api/team/records')).json();const source=snap.data.sources.find((s:{code:string})=>s.code===code);return snap.data.measurements.some((m:{sourceId:string})=>m.sourceId===source?.id);},{timeout:15000}).toBe(true);
  const admin=await browser.newContext({baseURL});try{
    const supervisor=await admin.newPage();await login(supervisor,'qa-supervisor');await fieldNavigate(supervisor,'investigations');
    const card=supervisor.locator('.visit-review-card').filter({has:supervisor.getByRole('heading',{name:new RegExp(code)})});
    await card.getByText('AI visit summary',{exact:true}).click();
    await supervisor.route('**/api/ai/summary',async route=>{expect(route.request().postDataJSON().visitId).toBeTruthy();await route.fulfill({json:{text:'Cracked platform reported. Readings 600 and 602 µS/cm.',model:'fixture-local'}});});
    await card.getByRole('button',{name:'Summarize visit',exact:true}).click();await expect(card.getByLabel('AI summary — review and edit',{exact:true})).toHaveValue(/Cracked platform/);
    await expect(card.getByLabel(t('reviewNote'),{exact:true})).toHaveValue('');await card.getByLabel('AI summary — review and edit',{exact:true}).fill('Checked summary: follow up on platform.');
    await card.getByRole('button',{name:'Add reviewed summary to review note',exact:true}).click();await expect(card.getByLabel(t('reviewNote'),{exact:true})).toHaveValue('Checked summary: follow up on platform.');
    const before=await(await request.get('/api/team/records')).json();expect(before.data.sources.find((s:{code:string})=>s.code===code).visitReviews??[]).toHaveLength(0);
    await supervisor.setViewportSize({width:390,height:844});expect(await supervisor.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await card.getByRole('button',{name:t('saveReview'),exact:true}).click();await expect(card).toHaveCount(0);
  }finally{await admin.close();}
});

test('supervisor history and monthly drafts require review and reset when filters change',async({page,request,baseURL})=>{
  const origin=new URL(baseURL!).origin;
  const state=await(await request.get('/api/team/session')).json();
  if(state.setupRequired)expect((await request.post('/api/team/setup',{headers:{Origin:origin},data:{key:'release-tests-only-setup-key',username:'qa-supervisor',name:'QA supervisor',password}})).ok()).toBe(true);
  await login(page,'qa-supervisor');await register(page,'REPORT-AI-'+Date.now());
  await fieldNavigate(page,'history');
  await page.route('**/api/ai/history',async route=>{expect(route.request().postDataJSON().sourceId).toBeTruthy();await route.fulfill({json:{text:'Recorded visits: 0',basis:'Synced records only.',references:[]}});});
  await page.getByText('AI source history summary',{exact:true}).click();await page.getByRole('button',{name:'Generate draft',exact:true}).click();
  await expect(page.getByLabel('Draft — review and edit',{exact:true})).toHaveValue('Recorded visits: 0');
  const download=page.getByRole('button',{name:'Download reviewed draft',exact:true});await expect(download).toBeDisabled();
  await page.getByLabel('I checked this draft against the records.',{exact:true}).check();await expect(download).toBeEnabled();
  await page.getByLabel('Draft — review and edit',{exact:true}).fill('Checked: no recorded visits.');await expect(download).toBeDisabled();
  await page.getByLabel('I checked this draft against the records.',{exact:true}).check();
  const downloaded=page.waitForEvent('download');await download.click();expect((await downloaded).suggestedFilename()).toBe('jalrakshak-history-draft.txt');
  await fieldNavigate(page,'reports');await page.getByRole('button',{name:'Monthly reports / मासिक रिपोर्ट',exact:true}).click();
  await page.route('**/api/ai/monthly',async route=>{expect(route.request().postDataJSON().month).toMatch(/^\d{4}-\d{2}$/);await route.fulfill({json:{text:'Monthly totals from synced records.',basis:'Server calendar.',references:[]}});});
  await page.getByText('AI monthly report draft',{exact:true}).click();await page.getByRole('button',{name:'Generate draft',exact:true}).click();
  await expect(page.getByLabel('Draft — review and edit',{exact:true})).toHaveValue('Monthly totals from synced records.');
  await page.getByLabel('Report month / रिपोर्ट माह',{exact:true}).fill('2026-01');await expect(page.getByLabel('Draft — review and edit',{exact:true})).toHaveCount(0);
  await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
