import { useEffect, useState } from 'react';
import { api } from '@/team/client';
import type { BackupHealth as Health } from '@/team/backup-health';

export function BackupHealth(){
  const [health,setHealth]=useState<Health>(),[busy,setBusy]=useState(false),[failed,setFailed]=useState(false);
  useEffect(()=>{let active=true;api<Health>('backups').then(value=>{if(active)setHealth(value);}).catch(()=>{if(active)setFailed(true);});return()=>{active=false;};},[]);
  async function refresh(){setBusy(true);setFailed(false);try{setHealth(await api<Health>('backups'));}catch{setFailed(true);}finally{setBusy(false);}}
  const labels={healthy:'Verified backup is recent / सत्यापित बैकअप हाल का है',overdue:'Backup overdue (more than 26 hours) / बैकअप में देरी',failed:'Backup failed or copy is missing / बैकअप विफल या प्रति गायब',missing:'No verified backup recorded / सत्यापित बैकअप नहीं मिला',unavailable:'Backup status cannot be verified / बैकअप स्थिति सत्यापित नहीं हो सकी'};
  return <section className="field-card no-print" aria-label="Backup health / बैकअप स्थिति"><h2>Backup health / बैकअप स्थिति</h2>
    {failed?<p role="alert">Cannot check server backups. Connect and refresh. / सर्वर से जुड़कर फिर जाँचें।</p>:health?<><p role={health.status==='healthy'?'status':'alert'} className={health.status==='healthy'?undefined:'field-error'}><strong>{labels[health.status]}</strong></p><p>Checked / जाँच: {new Date(health.checkedAt).toLocaleString()}</p>
      {health.lastBackup&&<><p>Last verified backup / अंतिम सत्यापित बैकअप: {new Date(health.lastBackup.at).toLocaleString()}</p><p>{health.lastBackup.records} records / रिकॉर्ड · {Math.ceil(health.lastBackup.bytes/1024)} KB</p><p>SQLite integrity and readable tables verified at backup time. This is not a full application restore drill. / बैकअप बनाते समय डेटाबेस जाँचा गया; पूरा ऐप बहाल करने का परीक्षण नहीं है।</p></>}
      {health.lastFailure&&<p>Last failed attempt / अंतिम विफल प्रयास: {new Date(health.lastFailure).toLocaleString()}</p>}</>:<p role="status">Checking backups… / बैकअप जाँच रहे हैं…</p>}
    <p>Storage: server backup folder. Separate/off-device copy: not verified. / संग्रह: सर्वर बैकअप फ़ोल्डर। दूसरे उपकरण की प्रति सत्यापित नहीं है।</p>
    <p>Only synced records are included. Keep a copy on separate storage; device failure can also destroy local backups. / केवल सिंक रिकॉर्ड शामिल हैं। अलग उपकरण पर भी प्रति रखें।</p>
    <details><summary>Recovery and overdue backups / पुनर्प्राप्ति और देर से बैकअप</summary><p>Ask the server operator to check the daily backup job and available disk space, then run <code>npm run backup:team</code>. For recovery, follow <code>docs/deployment/team-local.md</code> and test a copy before replacing the live database.</p></details>
    <button type="button" disabled={busy} onClick={()=>void refresh()}>Refresh backup health / बैकअप स्थिति जाँचें</button>
  </section>;
}
