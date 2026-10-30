import { useEffect, useState, type FormEvent } from 'react';
import { type FieldData, type FieldSource, type Scope, type VisitSchedule as Schedule } from '@/field/model';
import { localDate, nextScheduledVisit, scheduleStatus } from '@/field/operations';
import { saveFieldSource } from '@/field/store';
import type { Translate } from '@/field/i18n';
export function ScheduleEditor({source,t,onSaved}:{source:FieldSource;t:Translate;onSaved:()=>Promise<unknown>}){
  const hi=t('navHome')==='होम',label=(en:string,hindi:string)=>hi?hindi:en;
  const [reason,setReason]=useState(''),[detail,setDetail]=useState('');
  const [date,setDate]=useState(source.schedule?.date??''),[note,setNote]=useState(source.schedule?.note??''),[busy,setBusy]=useState(false),[error,setError]=useState(false);
  const [recurrence,setRecurrence]=useState<Schedule['recurrence']>(source.schedule?.recurrence),[endDate,setEndDate]=useState(source.schedule?.endDate??'');
  async function save(event?:FormEvent){
    event?.preventDefault();if(busy)return;
    if(source.schedule&&(!reason||(reason==='Other'&&!detail.trim()))){setError(true);return;}
    setBusy(true);setError(false);
    try{const now=new Date().toISOString();const schedule=event?{id:crypto.randomUUID(),date,note,createdAt:now,...(recurrence?{recurrence,...(endDate?{endDate}:{})}:{})}:undefined;
      const scheduleChanges=source.schedule?[...(source.scheduleChanges??[]),{id:crypto.randomUUID(),at:now,from:source.schedule,to:schedule,reason:reason==='Other'?detail.trim():reason}]:source.scheduleChanges;
      await saveFieldSource({...source,schedule,scheduleChanges,updatedAt:now},source.updatedAt);await onSaved();
    }catch{setError(true);}finally{setBusy(false);}
  }
  return <details className="no-print"><summary>{t('visitPlan')}: {source.schedule?.date??t('unscheduled')}{source.schedule?.recurrence&&` · ${t(source.schedule.recurrence)}`}</summary><form className="field-grid" onSubmit={e=>void save(e)}><label>{t('scheduleDate')}<input type="date" required value={date} onChange={e=>setDate(e.target.value)} /></label><label>{t('scheduleNote')}<input maxLength={500} value={note} onChange={e=>setNote(e.target.value)} /></label>
    <label>{t('recurrence')}<select aria-label={t('recurrence')} value={recurrence??''} onChange={e=>setRecurrence(e.target.value as Schedule['recurrence']||undefined)}><option value="">{t('once')}</option><option value="WEEKLY">{t('WEEKLY')}</option><option value="MONTHLY">{t('MONTHLY')}</option></select></label>
    {recurrence&&<><label>{t('recurrenceEnd')}<input type="date" min={date} value={endDate} onChange={e=>setEndDate(e.target.value)} /></label><p>{t('recurrenceHelp')}</p></>}
    {source.schedule&&<><label>{label('Reason for changing this plan','योजना बदलने का कारण')}<select required value={reason} onChange={e=>setReason(e.target.value)}><option value="">{label('Choose a reason','कारण चुनें')}</option>{[['Source inaccessible','स्रोत तक पहुँच नहीं'],['Pump not working','पंप काम नहीं कर रहा'],['Worker unavailable','कर्मचारी उपलब्ध नहीं'],['Plan updated','योजना अपडेट'],['Other','अन्य']].map(([en,hindi])=><option key={en} value={en}>{label(en,hindi)}</option>)}</select></label>{reason==='Other'&&<label>{label('Reason details','कारण विवरण')}<input required maxLength={500} value={detail} onChange={e=>setDetail(e.target.value)}/></label>}</>}
    <button disabled={busy}>{t('saveSchedule')}</button>{source.schedule&&<button type="button" disabled={busy} onClick={()=>void save()}>{t('cancelSchedule')}</button>}{error&&<p role="alert">{label('Choose a reason when changing a plan. If it changed elsewhere, refresh and try again.','योजना बदलने का कारण चुनें। अन्यत्र बदलाव हुआ हो तो ताज़ा करके फिर कोशिश करें।')}</p>}</form>{!!source.scheduleChanges?.length&&<details><summary>{label('Plan change history','योजना परिवर्तन इतिहास')}</summary><ul>{[...source.scheduleChanges].reverse().map(change=><li key={change.id}>{change.from.date} → {change.to?.date??label('Cancelled','रद्द')} · {change.reason} · {new Date(change.at).toLocaleString(hi?'hi-IN':'en-IN')}</li>)}</ul></details>}</details>;
}
export function VisitSchedule({data,scope,t,onOpen}:{data:FieldData;scope:Scope;t:Translate;onOpen:(id:string,occurrenceId:string)=>void}){
  const [today,setToday]=useState(()=>localDate());const [chosenGroup,setGroup]=useState<'today'|'overdue'|'upcoming'|'completed'>();
  useEffect(()=>{const update=()=>setToday(localDate());const timer=setInterval(update,60_000);addEventListener('focus',update);return()=>{clearInterval(timer);removeEventListener('focus',update);};},[]);
  const sources=data.sources.filter(s=>s.scope===scope&&s.schedule);const groups=['today','overdue','upcoming','completed'] as const;
  const group=chosenGroup??groups.find(key=>sources.some(s=>scheduleStatus(s,data.measurements,today)===key))??'today';
  const rows=sources.filter(s=>scheduleStatus(s,data.measurements,today)===group).sort((a,b)=>(nextScheduledVisit(a,data.measurements)?.date??a.schedule!.date).localeCompare(nextScheduledVisit(b,data.measurements)?.date??b.schedule!.date)||a.code.localeCompare(b.code));
  return <section className="field-card" aria-label={t('visitPlan')}><h2>{t('visitPlan')}</h2><p>{t('scheduleHelp')}</p><div className="field-actions">{groups.map(key=><button key={key} type="button" aria-pressed={group===key} onClick={()=>setGroup(key)}>{t(key)} ({sources.filter(s=>scheduleStatus(s,data.measurements,today)===key).length})</button>)}</div>
    {!rows.length&&<p>{t('scheduleEmpty')}</p>}<ul className="field-task-list">{rows.map(s=>{const occurrence=nextScheduledVisit(s,data.measurements);const date=occurrence?.date??s.schedule!.endDate??s.schedule!.date;return <li key={s.id}><div><strong>{s.code} · {s.name}</strong><p><time dateTime={date}>{date}</time> · {s.village}{s.schedule!.recurrence&&` · ${t(s.schedule!.recurrence!)}`}</p><p>{s.schedule!.note}</p></div>{occurrence&&<button type="button" onClick={()=>onOpen(s.id,occurrence.id)}>{t('taskMeasureAction')} · {s.code}</button>}</li>;})}</ul></section>;
}
