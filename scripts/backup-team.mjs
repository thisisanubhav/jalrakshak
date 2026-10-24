import { DatabaseSync, backup } from 'node:sqlite';
import { mkdirSync, existsSync, chmodSync, readdirSync, unlinkSync, writeFileSync, renameSync, statSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import console from 'node:console';
const source = process.env.JALRAKSHAK_TEAM_DB ?? join(process.cwd(), 'private-data', 'team.sqlite');
if (!existsSync(source)) throw new Error('No team database exists yet. Complete supervisor setup first.');
const directory = process.env.JALRAKSHAK_BACKUP_DIR ?? join(process.cwd(), 'private-data', 'backups');
mkdirSync(directory, { recursive: true, mode: 0o700 });chmodSync(directory,0o700);
const name=`team-${new Date().toISOString().replace(/[:.]/g, '-')}-${process.pid}.sqlite`;
const target=join(directory,name), temporary=`${target}.partial`;
const database = new DatabaseSync(source, { readOnly: true });
try {
  await backup(database, temporary);chmodSync(temporary,0o600);
  const verify=new DatabaseSync(temporary);
  verify.exec('PRAGMA journal_mode=DELETE');
  let records;
  try {
    if(verify.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw new Error('Backup integrity check failed.');
    records=Number(verify.prepare('SELECT COUNT(*) AS n FROM records').get().n);
    verify.prepare('SELECT COUNT(*) FROM users').get();verify.prepare('SELECT COUNT(*) FROM assignments').get();
  }finally{verify.close();}
  renameSync(temporary,target);
  // Keep the newest 30 verified copies. Never delete arbitrary database files.
  const copies=readdirSync(directory).filter(f=>/^team-\d{4}-\d{2}-\d{2}T[\d-]+Z-\d+\.sqlite$/.test(f)).sort().reverse();
  for(const old of copies.slice(30))unlinkSync(join(directory,old));
  const status={at:new Date().toISOString(),file:name,bytes:statSync(target).size,records,integrity:'ok',retention:30};
  const statusTemp=join(directory,`status-${process.pid}.tmp`);
  writeFileSync(statusTemp,JSON.stringify(status,null,2),{mode:0o600});renameSync(statusTemp,join(directory,'status.json'));
  console.log(`Verified team backup: ${target} (${records} records). Latest 30 scheduled copies retained.`);
  console.log('Contains private accounts and records. Keep another copy on separate storage.');
} finally { database.close();for(const file of [temporary,`${temporary}-wal`,`${temporary}-shm`])if(existsSync(file))unlinkSync(file); }
