import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Pool } from 'pg';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { PostgresTeamStore } from './postgres';
import { SyncUploads } from './uploads';
import { compareField, defaultRule, type FieldData, type FieldSource, type MeasurementInput } from '@/field/model';
import { evaluateECRepeatability } from '@/ec/measurement-quality';
const url=process.env.JALRAKSHAK_TEST_POSTGRES;
const suite=url?describe:describe.skip;
const password='private-test-password';
const source:FieldSource={id:'source',code:'S1',name:'Pump',scope:'MANUAL_FIELD',village:'Village',district:'Khunti',location:'',category:'HANDPUMP',operator:'OP',createdAt:'2026-01-01T00:00:00.000Z',updatedAt:'2026-01-01T00:00:00.000Z'};
function evidence():FieldData {
 const input:MeasurementInput={id:'visit',sourceId:source.id,scope:'MANUAL_FIELD',measuredAt:'2026-01-02T00:00:00.000Z',readings:[600,602],instrument:'Meter',device:'',probe:'',method:'DIRECT_SOURCE',operator:'OP',notes:'',calibrationDate:'',calibrationReference:''};
 return {sources:[{...source}],measurements:[{...input,createdAt:input.measuredAt,quality:evaluateECRepeatability(input.readings),comparison:compareField(input,[],defaultRule),rule:defaultRule}],investigations:[]};
}
suite('PostgreSQL team contract',()=>{
 let control:Pool,pool:Pool,store:PostgresTeamStore,schema:string;
 beforeEach(async()=>{
  if(!url||!['localhost','127.0.0.1'].includes(new URL(url).hostname))throw new Error('Tests require an isolated localhost database.');
  schema=`test_${randomUUID().replaceAll('-','')}`;
  control=new Pool({connectionString:url});await control.query(`CREATE SCHEMA ${schema}`);
  pool=new Pool({connectionString:url,options:`-c search_path=${schema}`});
  for(const name of ['001-team.sql','002-sync-uploads.sql'])await pool.query(readFileSync(`deploy/postgres/${name}`,'utf8'));
  store=new PostgresTeamStore(pool);
 });
 afterEach(async()=>{await pool?.end();if(control){await control.query(`DROP SCHEMA ${schema} CASCADE`);await control.end();}});
 async function team(){const admin=await store.createUser(null,'supervisor','Supervisor',password,'supervisor');const a=await store.createUser(admin,'worker-a','Worker A',password,'worker');const b=await store.createUser(admin,'worker-b','Worker B',password,'worker');return {admin,a,b};}
 it('persists accounts and revokes sessions across independent store instances',async()=>{
  const {admin,a}=await team();const other=new PostgresTeamStore(pool);const login=await store.login(a.username,password);
  expect(await other.session(login.token)).toEqual(a);
  expect((await pool.query('SELECT password FROM users WHERE id=$1',[a.id])).rows[0].password).not.toContain(password);
  await other.resetPassword(admin,a.id,'replacement-password');await expect(store.session(login.token)).rejects.toThrow('Sign in');
 });
 it('serializes simultaneous initial setup and persists failed login counters',async()=>{
  const outcomes=await Promise.allSettled([store.createUser(null,'first','First',password,'supervisor'),new PostgresTeamStore(pool).createUser(null,'second','Second',password,'supervisor')]);
  expect(outcomes.filter(r=>r.status==='fulfilled')).toHaveLength(1);
  for(let i=0;i<10;i++)await expect(store.login('missing','wrong')).rejects.toThrow('incorrect');
  await expect(new PostgresTeamStore(pool).login('missing','wrong')).rejects.toThrow('Too many');
 });
 it('isolates workers and rolls back forbidden evidence edits',async()=>{
  const {admin,a,b}=await team();await store.sync(a,(await store.snapshot(a)).revision,evidence());
  expect((await store.snapshot(b)).data.sources).toHaveLength(0);
  const snap=await store.snapshot(a);snap.data.measurements[0].notes='changed';await expect(store.sync(a,snap.revision,snap.data)).rejects.toThrow('immutable');
  const forged=await store.snapshot(a);forged.data.sources[0].visitReviews=[{id:'r',measurementId:'visit',state:'REVIEWED',at:'2026-01-03T00:00:00.000Z',note:'Forged',reviewerId:a.id,reviewerName:a.name}];
  await expect(store.sync(a,forged.revision,forged.data)).rejects.toThrow('Only supervisors');
  expect((await store.snapshot(admin)).data.measurements[0].notes).toBe('');
  await store.assign(admin,source.id,b.id);expect((await store.snapshot(a)).data.sources).toHaveLength(0);
  await expect(store.sync(a,(await store.snapshot(a)).revision,evidence())).rejects.toThrow('not assigned');
 });
 it('rejects stale concurrent saves and accepts an identical lost-response retry',async()=>{
  const {a}=await team();const base=await store.snapshot(a);const first=await store.sync(a,base.revision,evidence());
  expect(await store.sync(a,base.revision,evidence())).toEqual(first);
  const x=structuredClone(first.data),y=structuredClone(first.data);x.sources[0].name='X';y.sources[0].name='Y';
  const results=await Promise.allSettled([store.sync(a,first.revision,x),new PostgresTeamStore(pool).sync(a,first.revision,y)]);
  expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
  expect(results.filter(r=>r.status==='rejected')).toHaveLength(1);
 });
 it('preserves review attribution and makes bulk assignments atomic',async()=>{
  const {admin,a,b}=await team();await store.sync(a,(await store.snapshot(a)).revision,evidence());
  const snap=await store.snapshot(admin);snap.data.sources[0].visitReviews=[{id:'r',measurementId:'visit',state:'REVIEWED',at:'2026-01-03T00:00:00.000Z',note:'Checked',reviewerId:admin.id,reviewerName:admin.name}];await store.sync(admin,snap.revision,snap.data);
  await expect(store.assignMany(admin,[source.id,'missing'],b.id,{[source.id]:a.id})).rejects.toThrow('no longer exists');
  expect((await store.snapshot(admin)).assignments[source.id]).toBe(a.id);
  const overview=await store.overview(admin);expect(overview.activity[0].actorName).toBe(admin.name);expect(JSON.stringify(overview)).not.toContain('password');
  await expect(store.overview(a)).rejects.toThrow('Supervisor');
  const login=await store.login(a.username,password);await store.setActive(admin,a.id,false);await expect(store.session(login.token)).rejects.toThrow('Sign in');
 });
 it('binds staged chunks to account and session and never applies incomplete data',async()=>{
  const {a,b}=await team(),uploads=new SyncUploads(pool);const upload=await uploads.start(a,'session-a',2);
  await uploads.part(a,'session-a',upload.id,0,'{"revision":"x",');
  await expect(uploads.read(a,'session-a',upload.id)).rejects.toThrow('incomplete');
  await expect(uploads.part(b,'session-b',upload.id,1,'"data":{}}')).rejects.toThrow('expired or changed');
  await expect(uploads.read(a,'another-session',upload.id)).rejects.toThrow('expired or changed');
  await uploads.part(a,'session-a',upload.id,1,'"data":{}}');
  await uploads.part(a,'session-a',upload.id,1,'"data":{}}');
  expect(await uploads.read(a,'session-a',upload.id)).toEqual({revision:'x',data:{}});
  expect((await store.snapshot(a)).data.sources).toHaveLength(0);
  await uploads.remove(a,'session-a',upload.id);await expect(uploads.read(a,'session-a',upload.id)).rejects.toThrow('expired or changed');
 });
});
