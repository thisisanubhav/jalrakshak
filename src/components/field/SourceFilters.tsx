import { categories, type FieldSource } from '@/field/model';
import type { Translate } from '@/field/i18n';
import { emptySourceFilters, type SourceFilters as Filters } from '@/field/tasks';
import { Input, Select } from './FieldViews';
export function SourceFilters({ value, onChange, sources, count, t }: { value: Filters; onChange: (value: Filters) => void; sources: FieldSource[]; count: number; t: Translate }) {
  return <section className="field-card no-print" aria-label={t('sourceFilters')}>
    <Input label={t('sourceSearch')} type="search" value={value.query} onChange={e => onChange({...value,query:e.target.value})} />
    <div className="field-grid">
      <Select label={t('filterState')} value={value.state??''} onChange={e=>onChange({...value,state:e.target.value,district:'',village:''})}><option value="">{t('allStates')}</option><option value="__unspecified__">{t('locationUnspecified')}</option>{[...new Set(sources.map(s=>s.state).filter(Boolean))].sort().map(state=><option key={state} value={state}>{state}</option>)}</Select>
      <Select label={t('filterDistrict')} value={value.district??''} onChange={e=>onChange({...value,district:e.target.value,village:''})}><option value="">{t('allDistricts')}</option>{[...new Set(sources.filter(s=>!value.state||(value.state==='__unspecified__'?!s.state:s.state===value.state)).map(s=>s.district))].sort().map(d=><option key={d}>{d}</option>)}</Select>
      <Select label={t('filterVillage')} value={value.village} onChange={e => onChange({...value,village:e.target.value})}><option value="">{t('allVillages')}</option>{[...new Set(sources.map(s=>s.village))].sort().map(v=><option key={v} value={v}>{v}</option>)}</Select>
      <Select label={t('filterCategory')} value={value.category} onChange={e => onChange({...value,category:e.target.value})}><option value="">{t('allCategories')}</option>{categories.map(c=><option key={c} value={c}>{t(c)}</option>)}</Select>
      <Select label={t('filterStatus')} value={value.status} onChange={e => onChange({...value,status:e.target.value as Filters['status']})}>{(['all','unmeasured','retests','followup','clear'] as const).map(status=><option key={status} value={status}>{t(({all:'allSources',unmeasured:'taskFirst',retests:'taskRetest',followup:'taskReview',clear:'noOpenWork'} as const)[status])}</option>)}</Select>
    </div><div className="field-actions"><p role="status">{t('matchingSources')}: {count} / {sources.length}</p><button type="button" onClick={()=>onChange({...emptySourceFilters})}>{t('clearSourceFilters')}</button></div>
  </section>;
}
