import { House, Map, ListChecks, ChartColumn } from 'lucide-react';
import type { Translate } from '@/field/i18n';
export type FieldDestination = 'home' | 'map' | 'tests' | 'dashboard';
const destinations = [
  { id: 'home', label: 'navHome', icon: House },
  { id: 'map', label: 'navMap', icon: Map },
  { id: 'tests', label: 'navTests', icon: ListChecks },
  { id: 'dashboard', label: 'navDashboard', icon: ChartColumn },
] as const;
export function FieldNavigation({ current, t, onNavigate }: { current: FieldDestination; t: Translate; onNavigate: (destination: FieldDestination) => void }) {
  return <nav className="field-primary-nav no-print" aria-label={t('primaryNavigation')}>
    {destinations.map(({ id, label, icon: Icon }) => <button key={id} type="button" aria-current={current === id ? 'page' : undefined} onClick={() => onNavigate(id)}><Icon size={20} aria-hidden="true" /><span>{t(label)}</span></button>)}
  </nav>;
}
