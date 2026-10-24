import { expect, it } from 'vitest';
import { mkdtempSync, readdirSync, rmSync, readFileSync, statSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { TeamStore } from './server';
import { compareField, defaultRule, type FieldSource, type MeasurementInput } from '@/field/model';
import { evaluateECRepeatability } from '@/ec/measurement-quality';
it('creates a consistent restorable database backup including accounts and records',()=>{
  const directory=mkdtempSync(join(tmpdir(),'jalrakshak-team-backup-'));const path=join(directory,'team.sqlite');const store=new TeamStore(path);
  try {
    const admin=store.createUser(null,'supervisor','Supervisor','private-test-password','supervisor');
    const worker=store.createUser(admin,'worker','Worker','private-test-password','worker');
    const at='2026-01-01T12:00:00.000Z';
    const source:FieldSource={id:'backup-source',code:'BACKUP-1',name:'Recovery pump',scope:'MANUAL_FIELD',village:'Village',district:'Khunti',location:'',category:'HANDPUMP',operator:'OP',createdAt:at,updatedAt:at,schedule:{id:'plan',date:'2026-01-01',note:'Inspect apron',createdAt:at},visitReviews:[{id:'review',measurementId:'visit',state:'REVIEWED',at,note:'Checked evidence',reviewerId:admin.id,reviewerName:admin.name}]};
    const input:MeasurementInput={id:'visit',sourceId:source.id,scope:'MANUAL_FIELD',measuredAt:at,readings:[600,602],instrument:'Meter',device:'',probe:'',method:'DIRECT_SOURCE',operator:'OP',notes:'Apron checked',calibrationDate:'',calibrationReference:'',scheduleId:'plan',photos:[{id:'photo',caption:'Apron',data:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='}]};
    store.sync(admin,store.snapshot(admin).revision,{sources:[source],measurements:[{...input,createdAt:at,quality:evaluateECRepeatability(input.readings),comparison:compareField(input,[],defaultRule),rule:defaultRule}],investigations:[]});
    store.assign(admin,source.id,worker.id);
    const expected=store.snapshot(worker).data;
    const result=spawnSync(process.execPath,[resolve('scripts/backup-team.mjs')],{cwd:directory,env:{...process.env,JALRAKSHAK_TEAM_DB:path},encoding:'utf8'});
    expect(result.status,result.stderr).toBe(0);const status=JSON.parse(readFileSync(join(directory,'private-data','backups','status.json'),'utf8'));expect(status.integrity).toBe('ok');expect(statSync(join(directory,'private-data','backups',status.file)).mode & 0o777).toBe(0o600);const backupDirectory=join(directory,'private-data','backups');const copy=new TeamStore(join(backupDirectory,readdirSync(backupDirectory).find(f=>f.endsWith('.sqlite'))!));
    try {expect(copy.login('supervisor','private-test-password').user).toEqual(admin);expect(copy.login('worker','private-test-password').user).toEqual(worker);expect(copy.snapshot(worker).data).toEqual(expected);expect(copy.snapshot(admin).data).toEqual(store.snapshot(admin).data);expect(copy.sql.prepare('PRAGMA integrity_check').get()!.integrity_check).toBe('ok');} finally {copy.sql.close();}
  }finally{store.sql.close();rmSync(directory,{recursive:true,force:true});}
});

it('prunes only scheduled copies after success and preserves prior backups on failure',()=>{
  const directory=mkdtempSync(join(tmpdir(),'jalrakshak-retention-'));const path=join(directory,'team.sqlite');const store=new TeamStore(path);store.sql.close();
  const backupDirectory=join(directory,'private-data','backups');mkdirSync(backupDirectory,{recursive:true});
  try {
    for(let i=1;i<=31;i++)writeFileSync(join(backupDirectory,`team-2020-01-${String(i).padStart(2,'0')}T00-00-00-000Z-1.sqlite`),'old-copy');
    writeFileSync(join(backupDirectory,'manual-important.sqlite'),'keep');
    const run=()=>spawnSync(process.execPath,[resolve('scripts/backup-team.mjs')],{cwd:directory,env:{...process.env,JALRAKSHAK_TEAM_DB:path},encoding:'utf8'});
    const result=run();expect(result.status,result.stderr).toBe(0);expect(readdirSync(backupDirectory).filter(f=>f.startsWith('team-')&&f.endsWith('.sqlite')),result.stdout+' '+readdirSync(backupDirectory).join(',')).toHaveLength(30);expect(readdirSync(backupDirectory).some(f=>f.includes('.partial'))).toBe(false);expect(existsSync(join(backupDirectory,'manual-important.sqlite'))).toBe(true);
    const previous=readFileSync(join(backupDirectory,'status.json'),'utf8');writeFileSync(path,'invalid database');expect(run().status).not.toBe(0);expect(readFileSync(join(backupDirectory,'status.json'),'utf8')).toBe(previous);expect(readdirSync(backupDirectory).filter(f=>f.startsWith('team-')&&f.endsWith('.sqlite'))).toHaveLength(30);
  }finally{rmSync(directory,{recursive:true,force:true});}
});
