import { expect, it } from 'vitest';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { TeamStore } from './server';
it('creates a consistent restorable database backup including accounts and records',()=>{
  const directory=mkdtempSync(join(tmpdir(),'jalrakshak-team-backup-'));const path=join(directory,'team.sqlite');const store=new TeamStore(path);
  try {
    const admin=store.createUser(null,'supervisor','Supervisor','private-test-password','supervisor');
    const result=spawnSync(process.execPath,[resolve('scripts/backup-team.mjs')],{cwd:directory,env:{...process.env,JALRAKSHAK_TEAM_DB:path},encoding:'utf8'});
    expect(result.status,result.stderr).toBe(0);const backupDirectory=join(directory,'private-data','backups');const copy=new TeamStore(join(backupDirectory,readdirSync(backupDirectory).find(f=>f.endsWith('.sqlite'))!));
    try {expect(copy.login('supervisor','private-test-password').user).toEqual(admin);expect(copy.sql.prepare('PRAGMA integrity_check').get()!.integrity_check).toBe('ok');} finally {copy.sql.close();}
  }finally{store.sql.close();rmSync(directory,{recursive:true,force:true});}
});
