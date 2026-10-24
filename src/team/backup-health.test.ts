import { afterEach,expect,it } from 'vitest';
import { mkdtempSync,writeFileSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { backupHealth } from './backup-health';
const folders:string[]=[];
const now=Date.parse('2026-10-24T12:00:00Z');
function fixture(){const dir=mkdtempSync(join(tmpdir(),'jr-health-'));folders.push(dir);const saved={at:new Date(now).toISOString(),file:'team-2026-10-24T12-00-00-000Z-1.sqlite',bytes:4,records:2,integrity:'ok',retention:30};writeFileSync(join(dir,saved.file),'copy');writeFileSync(join(dir,'status.json'),JSON.stringify(saved));return {dir,saved};}
afterEach(()=>{for(const dir of folders.splice(0))rmSync(dir,{recursive:true,force:true});});
it('reports a recent verified file without leaking its path',()=>{const {dir}=fixture();const health=backupHealth(dir,now);expect(health.status).toBe('healthy');expect(JSON.stringify(health)).not.toContain(dir);expect(JSON.stringify(health)).not.toContain('.sqlite');});
it('flags backups older than 26 hours and missing metadata',()=>{const {dir}=fixture();expect(backupHealth(dir,now+27*3600000).status).toBe('overdue');rmSync(join(dir,'status.json'));expect(backupHealth(dir,now).status).toBe('missing');});
it('detects missing and truncated copies',()=>{const {dir,saved}=fixture();writeFileSync(join(dir,saved.file),'x');expect(backupHealth(dir,now).status).toBe('failed');rmSync(join(dir,saved.file));expect(backupHealth(dir,now).status).toBe('failed');});
it('preserves last success but reports a newer failure, then recovers after success',()=>{const {dir}=fixture();writeFileSync(join(dir,'failure.json'),JSON.stringify({at:new Date(now+1000).toISOString()}));expect(backupHealth(dir,now+1000)).toMatchObject({status:'failed',lastBackup:{records:2}});writeFileSync(join(dir,'failure.json'),JSON.stringify({at:new Date(now-1000).toISOString()}));expect(backupHealth(dir,now).status).toBe('healthy');});
it('treats corrupt or unsafe metadata as unknown instead of healthy',()=>{const {dir,saved}=fixture();writeFileSync(join(dir,'status.json'),JSON.stringify({...saved,file:'../secret.sqlite'}));expect(backupHealth(dir,now).status).toBe('unavailable');writeFileSync(join(dir,'status.json'),'{');expect(backupHealth(dir,now).status).toBe('unavailable');});
