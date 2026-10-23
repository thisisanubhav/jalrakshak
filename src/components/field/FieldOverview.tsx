import type { FieldData, Scope } from '@/field/model';
import type { Label, Translate } from '@/field/i18n';
import { fieldOverview, type InvestigationFilter } from '@/field/overview';
export function FieldOverview({ data, scope, t, filter, onFilter, onSources }: {
  data: FieldData; scope: Scope; t: Translate; filter: InvestigationFilter;
  onFilter: (filter: InvestigationFilter) => void; onSources: (eligible: boolean) => void;
}) {
  const { counts } = fieldOverview(data, scope);
  const metrics: [keyof typeof counts, Label, () => void][] = [
    ['sources', 'sources', () => onSources(false)], ['eligible', 'eligibleSources', () => onSources(true)],
    ['open', 'openCount', () => onFilter('open')], ['retests', 'RETEST_REQUESTED', () => onFilter('retests')],
    ['followup', 'followupCount', () => onFilter('followup')], ['closed', 'closedCount', () => onFilter('closed')],
  ];
  return <section className="field-card" aria-label={t('overview')}><h3>{t('overview')}</h3><p>{t('overviewHelp')}</p>
    <div className="field-grid">{metrics.map(([key, label, click]) => <button key={key} type="button" onClick={click} aria-pressed={key === filter} data-testid={`metric-${key}`}><strong>{counts[key]}</strong> · {t(label)}</button>)}</div>
    <button type="button" onClick={() => onFilter('all')} aria-pressed={filter === 'all'}>{t('allInvestigations')} ({counts.all})</button>
  </section>;
}
