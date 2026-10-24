import { mkdirSync, writeFileSync, existsSync, realpathSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import process from 'node:process';
import console from 'node:console';
if(process.platform!=='darwin')throw new Error('This installer supports macOS launchd. Run backup:team from your system scheduler on other hosts.');
const root=resolve(import.meta.dirname,'..');
const label='local.jalrakshak.backup';
const nodePath=['/opt/homebrew/bin/node','/usr/local/bin/node'].find(p=>existsSync(p)&&realpathSync(p)===realpathSync(process.execPath))??process.execPath;
const directory=join(homedir(),'Library','LaunchAgents');
const plist=join(directory,`${label}.plist`);
const logs=join(root,'private-data','backup-logs');
mkdirSync(logs,{recursive:true,mode:0o700});mkdirSync(directory,{recursive:true});
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const environment=Object.entries({JALRAKSHAK_TEAM_DB:process.env.JALRAKSHAK_TEAM_DB??join(root,'private-data','team.sqlite'),JALRAKSHAK_BACKUP_DIR:process.env.JALRAKSHAK_BACKUP_DIR??join(root,'private-data','backups')}).map(([k,v])=>`<key>${k}</key><string>${escape(resolve(v))}</string>`).join('');
writeFileSync(plist,`<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict>
<key>Label</key><string>${label}</string>
<key>ProgramArguments</key><array><string>${escape(nodePath)}</string><string>${escape(join(root,'scripts','backup-team.mjs'))}</string></array>
<key>WorkingDirectory</key><string>${escape(root)}</string>
<key>EnvironmentVariables</key><dict>${environment}</dict>
<key>RunAtLoad</key><true/>
<key>StartCalendarInterval</key><dict><key>Hour</key><integer>18</integer><key>Minute</key><integer>0</integer></dict>
<key>StandardOutPath</key><string>${escape(join(logs,'backup.log'))}</string>
<key>StandardErrorPath</key><string>${escape(join(logs,'error.log'))}</string>
</dict></plist>`,{mode:0o600});
const domain=`gui/${process.getuid()}`;
spawnSync('launchctl',['bootout',`${domain}/${label}`],{encoding:'utf8'});
const result=spawnSync('launchctl',['bootstrap',domain,plist],{encoding:'utf8'});
if(result.status!==0)throw new Error(`Could not enable schedule: ${result.stderr}`);
console.log('Enabled: verified backup at 18:00 local time daily and whenever this login agent loads.');
console.log(`Schedule: ${plist}`);
console.log(`Inspect: launchctl print ${domain}/${label}`);
