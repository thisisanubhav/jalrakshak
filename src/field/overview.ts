import { exclusion, type FieldData, type FieldSource, type Investigation, type Scope } from './model';

import { correctionPending, reviewState, scheduleStatus } from './operations';

export type InvestigationFilter = 'all' | 'open' | 'retests' | 'followup' | 'closed';
export function matchesInvestigation(item: Investigation, filter: InvestigationFilter) {
  const closed = item.state === 'RESOLVED' || item.state === 'CLOSED_UNCONFIRMED';
  return filter === 'all' || (filter === 'closed' && closed) || (filter === 'open' && !closed) ||
    (filter === 'retests' && item.state === 'RETEST_REQUESTED') ||
    (filter === 'followup' && ['NEEDS_REVIEW', 'RETEST_COMPLETED', 'LAB_REFERRED'].includes(item.state));
}
export function fieldOverview(data: FieldData, scope: Scope) {
  const sources = data.sources.filter(s => s.scope === scope);
  const ids = new Set(sources.map(s => s.id));
  const measurements = data.measurements.filter(m => m.scope === scope && ids.has(m.sourceId));
  const investigations = data.investigations.filter(i => i.scope === scope && ids.has(i.sourceId));
  const eligibleSourceIds = new Set(measurements.filter(m => !exclusion(m, m, m.rule, false)).map(m => m.sourceId));
  return { sources, eligibleSourceIds, investigations, counts: {
    all: investigations.length, sources: sources.length, eligible: eligibleSourceIds.size,
    open: investigations.filter(i => matchesInvestigation(i, 'open')).length,
    retests: investigations.filter(i => matchesInvestigation(i, 'retests')).length,
    followup: investigations.filter(i => matchesInvestigation(i, 'followup')).length,
    closed: investigations.filter(i => matchesInvestigation(i, 'closed')).length,
  } };
}
export function sourceMapSummary(data: FieldData, source: FieldSource) {
  const latest = data.measurements.filter(m => m.sourceId === source.id && m.scope === source.scope && !exclusion(m, m, m.rule, false))
    .sort((a,b) => b.measuredAt.localeCompare(a.measuredAt) || a.id.localeCompare(b.id))[0];
  const priority = ['RETEST_REQUESTED', 'NEEDS_REVIEW', 'RETEST_COMPLETED', 'LAB_REFERRED', 'RESOLVED', 'CLOSED_UNCONFIRMED'];
  const investigation = data.investigations.filter(i => i.sourceId === source.id && i.scope === source.scope)
    .sort((a,b) => priority.indexOf(a.state) - priority.indexOf(b.state))[0];
  return { latest, investigation, retestRequested: investigation?.state === 'RETEST_REQUESTED' };
}
/** Work priority only; never a water-safety classification. */
export function sourceMapStatus(data: FieldData, source: FieldSource, today?: string): 'retest' | 'followup' | 'overdue' | 'reviewed' | 'recorded' | 'unmeasured' {
  const summary = sourceMapSummary(data, source);
  const visits = data.measurements.filter(m => m.sourceId === source.id && m.scope === source.scope)
    .sort((a,b) => b.measuredAt.localeCompare(a.measuredAt) || a.id.localeCompare(b.id));
  if (summary.retestRequested) return 'retest';
  if (summary.investigation && !['RESOLVED', 'CLOSED_UNCONFIRMED'].includes(summary.investigation.state) || visits.some(v => correctionPending(data, source, v))) return 'followup';
  if (scheduleStatus(source, visits, today) === 'overdue') return 'overdue';
  if (visits[0] && reviewState(source, visits[0]) === 'REVIEWED') return 'reviewed';
  return summary.latest ? 'recorded' : 'unmeasured';
}
export function hasCoordinates(source: FieldSource) {
  return Number.isFinite(source.latitude) && Number.isFinite(source.longitude) && Math.abs(source.latitude!) <= 90 && Math.abs(source.longitude!) <= 180;
}
