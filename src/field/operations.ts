import { FieldError, type FieldData, type FieldMeasurement, type FieldSource } from './model';
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function scheduleStatus(source: FieldSource, visits: FieldMeasurement[], today = localDate()) {
  if (!source.schedule) return 'unscheduled';
  if (visits.some(m=>m.sourceId===source.id && m.scope===source.scope && m.scheduleId===source.schedule!.id)) return 'completed';
  return source.schedule.date < today ? 'overdue' : source.schedule.date === today ? 'today' : 'upcoming';
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
