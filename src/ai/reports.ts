import { TeamError, type TeamStore } from '@/team/server';
import type { TeamUser } from '@/team/shared';
import { monthlyReport, type MonthlyFilters } from '@/field/monthly-report';

export function reportEvidence(store: Pick<TeamStore, 'snapshot'>, user: TeamUser, action: 'history' | 'monthly', input: Record<string, unknown>, hi: boolean) {
  if (user.role !== 'supervisor') throw new TeamError(403, 'AI_SUPERVISOR_ONLY');
  const snapshot = store.snapshot(user);
  const data = snapshot.data;
  const label = (en: string, hindi: string) => hi ? hindi : en;
  const evidenceVisits: {visitId:string;sourceId:string;measuredAt:string;notesMissing:boolean;qualityFlag:boolean}[] = [];
  let missingNotes = 0;
  const facts: string[] = [];
  const references: { sourceId: string; label: string }[] = [];
  let required: number[];
  let basis: string;
  if (action === 'history') {
    const source = data.sources.find(s => s.id === input.sourceId && s.scope === 'MANUAL_FIELD');
    if (!source) throw new TeamError(404, 'AI_SYNC_VISIT');
    const visits = data.measurements.filter(m => m.sourceId === source.id && m.scope === 'MANUAL_FIELD').sort((a,b) => b.measuredAt.localeCompare(a.measuredAt) || a.id.localeCompare(b.id));
    const followUps = data.investigations.filter(i => i.sourceId === source.id && i.scope === 'MANUAL_FIELD').sort((a,b) => (b.events.at(-1)?.at ?? '').localeCompare(a.events.at(-1)?.at ?? ''));
    facts.push(`${label('Source', 'स्रोत')}: ${source.code.slice(0,80)}`, `${label('Recorded visits', 'दर्ज विज़िट')}: ${visits.length}`);
    required = [0,1];
    missingNotes = visits.filter(m=>!m.notes.trim()).length;
    for (const m of visits.slice(0,10)) {
      evidenceVisits.push({visitId:m.id,sourceId:m.sourceId,measuredAt:m.measuredAt,notesMissing:!m.notes.trim(),qualityFlag:m.quality.status!=='REPEATABLE'});
      const review = source.visitReviews?.filter(r => r.measurementId === m.id).at(-1)?.state ?? 'SUBMITTED';
      facts.push(`${m.measuredAt}: EC ${m.readings.join(' / ')} µS/cm; ${m.quality.status}; ${review}; ${m.notes.slice(0,120)}`);
    }
    for (const i of followUps.slice(0,5)) facts.push(`${label('Follow-up', 'फ़ॉलो-अप')}: ${i.state}; ${i.events.at(-1)?.note.slice(0,120) ?? ''}`);
    references.push({sourceId: source.id, label: source.code});
    basis = label('Synced records only. Up to 10 latest visits and 5 latest investigations; notes shortened. Selected highlights are not a complete history.', 'केवल सिंक रिकॉर्ड। नवीनतम 10 विज़िट और 5 जाँच तक; नोट संक्षिप्त हैं। चुने अंश पूरा इतिहास नहीं हैं।');
  } else {
    if (typeof input.month !== 'string' || !/^(?!0000)\d{4}-(0[1-9]|1[0-2])$/.test(input.month) || input.month > '9998-12') throw new TeamError(400, 'AI_INVALID_INPUT');
    const filters: MonthlyFilters = {month: input.month};
    for (const key of ['state','district','village','sourceId','operator'] as const) {
      if (input[key] !== undefined && (typeof input[key] !== 'string' || input[key].length > 300)) throw new TeamError(400, 'AI_INVALID_INPUT');
      filters[key] = input[key] as string | undefined;
    }
    const report = monthlyReport(data, 'MANUAL_FIELD', filters);
    facts.push(`${label('Month', 'माह')}: ${filters.month}`,
      `${label('Visits; sources visited / selected', 'विज़िट; देखे / चुने स्रोत')}: ${report.rows.length}; ${report.visited} / ${report.sources.length}`,
      `${label('Submitted / reviewed / corrections', 'जमा / समीक्षित / सुधार')}: ${report.submitted} / ${report.reviewed} / ${report.corrections}`,
      `${label('Quality flags / unusual readings / pending retests', 'गुणवत्ता संकेत / असामान्य रीडिंग / लंबित पुनर्परीक्षण')}: ${report.qualityFlags} / ${report.anomalies} / ${report.pendingRetests}`,
      `${label('Scheduled / completed / overdue', 'निर्धारित / पूर्ण / लंबित')}: ${report.schedules.length} / ${report.schedules.filter(s=>s.status==='completed').length} / ${report.schedules.filter(s=>s.status==='overdue').length}`);
    required = [0,1,2,3,4];
    missingNotes = report.rows.filter(m=>!m.notes.trim()).length;
    for (const m of report.rows.filter(m=>m.review==='REVIEWED' && m.notes.trim()).slice(-10).reverse()) {
      evidenceVisits.push({visitId:m.id,sourceId:m.sourceId,measuredAt:m.measuredAt,notesMissing:false,qualityFlag:m.quality.status!=='REPEATABLE'});
      facts.push(`${m.source.code.slice(0,60)} · ${m.measuredAt}: ${m.notes.slice(0,120)}`);
      if (!references.some(r=>r.sourceId===m.sourceId)) references.push({sourceId: m.sourceId, label: m.source.code});
    }
    basis = label(`Synced records; server calendar (${Intl.DateTimeFormat().resolvedOptions().timeZone}), through ${report.cutoff}. Current schedules; up to 10 latest reviewed visit notes. Device report totals may differ before sync or across time zones.`, `सिंक रिकॉर्ड; सर्वर कैलेंडर (${Intl.DateTimeFormat().resolvedOptions().timeZone}), ${report.cutoff} तक। वर्तमान कार्यक्रम; नवीनतम 10 समीक्षित विज़िट नोट तक। सिंक या समय क्षेत्र के कारण डिवाइस रिपोर्ट अलग हो सकती है।`);
  }
  return {facts, required, revision: snapshot.revision, references, basis, evidenceVisits, missingNotes};
}
