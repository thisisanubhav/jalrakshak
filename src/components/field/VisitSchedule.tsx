import { useEffect, useState, type FormEvent } from 'react';
import { type FieldData, type FieldSource, type Scope } from '@/field/model';
import { localDate, scheduleStatus } from '@/field/operations';
import { saveFieldSource } from '@/field/store';
import type { Translate } from '@/field/i18n';
export function ScheduleEditor({source,t,onSaved}:{source:FieldSource;t:Translate;onSaved:()=>Promise<unknown>}){
  const [date,setDate]=useState(source.schedule?.date??''),[note,setNote]=useState(source.schedule?.note??''),[busy,setBusy]=useState(false),[error,setError]=useState(false);
  async function save(event?:FormEvent){event?.preventDefault();if(busy)return;setBusy(true);setError(false);try{const now=new Date().toISOString();await saveFieldSource({...source,schedule:event?{id:crypto.randomUUID(),date,note,createdAt:now}:undefined,updatedAt:now},source.updatedAt);await onSaved();}catch{setError(true);}finally{setBusy(false);}}
  return <details className="no-print"><summary>{t('visitPlan')}: {source.schedule?.date??t('unscheduled')}</summary><form className="field-grid" onSubmit={e=>void save(e)}><label>{t('scheduleDate')}<input type="date" required value={date} onChange={e=>setDate(e.target.value)} /></label><label>{t('scheduleNote')}<input maxLength={500} value={note} onChange={e=>setNote(e.target.value)} /></label><button disabled={busy}>{t('saveSchedule')}</button>{source.schedule&&<button type="button" disabled={busy} onClick={()=>void save()}>{t('cancelSchedule')}</button>}{error&&<p role="alert">{t('conflict')}</p>}</form></details>;
}
export function VisitSchedule({data,scope,t,onOpen}:{data:FieldData;scope:Scope;t:Translate;onOpen:(id:string)=>void}){
  const [today,setToday]=useState(()=>localDate());const [group,setGroup]=useState<'today'|'overdue'|'upcoming'|'completed'>('today');
  useEffect(()=>{const update=()=>setToday(localDate());const timer=setInterval(update,60_000);addEventListener('focus',update);return()=>{clearInterval(timer);removeEventListener('focus',update);};},[]);
  const sources=data.sources.filter(s=>s.scope===scope&&s.schedule);const groups=['today','overdue','upcoming','completed'] as const;
  const rows=sources.filter(s=>scheduleStatus(s,data.measurements,today)===group).sort((a,b)=>a.schedule!.date.localeCompare(b.schedule!.date)||a.code.localeCompare(b.code));
  return <section className="field-card" aria-label={t('visitPlan')}><h2>{t('visitPlan')}</h2><p>{t('scheduleHelp')}</p><div className="field-actions">{groups.map(key=><button key={key} type="button" aria-pressed={group===key} onClick={()=>setGroup(key)}>{t(key)} ({sources.filter(s=>scheduleStatus(s,data.measurements,today)===key).length})</button>)}</div>
    {!rows.length&&<p>{t('scheduleEmpty')}</p>}<ul className="field-task-list">{rows.map(s=><li key={s.id}><div><strong>{s.code} · {s.name}</strong><p><time dateTime={s.schedule!.date}>{s.schedule!.date}</time> · {s.village}</p><p>{s.schedule!.note}</p></div>{group!=='completed'&&<button type="button" onClick={()=>onOpen(s.id)}>{t('taskMeasureAction')} · {s.code}</button>}</li>)}</ul></section>;
}
