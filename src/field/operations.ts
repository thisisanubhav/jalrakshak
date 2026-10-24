import { FieldError, type FieldData, type FieldMeasurement, type FieldSource } from './model';
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function scheduleStatus(source: FieldSource, visits: FieldMeasurement[], today = localDate()) {
  if (!source.schedule) return 'unscheduled';
  const next=nextScheduledVisit(source,visits);
  if (!next) return 'completed';
  return next.date < today ? 'overdue' : next.date === today ? 'today' : 'upcoming';
}
/** Derive the earliest unfinished occurrence without changing supervisor metadata.
 * Monthly dates stay anchored to the original day (Jan 31 -> Feb 28 -> Mar 31).
 * Old schedules retain their original first-occurrence ID. No missed dates skip.
 */
export function nextScheduledVisit(source:FieldSource,visits:FieldMeasurement[]) {
  const plan=source.schedule;if(!plan)return undefined;
  const completed=new Set(visits.filter(m=>m.sourceId===source.id&&m.scope===source.scope).map(m=>m.scheduleId));
  const [year,month,day]=plan.date.split('-').map(Number);
  for(let index=0;index<=completed.size;index++){
    if(index&&!plan.recurrence)return undefined;
    const value=new Date(plan.date+'T00:00:00Z');
    if(plan.recurrence==='WEEKLY')value.setUTCDate(value.getUTCDate()+7*index);
    if(plan.recurrence==='MONTHLY'){
      value.setUTCDate(1);value.setUTCMonth(month-1+index);
      const last=new Date(0);last.setUTCFullYear(value.getUTCFullYear(),value.getUTCMonth()+1,0);
      value.setUTCDate(Math.min(day,last.getUTCDate()));
    }
    if(!Number.isFinite(value.getTime())||value.getUTCFullYear()>9999||year<1)return undefined;
    const date=value.toISOString().slice(0,10);
    if(plan.endDate&&date>plan.endDate)return undefined;
    const id=index?`${plan.id}@${date}`:plan.id;
    if(!completed.has(id))return {id,date};
  }
  return undefined;
}
export function reviewState(source: FieldSource, visit: FieldMeasurement) {
  return source.visitReviews?.findLast(r=>r.measurementId===visit.id)?.state ?? 'SUBMITTED';
}
export function correctionPending(data: FieldData, source: FieldSource, visit: FieldMeasurement) {
  return reviewState(source,visit)==='CORRECTIONS' && !data.measurements.some(m=>m.correctsMeasurementId===visit.id && m.sourceId===source.id && m.scope===source.scope);
}
// A QR carries only a stable source identifier, never location or account data.
export function sourceQrValue(id: string) { return `jalrakshak:source:${encodeURIComponent(id)}`; }
export function parseSourceQr(value: string) {
  if (!value.startsWith('jalrakshak:source:') || value.length > 1000) throw new FieldError('required');
  let id: string; try { id=decodeURIComponent(value.slice('jalrakshak:source:'.length)); } catch { throw new FieldError('required'); }
  if (!id.trim() || id.length>200) throw new FieldError('required');
  return id;
}
