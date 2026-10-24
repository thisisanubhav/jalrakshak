import type { FieldData, FieldSource, Scope } from './model';
import { matchesInvestigation } from './overview';
export type SourceStatus = 'all' | 'unmeasured' | 'retests' | 'followup' | 'clear';
export interface SourceFilters { query: string; village: string; category: string; status: SourceStatus }
export const emptySourceFilters: SourceFilters = { query: '', village: '', category: '', status: 'all' };
export interface FieldTask { id: string; source: FieldSource; kind: 'retest' | 'followup' | 'first'; investigationId?: string; since: string }
export function fieldTasks(data: FieldData, scope: Scope): FieldTask[] {
  const sources = data.sources.filter(s => s.scope === scope); const tasks: FieldTask[] = [];
  for (const source of sources) {
    for (const investigation of data.investigations.filter(i => i.scope === scope && i.sourceId === source.id && matchesInvestigation(i,'open'))) {
      const recordedRetest = data.measurements.some(m => m.scope === scope && m.sourceId === source.id && m.investigationId === investigation.id && m.measuredAt >= investigation.events.at(-1)!.at);
      tasks.push({ id: investigation.id, source, investigationId: investigation.id, kind: investigation.state === 'RETEST_REQUESTED' && !recordedRetest ? 'retest' : 'followup', since: investigation.events.at(-1)!.at });
    }
    if (!data.measurements.some(m => m.scope === scope && m.sourceId === source.id)) tasks.push({ id: `first-${source.id}`, source, kind: 'first', since: source.createdAt });
  }
  const rank = { retest: 0, followup: 1, first: 2 };
  return tasks.sort((a,b) => rank[a.kind]-rank[b.kind] || a.since.localeCompare(b.since) || a.id.localeCompare(b.id));
}
export function filterSources(data: FieldData, scope: Scope, filters: SourceFilters) {
  const query = filters.query.normalize('NFKC').trim().toLocaleLowerCase();
  return data.sources.filter(source => {
    if (source.scope !== scope || (filters.village && source.village !== filters.village) || (filters.category && source.category !== filters.category)) return false;
    if (query && ![source.code,source.name,source.village,source.district].some(v => v.normalize('NFKC').toLocaleLowerCase().includes(query))) return false;
    const investigations = data.investigations.filter(i => i.scope === scope && i.sourceId === source.id);
    return filters.status === 'all' ||
      (filters.status === 'unmeasured' && !data.measurements.some(m => m.scope === scope && m.sourceId === source.id)) ||
      (filters.status === 'retests' && investigations.some(i => matchesInvestigation(i,'retests'))) ||
      (filters.status === 'followup' && investigations.some(i => matchesInvestigation(i,'followup'))) ||
      (filters.status === 'clear' && !investigations.some(i => matchesInvestigation(i,'open')));
  });
}
