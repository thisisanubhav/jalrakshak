"use client";
import { useCallback, useState } from 'react';
import type { FieldData, Scope } from '@/field/model';
import type { Translate } from '@/field/i18n';
import { hasCoordinates, sourceMapSummary } from '@/field/overview';
import { SourceMap } from '../SourceMap';
export function FieldMap({ data, scope, online, t, onOpen }: {
  data: FieldData; scope: Scope; online: boolean; t: Translate; onOpen: (id: string) => void;
}) {
  const [failed, setFailed] = useState(false);
  const onError = useCallback(() => setFailed(true), []);
  const sources = data.sources.filter(s => s.scope === scope);
  const summaries = sources.map(source => ({ source, ...sourceMapSummary(data, source) }));
  const markers = summaries.filter(({ source }) => hasCoordinates(source)).map(({ source, latest, investigation }) => ({
    id: source.id, title: `${source.code} · ${source.name}`, latitude: source.latitude!, longitude: source.longitude!,
    colour: investigation?.state === 'RETEST_REQUESTED' ? '#9a3412' : investigation && !['RESOLVED', 'CLOSED_UNCONFIRMED'].includes(investigation.state) ? '#6d28d9' : '#334155',
    description: [`${source.village} · ${source.district}`, investigation ? t(investigation.state) : t('noInvestigations'),
      latest ? `${latest.measuredAt}: ${latest.quality.representativeRawEcUsCm} µS/cm` : t('baseline'), t(scope === 'MANUAL_FIELD' ? 'manual' : 'synthetic')],
  }));
  return <section aria-label={t('mapView')}>
    <p>{t('mapHelp')}</p><p>{t('noCoordinates')}: {sources.length - markers.length}</p>
    {online && !failed && markers.length > 0 ? <SourceMap markers={markers} label={t('mapView')} openLabel={t('history')} onOpen={onOpen} onError={onError} /> : <p role="status">{t('mapUnavailable')}</p>}
    <ul className="field-map-list">{summaries.map(({ source, latest, investigation }) => <li className="field-card" key={source.id}>
      <button type="button" onClick={() => onOpen(source.id)}>{source.code} · {source.name}</button>
      <p>{source.village} · {source.district}</p><p>{hasCoordinates(source) ? `${source.latitude}, ${source.longitude}` : t('noCoordinates')}</p>
      <p>{investigation ? t(investigation.state) : t('noInvestigations')}</p>
      <p>{latest ? `${latest.measuredAt}: ${latest.quality.representativeRawEcUsCm} µS/cm` : t('baseline')}</p>
    </li>)}</ul>
  </section>;
}
