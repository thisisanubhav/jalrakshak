
import { UiText, pickLanguage, useUiLanguage } from '@/components/UiLanguage';
import { useEffect, useState } from 'react';
import { api } from '@/team/client';
import type { BackupHealth as Health } from '@/team/backup-health';

export function BackupHealth(){
  const {locale:uiLocale}=useUiLanguage();
  const [health,setHealth]=useState<Health>(),[busy,setBusy]=useState(false),[failed,setFailed]=useState(false);
  useEffect(()=>{let active=true;api<Health>('backups').then(value=>{if(active)setHealth(value);}).catch(()=>{if(active)setFailed(true);});return()=>{active=false;};},[]);
  async function refresh(){setBusy(true);setFailed(false);try{setHealth(await api<Health>('backups'));}catch{setFailed(true);}finally{setBusy(false);}}
  const labels={healthy:'Verified backup is recent / सत्यापित बैकअप हाल का है',overdue:'Backup overdue (more than 26 hours) / बैकअप में देरी',failed:'Backup failed or copy is missing / बैकअप विफल या प्रति गायब',missing:'No verified backup recorded / सत्यापित बैकअप नहीं मिला',unavailable:'Backup status cannot be verified / बैकअप स्थिति सत्यापित नहीं हो सकी'};
  return <section className="field-card no-print" aria-label={pickLanguage("Backup health / बैकअप स्थिति",uiLocale)}><h2><UiText text={"Backup health / बैकअप स्थिति"}/></h2>
    {failed?<p role="alert"><UiText text={"Cannot check server backups. Connect and refresh. / सर्वर से जुड़कर फिर जाँचें।"}/></p>:health?<><p role={health.status==='healthy'?'status':'alert'} className={health.status==='healthy'?undefined:'field-error'}><strong><UiText text={labels[health.status]}/></strong></p>
      {health.lastBackup&&<p>{new Date(health.lastBackup.at).toLocaleString()} · {health.lastBackup.records} {health.lastBackup.records===1?'record':'records'} <UiText text={"/ रिकॉर्ड ·"}/>{Math.ceil(health.lastBackup.bytes/1024)} KB</p>}
      {health.lastFailure&&<p><UiText text={"Last failed attempt / अंतिम विफल प्रयास:"}/>{new Date(health.lastFailure).toLocaleString()}</p>}</>:<p role="status"><UiText text={"Checking backups… / बैकअप जाँच रहे हैं…"}/></p>}
    <p><UiText text={"Synced records only. Keep a separate copy. / केवल सिंक रिकॉर्ड। अलग प्रति भी रखें।"}/></p>
    <details><summary><UiText text={"Backup details / बैकअप विवरण"}/></summary>
      {health&&<p><UiText text={"Checked / जाँच:"}/>{new Date(health.checkedAt).toLocaleString()}</p>}
      <p><UiText text={health?.storage==='provider'?"Hosted database. Check recovery options in the provider dashboard; keep a separate field backup. / होस्ट किया गया डेटाबेस। प्रदाता डैशबोर्ड में पुनर्प्राप्ति विकल्प जाँचें; अलग मैदानी बैकअप रखें।":"Stored on this server. Off-device copy unverified. / सर्वर पर सहेजा गया। बाहरी प्रति सत्यापित नहीं है।"}/></p>
      {health?.lastBackup&&<p><UiText text={"Database checks passed at backup time; full restore not tested. / बैकअप के समय डेटाबेस जाँच सफल; पूरी पुनर्प्राप्ति अपरीक्षित।"}/></p>}
      <p><UiText text={health?.storage==='provider'?"Recovery guide / पुनर्प्राप्ति मार्गदर्शिका:":"For failed or overdue backups, ask the server operator to check the daily job and disk space. Recovery guide:"}/><code>{health?.storage==='provider'?'docs/deployment/vercel.md':'docs/deployment/team-local.md'}</code>.</p>
    </details>
    <button type="button" disabled={busy} onClick={()=>void refresh()}><UiText text={"Refresh backup health / बैकअप स्थिति जाँचें"}/></button>
  </section>;
}
