import { useState, type FormEvent } from 'react';
import type { FieldData, FieldMeasurement, FieldSource, Scope } from '@/field/model';
import type { TeamUser } from '@/team/shared';
import type { Translate } from '@/field/i18n';
import { reviewState, correctionPending } from '@/field/operations';
import { saveFieldSource } from '@/field/store';
function ReviewForm({source,visit,user,t,onSaved}:{source:FieldSource;visit:FieldMeasurement;user:TeamUser;t:Translate;onSaved:()=>Promise<unknown>}){
  const [state,setState]=useState<'REVIEWED'|'CORRECTIONS'>('REVIEWED'),[note,setNote]=useState(''),[busy,setBusy]=useState(false),[failed,setFailed]=useState(false);
  async function submit(event:FormEvent){event.preventDefault();if(busy||!note.trim())return;setBusy(true);setFailed(false);try{const at=new Date().toISOString();await saveFieldSource({...source,updatedAt:at,visitReviews:[...(source.visitReviews??[]),{id:crypto.randomUUID(),measurementId:visit.id,state,note:note.trim(),at,reviewerId:user.id,reviewerName:user.name}]},source.updatedAt);await onSaved();setNote('');}catch{setFailed(true);}finally{setBusy(false);}}
  return <form onSubmit={e=>void submit(e)} className="field-grid"><label>{t('reviewDecision')}<select value={state} onChange={e=>setState(e.target.value as typeof state)}><option value="REVIEWED">{t('REVIEWED')}</option><option value="CORRECTIONS">{t('CORRECTIONS')}</option></select></label><label>{t('reviewNote')}<textarea required maxLength={2000} value={note} onChange={e=>setNote(e.target.value)} /></label><button disabled={busy}>{t('saveReview')}</button>{failed&&<p role="alert">{t('conflict')}</p>}</form>;
}
export function VisitReviewQueue({data,scope,user,t,onSaved,onOpen,onCorrect}:{data:FieldData;scope:Scope;user?:TeamUser;t:Translate;onSaved:()=>Promise<unknown>;onOpen:(sourceId:string)=>void;onCorrect:(visit:FieldMeasurement)=>void}){
  const [group,setGroup]=useState<'SUBMITTED'|'CORRECTIONS'|'REVIEWED'>('SUBMITTED');
  const visits=data.measurements.filter(m=>m.scope===scope&&data.sources.some(s=>s.id===m.sourceId&&s.scope===scope)).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  const sourceOf=(visit:FieldMeasurement)=>data.sources.find(s=>s.id===visit.sourceId)!;
  const groups=['SUBMITTED','CORRECTIONS','REVIEWED'] as const;
  return <section className="field-card" aria-label={t('visitQueue')}><h2>{t('visitQueue')}</h2><p>{t('reviewHelp')}</p><div className="field-actions">{groups.map(key=><button key={key} type="button" aria-pressed={group===key} onClick={()=>setGroup(key)}>{t(key)} ({visits.filter(v=>reviewState(sourceOf(v),v)===key).length})</button>)}</div>
    {!visits.some(v=>reviewState(sourceOf(v),v)===group)&&<p>{t('queueEmpty')}</p>}
    {visits.filter(v=>reviewState(sourceOf(v),v)===group).map(visit=>{const source=sourceOf(visit);const reviews=source.visitReviews?.filter(r=>r.measurementId===visit.id)??[];return <article className="visit-review-card" key={visit.id}><h3>{source.code} · {visit.measuredAt}</h3><p>{visit.readings.join(' / ')} µS/cm · {t(visit.quality.status==='REPEATABLE'?'repeatable':'disagreement')}</p><p>{visit.notes}</p><button type="button" onClick={()=>onOpen(source.id)}>{t('history')}</button>{visit.correctsMeasurementId&&<p>{t('correctsVisit')}: {visit.correctsMeasurementId}</p>}
      {reviews.length>0&&<details open><summary>{t('reviewLog')}</summary><ol>{reviews.map(r=><li key={r.id}>{t(r.state)} · {r.reviewerName} · <time>{r.at}</time><p>{r.note}</p></li>)}</ol></details>}
      {group==='CORRECTIONS'&&(correctionPending(data,source,visit)?<button type="button" onClick={()=>onCorrect(visit)}>{t('correctionVisit')}</button>:<p>{t('replacementSubmitted')}</p>)}
      {user?.role==='supervisor'&&<ReviewForm key={source.updatedAt+visit.id} source={source} visit={visit} user={user} t={t} onSaved={onSaved} />}
    </article>;})}</section>;
}
