'use client';
import { createContext, useContext } from 'react';
import { canonical, type TeamSnapshot } from '@/team/shared';
import type { FieldData, FieldMeasurement } from '@/field/model';
import type { Translate } from '@/field/i18n';

export const WorkflowContext = createContext<{
  snapshot?: TeamSnapshot; syncing: boolean; failed: boolean; conflict: boolean; retry: () => void;
} | undefined>(undefined);

export function VisitSyncStatus({ visit, t }: { visit: FieldMeasurement; t: Translate }) {
  const sync = useContext(WorkflowContext);
  const hi = t('navHome') === 'होम';
  const label = (en: string, hindi: string) => hi ? hindi : en;
  if (!sync || visit.scope !== 'MANUAL_FIELD') return null;
  const confirmed = sync.snapshot?.data.measurements.find(row => row.id === visit.id);
  const matched = !!confirmed && canonical(confirmed) === canonical(visit);
  const state = matched ? 'confirmed' : sync.syncing ? 'syncing' : sync.conflict ? 'conflict' : sync.failed ? 'failed' : 'local';
  const message = {
    confirmed: label('Synced to your team', 'टीम से सिंक है'),
    syncing: label('Syncing this visit…', 'यह विज़िट सिंक हो रही है…'),
    conflict: label('Saved on this device · review sync conflict', 'डिवाइस पर सुरक्षित · सिंक विवाद की समीक्षा करें'),
    failed: label('Saved on this device · sync not confirmed', 'डिवाइस पर सुरक्षित · सिंक की पुष्टि नहीं हुई'),
    local: label('Saved on this device · waiting to sync', 'डिवाइस पर सुरक्षित · सिंक की प्रतीक्षा'),
  }[state];
  return <div className={`visit-sync-status no-print visit-sync-${state}`} data-testid="visit-sync-status">
    <span role="status">{message}</span>
    {!matched && <button type="button" disabled={sync.syncing || sync.conflict} onClick={sync.retry}>{label('Retry sync', 'फिर सिंक करें')}</button>}
  </div>;
}

export function GettingStarted({ data, t, onRegister, onTeam, onSchedule }: {
  data: FieldData; t: Translate; onRegister: () => void; onTeam?: () => void; onSchedule: () => void;
}) {
  const sync = useContext(WorkflowContext);
  const hi = t('navHome') === 'होम', label = (en: string, hindi: string) => hi ? hindi : en;
  const sources = data.sources.filter(s => s.scope === 'MANUAL_FIELD');
  const assigned = sources.some(s => sync?.snapshot?.assignments[s.id]);
  const scheduled = sources.some(s => s.schedule);
  const recorded = data.measurements.some(m => m.scope === 'MANUAL_FIELD');
  if (assigned && scheduled && recorded) return null;
  const steps = [
    {done: sources.length > 0, title: label('Register your first source', 'पहला स्रोत दर्ज करें'), action: onRegister},
    {done: assigned, title: label('Invite a worker and assign a synced source', 'कर्मचारी आमंत्रित करें और सिंक स्रोत सौंपें'), action: onTeam},
    {done: scheduled, title: label('Set a visit date', 'विज़िट की तारीख तय करें'), action: onSchedule},
    {done: recorded, title: label('Worker saves a visit, then syncs for review', 'कर्मचारी विज़िट सहेजे और समीक्षा के लिए सिंक करे')},
  ];
  return <section className="field-card getting-started" aria-label={label('Set up your field team', 'अपनी फ़ील्ड टीम तैयार करें')}>
    <h2>{label('Set up your field team', 'अपनी फ़ील्ड टीम तैयार करें')}</h2>
    <p>{label('Your organisation is ready. Complete these next steps.', 'आपका संगठन तैयार है। अब ये चरण पूरे करें।')}</p>
    <ol>{steps.map((step, index) => <li key={step.title}><span aria-hidden="true">{step.done ? '✓' : index + 1}</span><span>{step.title}{step.done && <small> · {label('Done', 'पूर्ण')}</small>}</span>{!step.done && step.action && <button type="button" onClick={step.action}>{label('Open', 'खोलें')}</button>}</li>)}</ol>
  </section>;
}
