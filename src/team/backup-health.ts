import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

export interface BackupHealth {
  status: 'healthy' | 'overdue' | 'failed' | 'missing' | 'unavailable';
  checkedAt: string;
  lastBackup: { at:string; records:number; bytes:number; integrity:string; retention:number } | null;
  lastFailure: string | null;
  storage: 'server';
}
/** Metadata never exposes private paths or account data. A missing copy is not healthy. */
export function backupHealth(directory=process.env.JALRAKSHAK_BACKUP_DIR??join(process.cwd(),'private-data','backups'), now=Date.now()):BackupHealth {
  const result:BackupHealth={status:'missing',checkedAt:new Date(now).toISOString(),lastBackup:null,lastFailure:null,storage:'server'};
  try {
    const failure=join(directory,'failure.json');
    if(existsSync(failure)){
      const saved=JSON.parse(readFileSync(failure,'utf8'));
      if(!Number.isFinite(Date.parse(saved.at)))throw new Error('Invalid failure metadata');
      result.lastFailure=saved.at;
    }
    const metadata=join(directory,'status.json');
    if(existsSync(metadata)){
      const saved=JSON.parse(readFileSync(metadata,'utf8'));
      if(!/^team-\d{4}-\d{2}-\d{2}T[\d-]+Z-\d+\.sqlite$/.test(saved.file)||!Number.isFinite(Date.parse(saved.at))||Date.parse(saved.at)>now+60_000||saved.integrity!=='ok'||!Number.isInteger(saved.records)||saved.records<0||!Number.isSafeInteger(saved.bytes)||saved.bytes<=0)throw new Error('Invalid backup metadata');
      const file=join(directory,saved.file);
      if(!existsSync(file)||!statSync(file).isFile()||statSync(file).size!==saved.bytes){result.status='failed';return result;}
      result.lastBackup={at:saved.at,records:saved.records,bytes:saved.bytes,integrity:saved.integrity,retention:saved.retention};
      result.status=now-Date.parse(saved.at)>26*60*60*1000?'overdue':'healthy';
    }
    if(result.lastFailure&&(!result.lastBackup||result.lastFailure>=result.lastBackup.at))result.status='failed';
  } catch {result.status='unavailable';}
  return result;
}
