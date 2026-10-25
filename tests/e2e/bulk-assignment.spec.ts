import { fieldNavigate } from './field-navigation';
import { test,expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
test('supervisor assigns filtered source batches and rejects stale changes atomically',async({page,request,browser,baseURL})=>{
  const origin=new URL(baseURL!).origin,headers={Origin:origin},password='test-only-private-password';
  const session=await(await request.get('/api/team/session')).json();
  if(session.setupRequired)expect((await request.post('/api/team/setup',{headers,data:{key:'release-tests-only-setup-key',username:'qa-supervisor',name:'QA supervisor',password}})).ok()).toBe(true);
  expect((await request.post('/api/team/login',{headers,data:{username:'qa-supervisor',password}})).ok()).toBe(true);
  const prefix='batch-'+Date.now();
  async function worker(suffix:string){const response=await request.post('/api/team/users',{headers,data:{username:prefix+suffix,name:prefix+suffix,role:'worker',password}});expect(response.ok()).toBe(true);return (await response.json()).user;}
  const a=await worker('-a'),b=await worker('-b'),at=new Date().toISOString();
  const snapshot=await(await request.get('/api/team/records')).json();
  const sources=[1,2,3].map(n=>({id:crypto.randomUUID(),code:prefix+'-'+n,name:'Batch pump '+n,scope:'MANUAL_FIELD',village:n===3?'Other':'Batch village',district:'D',category:'WELL',location:'',operator:'OP',createdAt:at,updatedAt:at}));
  expect((await request.post('/api/team/sync',{headers,data:{revision:snapshot.revision,data:{...snapshot.data,sources:[...snapshot.data.sources,...sources]}}})).ok()).toBe(true);
  await page.goto('/');await page.getByLabel('Username',{exact:true}).fill('qa-supervisor');await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await fieldNavigate(page,'investigations');await page.getByRole('button',{name:'Manage team / टीम प्रबंधन',exact:true}).click();
  const panel=page.getByRole('region',{name:'Bulk assignments / सामूहिक आवंटन',exact:true});
  await panel.getByLabel('Bulk source search',{exact:true}).fill(prefix);await panel.getByLabel('Bulk village',{exact:true}).selectOption('Batch village');await panel.getByRole('button',{name:'Select shown / दिख रहे स्रोत चुनें',exact:true}).click();await expect(panel).toContainText('2 selected');
  await panel.getByLabel('Bulk assigned worker',{exact:true}).selectOption(a.id);await panel.getByRole('button',{name:'Review assignments / आवंटन समीक्षा',exact:true}).click();await expect(panel.getByRole('region',{name:'Assignment preview',exact:true})).toContainText(a.username);
  await panel.getByRole('button',{name:'Cancel / रद्द करें',exact:true}).click();await expect(panel.getByRole('region',{name:'Assignment preview',exact:true})).toHaveCount(0);
  await panel.getByRole('button',{name:'Review assignments / आवंटन समीक्षा',exact:true}).click();await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await mkdir('test-results/acceptance',{recursive:true});await panel.screenshot({path:'test-results/acceptance/bulk-assignment-mobile.png'});
  await panel.getByRole('button',{name:'Confirm assignments / आवंटन की पुष्टि करें',exact:true}).click();await expect(page.getByText('Assignments saved. Workers should sync. / आवंटन सहेजे गए। कर्मचारी सिंक करें।',{exact:true})).toBeVisible();
  const after=await(await request.get('/api/team/records')).json();expect(after.assignments[sources[0].id]).toBe(a.id);expect(after.assignments[sources[1].id]).toBe(a.id);expect(after.assignments[sources[2].id]).not.toBe(a.id);
  const workerContext=await browser.newContext({baseURL});try{await workerContext.request.post('/api/team/login',{headers,data:{username:a.username,password}});expect((await(await workerContext.request.get('/api/team/records')).json()).data.sources).toHaveLength(2);expect((await workerContext.request.post('/api/team/assign-bulk',{headers,data:{sourceIds:[sources[0].id],userId:b.id,expectedAssignments:after.assignments}})).status()).toBe(403);}finally{await workerContext.close();}
  await panel.getByLabel('Bulk source search',{exact:true}).fill(prefix);await panel.getByLabel('Bulk village',{exact:true}).selectOption('Batch village');await panel.getByRole('button',{name:'Select shown / दिख रहे स्रोत चुनें',exact:true}).click();await panel.getByLabel('Bulk assigned worker',{exact:true}).selectOption(b.id);await panel.getByRole('button',{name:'Review assignments / आवंटन समीक्षा',exact:true}).click();
  expect((await request.post('/api/team/assign',{headers,data:{sourceId:sources[1].id,userId:b.id}})).ok()).toBe(true);
  await panel.getByRole('button',{name:'Confirm assignments / आवंटन की पुष्टि करें',exact:true}).click();await expect(panel.getByRole('alert')).toContainText('Assignments changed');const final=await(await request.get('/api/team/records')).json();expect(final.assignments[sources[0].id]).toBe(a.id);expect(final.assignments[sources[1].id]).toBe(b.id);
});
