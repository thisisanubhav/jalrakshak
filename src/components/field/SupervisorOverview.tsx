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
  const data=overview?.snapshot.data;
  const needsWorker=data?.sources.filter(s=>!overview?.users.some(u=>u.id===overview.snapshot.assignments[s.id]&&u.role==='worker'&&u.active===1)) ?? [];
  return <section className="field-card supervisor-overview" aria-label={t('supervisorOverview')}>
    <h2>{t('supervisorOverview')}</h2><p>{t('sharedOnly')}</p>
    <div className="field-actions"><button disabled={loading} type="button" onClick={()=>void refresh()}>{t('refreshOverview')}</button>{onManage&&<button type="button" onClick={onManage}>{t('manageAssignments')}</button>}</div>
    {loading&&<p role="status">{t('loading')}</p>}{failed&&<p role="alert">{t('overviewUnavailable')}</p>}
    {overview&&data&&<>
      <p>{t('overviewAt')}: {new Date(overview.at).toLocaleString()}</p>
      <div className="field-work-summary"><div><strong>{data.sources.length}</strong><span>{t('workSources')}</span></div><div><strong>{data.investigations.filter(i=>matchesInvestigation(i,'open')).length}</strong><span>{t('openWork')}</span></div><div><strong>{data.investigations.filter(i=>matchesInvestigation(i,'retests')).length}</strong><span>{t('workRetests')}</span></div><div><strong>{needsWorker.length}</strong><span>{t('assignmentNeeded')}</span></div></div>
      <h3>{t('rosterTitle')}</h3>
      <ul className="field-task-list">{overview.users.map(user=>{
        const sources=data.sources.filter(s=>overview.snapshot.assignments[s.id]===user.id);const ids=new Set(sources.map(s=>s.id));
        return <li key={user.id}><div><strong>{user.name} · {user.username}</strong><p>{user.role} · {t(user.active?'activeWorker':'inactiveWorker')}</p><p>{t('assignedSources')}: {sources.length} · {t('openWork')}: {data.investigations.filter(i=>ids.has(i.sourceId)&&matchesInvestigation(i,'open')).length}</p>{sources.length>0&&<details><summary>{t('assignedSources')}</summary><ul>{sources.map(s=><li key={s.id}>{s.code} · {s.name} · {s.village}</li>)}</ul></details>}</div></li>;
      })}</ul>
      {needsWorker.length>0&&<details><summary>{t('assignmentNeeded')} ({needsWorker.length})</summary><ul>{needsWorker.map(s=><li key={s.id}>{s.code} · {s.name}</li>)}</ul></details>}
      <h3>{t('recentTeamActivity')}</h3>{!overview.activity.length&&<p>{t('activityEmpty')}</p>}
      <ol className="field-team-activity">{overview.activity.map(item=><li key={item.id}><strong>{item.actorName}</strong> · {t(item.action==='sync'?'activitySync':item.action==='assign-source'?'activityAssign':'activityAccount')}<br/><time dateTime={item.at}>{new Date(item.at).toLocaleString()}</time></li>)}</ol>
    </>}
  </section>;
}
