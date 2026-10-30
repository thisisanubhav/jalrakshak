import { VisitSyncStatus } from './WorkflowGuidance';
import { VisitAiSummary } from './VisitAiSummary';
import { useState, type FormEvent } from 'react';
import type { FieldData, FieldMeasurement, FieldSource, Scope } from '@/field/model';
import type { TeamUser } from '@/team/shared';
import type { Translate } from '@/field/i18n';
import { reviewState, correctionPending } from '@/field/operations';
import { saveFieldSource } from '@/field/store';
function ReviewForm({source,visit,user,t,onSaved,onOpen}:{onOpen:()=>void;source:FieldSource;visit:FieldMeasurement;user:TeamUser;t:Translate;onSaved:()=>Promise<unknown>}){
  const [state,setState]=useState<'REVIEWED'|'CORRECTIONS'>('REVIEWED'),[note,setNote]=useState(''),[busy,setBusy]=useState(false),[failed,setFailed]=useState(false);
  async function submit(event:FormEvent){event.preventDefault();if(busy||!note.trim())return;setBusy(true);setFailed(false);try{const at=new Date().toISOString();await saveFieldSource({...source,updatedAt:at,visitReviews:[...(source.visitReviews??[]),{id:crypto.randomUUID(),measurementId:visit.id,state,note:note.trim(),at,reviewerId:user.id,reviewerName:user.name}]},source.updatedAt);await onSaved();setNote('');}catch{setFailed(true);}finally{setBusy(false);}}
  return <form onSubmit={e=>void submit(e)} className="field-grid"><VisitAiSummary visitId={visit.id} t={t} onOpen={onOpen} onUse={text=>{const next=[note.trim(),text.trim()].filter(Boolean).join("\n\n");if(next.length>2000)return false;setNote(next);return true;}} /><label>{t('reviewDecision')}<select aria-label={t("reviewDecision")} value={state} onChange={e=>setState(e.target.value as typeof state)}><option value="REVIEWED">{t('REVIEWED')}</option><option value="CORRECTIONS">{t('CORRECTIONS')}</option></select></label><label>{t('reviewNote')}<textarea aria-label={t("reviewNote")} required maxLength={2000} value={note} onChange={e=>setNote(e.target.value)} /></label><button disabled={busy}>{t('saveReview')}</button>{failed&&<p role="alert">{t('conflict')}</p>}</form>;
}
export function VisitReviewQueue({data,scope,user,t,onSaved,onOpen,onCorrect}:{data:FieldData;scope:Scope;user?:TeamUser;t:Translate;onSaved:()=>Promise<unknown>;onOpen:(sourceId:string)=>void;onCorrect:(visit:FieldMeasurement)=>void}){
  const hi=t('navHome')==='होम', label=(en:string,hindi:string)=>hi?hindi:en;
  const [group,setGroup]=useState<'SUBMITTED'|'CORRECTIONS'|'REVIEWED'>('SUBMITTED');
  const visits=data.measurements.filter(m=>m.scope===scope&&data.sources.some(s=>s.id===m.sourceId&&s.scope===scope)).sort((a,b)=>group==='REVIEWED'?b.createdAt.localeCompare(a.createdAt):a.createdAt.localeCompare(b.createdAt));
  const sourceOf=(visit:FieldMeasurement)=>data.sources.find(s=>s.id===visit.sourceId)!;
  const groups=['SUBMITTED','CORRECTIONS','REVIEWED'] as const;
  return <section className="field-card" aria-label={t('visitQueue')}><h2>{t('visitQueue')}</h2><p>{t('reviewHelp')}</p><p className="field-small">{label('Pending visits appear oldest first. Review decisions are saved locally, then synced.', 'लंबित विज़िट पहले पुरानी तारीख के क्रम में हैं। निर्णय डिवाइस पर सहेजे जाते हैं, फिर सिंक होते हैं।')}</p><div className="field-actions">{groups.map(key=><button key={key} type="button" aria-pressed={group===key} onClick={()=>setGroup(key)}>{t(key)} ({visits.filter(v=>reviewState(sourceOf(v),v)===key).length})</button>)}</div>
    {!visits.some(v=>reviewState(sourceOf(v),v)===group)&&<p>{t('queueEmpty')}</p>}
    {visits.filter(v=>reviewState(sourceOf(v),v)===group).map(visit=>{const source=sourceOf(visit);const reviews=source.visitReviews?.filter(r=>r.measurementId===visit.id)??[];return <article className="visit-review-card" key={visit.id}><h3>{source.code} · {new Date(visit.measuredAt).toLocaleString(hi?'hi-IN':'en-IN')}</h3><VisitSyncStatus visit={visit} t={t} /><p className="review-next-action">{group==='SUBMITTED'?label('Next: supervisor reviews the evidence', 'अगला: पर्यवेक्षक साक्ष्य की समीक्षा करे'):group==='CORRECTIONS'?correctionPending(data,source,visit)?label('Next: assigned worker records a correction', 'अगला: नियुक्त कर्मचारी सुधार दर्ज करे'):label('Replacement submitted · supervisor review is next', 'सुधार जमा है · अब पर्यवेक्षक की समीक्षा'):label('Reviewed · follow any linked investigation separately', 'समीक्षा पूर्ण · जुड़ी जाँच का अलग से फ़ॉलो-अप करें')}</p><p>{visit.readings.join(' / ')} µS/cm · {t(visit.quality.status==='REPEATABLE'?'repeatable':'disagreement')}</p><p>{visit.notes}</p><button type="button" onClick={()=>onOpen(source.id)}>{t('history')}</button>{visit.correctsMeasurementId&&<p>{t('correctsVisit')}: {visit.correctsMeasurementId}</p>}
      {reviews.length>0&&<details open><summary>{t('reviewLog')}</summary><ol>{reviews.map(r=><li key={r.id}>{t(r.state)} · {r.reviewerName} · <time>{r.at}</time><p>{r.note}</p></li>)}</ol></details>}
      {group==='CORRECTIONS'&&(correctionPending(data,source,visit)?<button type="button" onClick={()=>onCorrect(visit)}>{t('correctionVisit')}</button>:<p>{t('replacementSubmitted')}</p>)}
      {user?.role==='supervisor'&&<ReviewForm key={source.updatedAt+visit.id} source={source} visit={visit} user={user} t={t} onSaved={onSaved} onOpen={()=>onOpen(source.id)} />}
    </article>;})}</section>;
}
