import {TeamActivity} from './TeamActivity';
import {scheduleStatus} from '@/field/operations';

import { UiText } from '@/components/UiLanguage';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/team/client';
import type { TeamOverview } from '@/team/shared';
import type { Translate } from '@/field/i18n';
import { matchesInvestigation } from '@/field/overview';
export function SupervisorOverview({ t, onManage }: { t: Translate; onManage?: () => void }) {
  const [overview,setOverview] = useState<TeamOverview>();
  const [loading,setLoading] = useState(true); const [failed,setFailed] = useState(false);
  const mounted = useRef(false); const lock = useRef(false);
  async function refresh() {
    if (lock.current) return;
    lock.current = true; setLoading(true); setFailed(false);
    try { const result = await api<TeamOverview>('overview'); if(mounted.current)setOverview(result); }
    catch { if(mounted.current)setFailed(true); }
    finally { lock.current=false; if(mounted.current)setLoading(false); }
  }
  useEffect(()=>{ mounted.current=true; queueMicrotask(()=>{if(mounted.current)void refresh();}); return()=>{mounted.current=false;}; },[]);
  const hi=t('navHome')==='होम',label=(en:string,hindi:string)=>hi?hindi:en;
  const data=overview?.snapshot.data;
  const needsWorker=data?.sources.filter(s=>!overview?.users.some(u=>u.id===overview.snapshot.assignments[s.id]&&u.role==='worker'&&u.active===1)) ?? [];
  return <section className="field-card supervisor-overview" aria-label={t('supervisorOverview')}>
    <h2>{t('supervisorOverview')}</h2><p>{t('sharedOnly')}</p>
    <div className="field-actions"><button disabled={loading} type="button" onClick={()=>void refresh()}>{t('refreshOverview')}</button>{onManage&&<button id="manage-team-cta" className="field-primary-cta" type="button" onClick={onManage}><UiText text={"Manage team / टीम प्रबंधन"}/></button>}</div>
    {loading&&<p role="status">{t('loading')}</p>}{failed&&<p role="alert">{t('overviewUnavailable')}</p>}
    {overview&&data&&<>
      <p>{t('overviewAt')}: {new Date(overview.at).toLocaleString()}</p>
      <div className="field-work-summary"><div><strong>{data.sources.length}</strong><span>{t('workSources')}</span></div><div><strong>{data.investigations.filter(i=>matchesInvestigation(i,'open')).length}</strong><span>{t('openWork')}</span></div><div><strong>{data.investigations.filter(i=>matchesInvestigation(i,'retests')).length}</strong><span>{t('workRetests')}</span></div><div><strong>{needsWorker.length}</strong><span>{t('assignmentNeeded')}</span></div></div>
      <h3>{t('rosterTitle')}</h3><p>{label('Workload by current assignment. Visit counts cover the last 30 days; they do not measure who performed the visit.','वर्तमान आवंटन के अनुसार कार्यभार। विज़िट संख्या पिछले 30 दिनों की है; यह विज़िट करने वाले व्यक्ति का माप नहीं है।')}</p>
      <ul className="field-task-list">{overview.users.map(user=>{
        const sources=data.sources.filter(s=>overview.snapshot.assignments[s.id]===user.id);const ids=new Set(sources.map(s=>s.id));
        const overdue=sources.filter(s=>scheduleStatus(s,data.measurements)==='overdue').length;const recent=data.measurements.filter(m=>ids.has(m.sourceId)&&Date.parse(m.measuredAt)>=Date.parse(overview.at)-30*86400_000&&Date.parse(m.measuredAt)<=Date.parse(overview.at)).length;
        return <li key={user.id}><div><strong>{user.name} · {user.username}</strong><p>{user.role} · {t(user.active?'activeWorker':'inactiveWorker')}</p><p>{t('assignedSources')}: {sources.length} · {t('openWork')}: {data.investigations.filter(i=>ids.has(i.sourceId)&&matchesInvestigation(i,'open')).length}</p><p>{label('Saved visits (30 days)','सहेजी विज़िट (30 दिन)')}: {recent} · {label('Overdue sources','देरी वाले स्रोत')}: {overdue}</p>{sources.length>0&&<details><summary>{t('assignedSources')}</summary><ul>{sources.map(s=><li key={s.id}>{s.code} · {s.name} · {s.village}</li>)}</ul></details>}</div></li>;
      })}</ul>
      {needsWorker.length>0&&<details><summary>{t('assignmentNeeded')} ({needsWorker.length})</summary><ul>{needsWorker.map(s=><li key={s.id}>{s.code} · {s.name}</li>)}</ul></details>}
      <TeamActivity overview={overview} hi={hi}/>
    </>}
  </section>;
}
