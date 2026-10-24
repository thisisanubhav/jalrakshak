import { expect, it } from 'vitest';
import { mkdtempSync, readdirSync, rmSync, readFileSync, statSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { TeamStore } from './server';
it('creates a consistent restorable database backup including accounts and records',()=>{
  const directory=mkdtempSync(join(tmpdir(),'jalrakshak-team-backup-'));const path=join(directory,'team.sqlite');const store=new TeamStore(path);
  try {
    const admin=store.createUser(null,'supervisor','Supervisor','private-test-password','supervisor');
    const result=spawnSync(process.execPath,[resolve('scripts/backup-team.mjs')],{cwd:directory,env:{...process.env,JALRAKSHAK_TEAM_DB:path},encoding:'utf8'});
    expect(result.status,result.stderr).toBe(0);const status=JSON.parse(readFileSync(join(directory,'private-data','backups','status.json'),'utf8'));expect(status.integrity).toBe('ok');expect(statSync(join(directory,'private-data','backups',status.file)).mode & 0o777).toBe(0o600);const backupDirectory=join(directory,'private-data','backups');const copy=new TeamStore(join(backupDirectory,readdirSync(backupDirectory).find(f=>f.endsWith('.sqlite'))!));
    try {expect(copy.login('supervisor','private-test-password').user).toEqual(admin);expect(copy.sql.prepare('PRAGMA integrity_check').get()!.integrity_check).toBe('ok');} finally {copy.sql.close();}
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
