import { fieldNavigate } from "./field-navigation";
import { test, expect, type APIRequestContext, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { translate } from '../../src/field/i18n';
const t=translate('en');
const password='test-only-private-password';
async function administrator(request:APIRequestContext, origin:string) {
  const state=await (await request.get('/api/team/session')).json();
  if(state.setupRequired) {
    const setup=await request.post('/api/team/setup',{headers:{Origin:origin},data:{key:'release-tests-only-setup-key',username:'qa-supervisor',name:'QA supervisor',password}});expect(setup.ok()).toBe(true);
  }
  const result=await request.post('/api/team/login',{headers:{Origin:origin},data:{username:'qa-supervisor',password}});expect(result.ok()).toBe(true);
}
async function login(page:Page,username:string) {
  await page.goto('/'); await page.getByLabel('Username',{exact:true}).fill(username);await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await expect(page.getByRole('button',{name:t('add'),exact:true})).toBeVisible();
}
async function register(page:Page,code:string) {
  await fieldNavigate(page,'sources');
  await page.getByRole('button',{name:t('add'),exact:true}).click();
  await page.getByLabel(t('state'),{exact:true}).fill('Jharkhand');
  for(const [key,value] of [['code',code],['name','Assigned pump'],['village','Village'],['district','Khunti'],['operator','OP']] as const)await page.getByLabel(t(key),{exact:true}).fill(value);
  await page.getByRole('button',{name:t('save'),exact:true}).click();await expect(page.getByRole('heading',{name:`${code} · Assigned pump`})).toBeVisible();
}
test('supervisor creates workers; assigned records sync across devices with access isolation',async({page,browser,request,baseURL},testInfo)=>{
  test.setTimeout(120000);
  const origin=new URL(baseURL!).origin;await administrator(request,origin);
  await login(page,'qa-supervisor');await fieldNavigate(page,'investigations');await page.getByRole('button',{name:'Manage team / टीम प्रबंधन'}).click();
  await expect(page.getByRole('heading',{name:'Manage team / टीम प्रबंधन',exact:true})).toBeFocused();
  await expect(page.getByRole('navigation',{name:t('primaryNavigation'),exact:true})).toBeHidden();
  const suffix=Date.now().toString();const usernames=[`alpha-${suffix}`,`beta-${suffix}`];
  for(const username of usernames){await page.getByLabel('Name',{exact:true}).fill(username);await page.getByLabel('Username',{exact:true}).fill(username);await page.getByLabel('Initial password',{exact:true}).fill(password);await page.getByRole('button',{name:'Create account',exact:true}).click();await expect(page.getByText('Account created. Share its credentials privately. / खाता बना। जानकारी निजी रूप से दें।',{exact:true})).toBeVisible();}
  await page.getByRole('button',{name:'Back to dashboard / डैशबोर्ड पर वापस'}).click();await register(page,`TEAM-${suffix}`);await page.getByRole('button',{name:'Sync now / अभी सिंक करें'}).click();await expect(page.getByText('Team records synchronized. / टीम रिकॉर्ड सिंक हैं।',{exact:true})).toBeVisible();
  await fieldNavigate(page,'investigations');await page.getByRole('button',{name:'Manage team / टीम प्रबंधन'}).click();await page.getByLabel('Source',{exact:true}).selectOption({label:`TEAM-${suffix} · Assigned pump — qa-supervisor`});
  await page.getByLabel('Assigned worker',{exact:true}).selectOption({label:usernames[0]});await page.getByRole('button',{name:'Save assignment',exact:true}).click();await expect(page.getByText('Assignment saved. Workers must sync to refresh access. / कार्य आवंटित। कर्मचारी सिंक करें।',{exact:true})).toBeVisible();
  const a=await browser.newContext({baseURL,timezoneId:'Asia/Kolkata'}),b=await browser.newContext({baseURL});
  try {
    const worker=await a.newPage(),other=await b.newPage();await login(worker,usernames[0]);await login(other,usernames[1]);
    await expect(worker.getByRole('heading',{name:`TEAM-${suffix} · Assigned pump`})).toBeVisible();await expect(other.getByRole('heading',{name:`TEAM-${suffix} · Assigned pump`})).toHaveCount(0);
    expect((await b.request.get(`${origin}/api/team/users`)).status()).toBe(403);
    expect((await b.request.get(`${origin}/api/team/overview`)).status()).toBe(403);
    await expect(worker.getByRole('heading',{name:t('myWork'),exact:true})).toBeVisible();
    await expect(other.getByRole('region',{name:t('taskTitle'),exact:true}).getByRole('button',{name:/Open task/})).toHaveCount(0);
    const records=await (await a.request.get(`${origin}/api/team/records`)).json();const hidden=await (await b.request.get(`${origin}/api/team/records`)).json();
    expect(records.data.sources[0]).toMatchObject({state:'Jharkhand',district:'Khunti'});
    expect((await b.request.post(`${origin}/api/team/sync`,{headers:{Origin:origin},data:{revision:hidden.revision,data:records.data}})).status()).toBe(403);
    await worker.evaluate(async()=>{await navigator.serviceWorker.ready;});await a.setOffline(true);
    await fieldNavigate(worker, t('measure'));
    for(const [key,value] of [['measuredAt','2026-01-01T01:30'],['calibrationDate','2026-01-01'],['reading1','600'],['reading2','900'],['instrument','Meter'],['operator','OP']] as const)await worker.getByLabel(t(key),{exact:true}).fill(value);
    await worker.getByRole('button',{name:t('review'),exact:true}).click();await worker.getByRole('button',{name:t('save'),exact:true}).click();await expect(worker.getByTestId('field-measurement')).toHaveCount(1);await worker.reload();await expect(worker.getByTestId('field-measurement')).toHaveCount(1);
    await expect(worker.getByTestId('pending-count')).toContainText(/^[1-9]\d* pending records/);
    await a.setOffline(false);await expect(worker.getByText('Team records synchronized. / टीम रिकॉर्ड सिंक हैं।',{exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Back to dashboard / डैशबोर्ड पर वापस'}).click();await page.getByRole('button',{name:'Sync now / अभी सिंक करें'}).click();await expect(page.getByText('Team records synchronized. / टीम रिकॉर्ड सिंक हैं।',{exact:true})).toBeVisible();
    const shared=await (await request.get('/api/team/records')).json();expect(shared.data.measurements.some((m:{sourceId:string})=>m.sourceId===records.data.sources[0].id)).toBe(true);
    // Supervisor sees only confirmed shared activity, requests a retest, and
    // the worker opens the linked retest directly from the task list.
    await fieldNavigate(page,'investigations');
    const overview=page.getByRole('region',{name:t('supervisorOverview'),exact:true});
    await expect(overview.getByText(usernames[0]+' · '+usernames[0],{exact:true})).toBeVisible();
    await expect(overview.getByText(t('activitySync'),{exact:false}).first()).toBeVisible();
    await testInfo.attach('supervisor-overview.png',{body:await page.screenshot({fullPage:true}),contentType:'image/png'});
    await page.getByLabel(t('select'),{exact:true}).selectOption(records.data.sources[0].id);
    await page.getByLabel(t('nextStatus'),{exact:true}).selectOption('RETEST_REQUESTED');
    await page.getByLabel(t('operator'),{exact:true}).fill('SUP');await page.getByLabel(t('explanation'),{exact:true}).fill('Please repeat with a clean probe');
    await page.getByRole('button',{name:t('update'),exact:true}).click();
    await page.getByRole('button',{name:'Sync now / अभी सिंक करें'}).click();await expect(page.getByText('Team records synchronized. / टीम रिकॉर्ड सिंक हैं।',{exact:true})).toBeVisible();
    await worker.getByRole('button',{name:'Sync now / अभी सिंक करें'}).click();await expect(worker.getByText('Team records synchronized. / टीम रिकॉर्ड सिंक हैं।',{exact:true})).toBeVisible();
    await fieldNavigate(worker,'sources');await testInfo.attach('worker-tasks.png',{body:await worker.screenshot({fullPage:true}),contentType:'image/png'});await worker.getByRole('region',{name:t('taskTitle'),exact:true}).getByRole('button',{name:/Open task.*Retest requested/}).click();
    await expect(worker.getByRole('heading',{name:t('retest'),exact:true})).toBeVisible();
    const retestAt=await worker.evaluate(()=>{const now=new Date(Math.ceil(Date.now()/1000)*1000);return new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,19);});
    for(const [key,value] of [['measuredAt',retestAt],['reading1','601'],['reading2','603'],['instrument','Meter'],['operator','OP']] as const)await worker.getByLabel(t(key),{exact:true}).fill(value);
    await worker.getByRole('button',{name:t('review'),exact:true}).click();await worker.getByRole('button',{name:t('save'),exact:true}).click();
    await expect(worker.getByText(t('saved'),{exact:true})).toBeVisible();
    // The previous sync status can still be visible while save finishes. Verify
    // this visit reached the server before pulling the supervisor's report.
    await expect.poll(async()=>{
      const latest=await (await a.request.get(`${origin}/api/team/records`)).json();
      return latest.data.measurements.filter((m:{sourceId:string})=>m.sourceId===records.data.sources[0].id).length;
    },{timeout:15000}).toBe(2);
    await expect(worker.getByTestId('pending-count')).toContainText(/^0 pending records/);
    await page.getByRole('button',{name:'Sync now / अभी सिंक करें'}).click();await expect(page.getByText('Team records synchronized. / टीम रिकॉर्ड सिंक हैं।',{exact:true})).toBeVisible();
    // Complete the supervisor review of the linked retest, then close without
    // confirmation: two visits do not establish the required stable baseline.
    const retestSnapshot=await (await request.get('/api/team/records')).json();
    const linked=retestSnapshot.data.measurements.find((m:{sourceId:string;investigationId?:string})=>m.sourceId===records.data.sources[0].id&&m.investigationId);
    expect(linked).toBeTruthy();
    await fieldNavigate(page,'investigations');await page.getByLabel(t('select'),{exact:true}).selectOption(records.data.sources[0].id);
    await page.getByLabel(t('nextStatus'),{exact:true}).selectOption('RETEST_COMPLETED');
    await page.getByLabel(t('linkedMeasurement'),{exact:true}).selectOption(linked.id);
    await page.getByLabel(t('finding'),{exact:true}).selectOption('UNDETERMINED');
    await page.getByLabel(t('operator'),{exact:true}).fill('SUP');await page.getByLabel(t('explanation'),{exact:true}).fill('Reviewed linked retest; baseline is insufficient for resolution');
    await page.getByRole('button',{name:t('update'),exact:true}).click();
    await expect(page.getByRole('heading',{name:t('RETEST_COMPLETED'),exact:true})).toBeVisible();
    await page.getByLabel(t('nextStatus'),{exact:true}).selectOption('CLOSED_UNCONFIRMED');
    await page.getByLabel(t('operator'),{exact:true}).fill('SUP');await page.getByLabel(t('explanation'),{exact:true}).fill('Close QA investigation without a safety conclusion');
    await page.getByRole('button',{name:t('update'),exact:true}).click();
    await expect(page.getByRole('heading',{name:t('CLOSED_UNCONFIRMED'),exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Sync now / अभी सिंक करें'}).click();
    await expect.poll(async()=>{const latest=await (await request.get('/api/team/records')).json();return latest.data.investigations.find((i:{id:string})=>i.id===linked.investigationId)?.state;}).toBe('CLOSED_UNCONFIRMED');
    await worker.getByRole('button',{name:'Sync now / अभी सिंक करें'}).click();
    await expect(worker.getByText('Team records synchronized. / टीम रिकॉर्ड सिंक हैं।',{exact:true})).toBeVisible();
    await fieldNavigate(worker,'sources');await expect(worker.getByRole('region',{name:t('taskTitle'),exact:true}).getByRole('button',{name:/Open task/})).toHaveCount(0);
    await fieldNavigate(page,'reports');await page.getByLabel(t('select'),{exact:true}).selectOption(records.data.sources[0].id);
    const csvDownload=page.waitForEvent('download');await page.getByRole('button',{name:t('csv'),exact:true}).click();
    expect(await readFile((await(await csvDownload).path())!,'utf8')).toContain('601');
    await fieldNavigate(page,'dataTools');const backupDownload=page.waitForEvent('download');await page.getByRole('button',{name:t('downloadBackup'),exact:true}).click();
    const backupBytes=await readFile((await(await backupDownload).path())!);const backup=JSON.parse(backupBytes.toString());
    expect(backup.data.measurements.filter((m:{sourceId:string})=>m.sourceId===records.data.sources[0].id)).toHaveLength(2);
    expect(backup.data.investigations.find((i:{id:string})=>i.id===linked.investigationId)?.state).toBe('CLOSED_UNCONFIRMED');
    const recovered=await browser.newContext({baseURL});try{
      const restore=await recovered.newPage();await restore.goto('/personal');await fieldNavigate(restore,'dataTools');
      await restore.getByLabel(t('backupFile'),{exact:true}).setInputFiles({name:'team-backup.json',mimeType:'application/json',buffer:backupBytes});
      await expect(restore.getByRole('heading',{name:t('restorePreview'),exact:true})).toBeVisible();await restore.getByRole('button',{name:t('confirmRestore'),exact:true}).click();
      await expect(restore.getByText(t('backupRestored'),{exact:true})).toBeVisible();await fieldNavigate(restore,'history');await restore.getByLabel(t('select'),{exact:true}).selectOption(records.data.sources[0].id);await expect(restore.getByTestId('field-measurement')).toHaveCount(2);
    }finally{await recovered.close();}
    await worker.getByRole('button',{name:'Sign out / लॉगआउट'}).click();await expect(worker.getByRole('button',{name:'Sign in',exact:true})).toBeVisible();await login(worker,usernames[1]);await expect(worker.getByTestId('field-measurement')).toHaveCount(0);
  }finally{await a.close().catch(()=>{});await b.close().catch(()=>{});}
});
test('cross-origin writes and anonymous reads are rejected',async({request,baseURL})=>{
  const origin=new URL(baseURL!).origin;
  expect((await request.get('/api/team/records')).status()).toBe(401);
  expect((await request.post('/api/team/login',{headers:{Origin:'https://untrusted.example'},data:{username:'qa-supervisor',password}})).status()).toBe(403);
  await administrator(request,origin);
  expect((await request.get('/api/team/records',{headers:{'X-Jalrakshak-Account':'another-account'}})).status()).toBe(401);
  expect((await request.post('/api/team/setup',{headers:{Origin:origin},data:{key:'wrong',username:'rogue',name:'Rogue',password}})).status()).toBe(403);
});
test('worker retains unsynced work when a supervisor reassigns its source',async({browser,request,baseURL})=>{
  const origin=new URL(baseURL!).origin;await administrator(request,origin);const suffix=Date.now().toString();
  const users=[];for(const name of ['first','second']){const r=await request.post('/api/team/users',{headers:{Origin:origin},data:{username:`${name}-${suffix}`,name,role:'worker',password}});users.push((await r.json()).user);}
  const context=await browser.newContext({baseURL});
  try {
    const page=await context.newPage();await login(page,users[0].username);await register(page,`CONFLICT-${suffix}`);await page.getByRole('button',{name:'Sync now / अभी सिंक करें'}).click();await expect(page.getByText('Team records synchronized. / टीम रिकॉर्ड सिंक हैं।',{exact:true})).toBeVisible();
    const snap=await (await context.request.get(`${origin}/api/team/records`)).json();
    await page.getByRole('button',{name:t('edit'),exact:true}).click();await page.getByLabel(t('name'),{exact:true}).fill('Pending local edit');await page.getByRole('button',{name:t('save'),exact:true}).click();await expect(page.getByRole('heading',{name:`CONFLICT-${suffix} · Pending local edit`})).toBeVisible();
    expect((await request.post('/api/team/assign',{headers:{Origin:origin},data:{sourceId:snap.data.sources[0].id,userId:users[1].id}})).ok()).toBe(true);
    await page.getByRole('button',{name:'Sync now / अभी सिंक करें'}).click();await expect(page.getByRole('button',{name:'Download pending backup',exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:`CONFLICT-${suffix} · Pending local edit`})).toBeVisible();
    const remote=await (await request.get('/api/team/records')).json();expect(remote.data.sources.find((s:{id:string})=>s.id===snap.data.sources[0].id).name).toBe('Assigned pump');
    await page.getByRole('button',{name:'Review sync conflict / सिंक विवाद की समीक्षा'}).click();
    await page.getByLabel('Decision: Source reassigned — retain pending work in recovery copy',{exact:true}).selectOption('remote');
    await page.getByRole('button',{name:'Apply reviewed changes / बदलाव लागू करें'}).click();
    await expect(page.getByText('Reviewed changes synchronized. Original device records remain in recovery copies.',{exact:true})).toBeVisible();
    await expect(page.getByRole('heading',{name:`CONFLICT-${suffix} · Pending local edit`})).toHaveCount(0);
    await page.getByText('Conflict recovery copies / विवाद पुनर्प्राप्ति प्रतियाँ',{exact:true}).click();
    const download=page.waitForEvent('download');await page.getByRole('button',{name:'Download latest recovery backup'}).click();
    const recovery=JSON.parse(await readFile((await (await download).path())!,'utf8'));
    expect(recovery.format).toBe('jalrakshak-field-backup');expect(recovery.data.sources[0].name).toBe('Pending local edit');
  }finally{await context.close();}
});

test('automatic upload reports pending work and overlapping edits can be resolved without re-entry',async({browser,request,baseURL})=>{
  const origin=new URL(baseURL!).origin;await administrator(request,origin);const suffix=Date.now().toString();
  const created=await request.post('/api/team/users',{headers:{Origin:origin},data:{username:`auto-${suffix}`,name:'Automatic worker',role:'worker',password}});const user=(await created.json()).user;
  const context=await browser.newContext({baseURL});
  try{
    const page=await context.newPage();await login(page,user.username);await register(page,`AUTO-${suffix}`);
    await expect(page.getByTestId('pending-count')).toContainText('1 pending records');
    await expect(page.getByText('Team records synchronized. / टीम रिकॉर्ड सिंक हैं।',{exact:true})).toBeVisible({timeout:15000});
    await expect(page.getByTestId('pending-count')).toContainText('0 pending records');
    const snap=await(await context.request.get(`${origin}/api/team/records`)).json();const source=snap.data.sources[0];
    await context.setOffline(true);await page.getByRole('button',{name:t('edit'),exact:true}).click();await page.getByLabel(t('name'),{exact:true}).fill('Worker choice');await page.getByRole('button',{name:t('save'),exact:true}).click();
    const shared=await(await request.get('/api/team/records')).json();shared.data.sources.find((s:{id:string})=>s.id===source.id).name='Supervisor choice';
    expect((await request.post('/api/team/sync',{headers:{Origin:origin},data:{revision:shared.revision,data:shared.data}})).ok()).toBe(true);
    await context.setOffline(false);await expect(page.getByRole('button',{name:'Review sync conflict / सिंक विवाद की समीक्षा'})).toBeVisible({timeout:15000});
    await page.getByRole('button',{name:'Review sync conflict / सिंक विवाद की समीक्षा'}).click();
    await page.getByLabel(`Decision: AUTO-${suffix} · name`,{exact:true}).selectOption('local');await page.getByRole('button',{name:'Apply reviewed changes / बदलाव लागू करें'}).click();
    await expect(page.getByText('Reviewed changes synchronized. Original device records remain in recovery copies.',{exact:true})).toBeVisible();
    const final=await(await request.get('/api/team/records')).json();expect(final.data.sources.find((s:{id:string})=>s.id===source.id).name).toBe('Worker choice');
  }finally{await context.close();}
});
