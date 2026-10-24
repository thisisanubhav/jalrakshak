"use client";
import { useCallback, useState } from 'react';
import { MapPin, LocateFixed } from 'lucide-react';
import type { FieldData, Scope } from '@/field/model';
import type { Translate } from '@/field/i18n';
import { hasCoordinates, sourceMapSummary } from '@/field/overview';
import { SourceMap } from '../SourceMap';
const colours={retest:'#a33c15',followup:'#6941a5',recorded:'#285b76',unmeasured:'#53616c'};
export function FieldMap({ data, scope, online, t, onOpen, onEdit }: {
  data: FieldData; scope: Scope; online: boolean; t: Translate; onOpen: (id: string) => void; onEdit:(id:string)=>void;
}) {
  const [failed, setFailed] = useState(false);
  const onError = useCallback(() => setFailed(true), []);
  const sources = data.sources.filter(s => s.scope === scope);
  const summaries = sources.map(source => {
    const summary=sourceMapSummary(data,source);
    const status=summary.retestRequested?'retest':summary.investigation&&!['RESOLVED','CLOSED_UNCONFIRMED'].includes(summary.investigation.state)?'followup':summary.latest?'recorded':'unmeasured';
    return {source,...summary,status:status as keyof typeof colours};
  });
  const label={retest:t('mapRetest'),followup:t('mapFollowup'),recorded:t('mapRecorded'),unmeasured:t('mapUnmeasured')};
  const reading=(latest:ReturnType<typeof sourceMapSummary>['latest'])=>latest?`${t('mapLatest')}: ${latest.quality.representativeRawEcUsCm} µS/cm · ${new Date(latest.measuredAt).toLocaleString()}`:t('mapUnmeasured');
  const markers = summaries.filter(({ source }) => hasCoordinates(source)).map(({ source, latest, investigation,status }) => ({
    id: source.id, title: `${source.code} · ${source.name}`, shortLabel:source.code, latitude: source.latitude!, longitude: source.longitude!,
    colour:colours[status], description: [`${source.village} · ${source.district}`, investigation ? t(investigation.state) : label[status],
      reading(latest),t(scope === 'MANUAL_FIELD' ? 'manual' : 'synthetic')],
  }));
  const missing=sources.length-markers.length;
  return <section className="field-map-workspace" aria-label={t('mapView')}>
    <header className="field-map-heading"><div><p className="field-map-eyebrow"><MapPin size={16} aria-hidden="true" />{t('mapView')}</p><h2>{t('mapTitle')}</h2><p>{t('mapIntro')}</p></div><div className="field-map-total"><strong>{markers.length}</strong><span>{t('mappedSources')} / {sources.length}</span></div></header>
    <div className="field-map-legend" aria-label={t('mapLegend')}><strong>{t('mapLegend')}</strong><ul>{(Object.keys(colours) as (keyof typeof colours)[]).map(status=><li key={status}><span style={{background:colours[status]}} aria-hidden="true" />{label[status]} <b>{summaries.filter(s=>s.status===status).length}</b></li>)}</ul></div>
    <div className="field-map-layout"><div className="field-map-stage">
      {online && !failed && markers.length > 0 ? <SourceMap markers={markers} label={t('mapView')} openLabel={t('history')} fitLabel={t('fitSources')} onOpen={onOpen} onError={onError} /> : <div className="field-map-empty"><LocateFixed size={40} aria-hidden="true" /><p role="status">{t('mapUnavailable')}</p>{!markers.length&&<p>{t('missingMapHelp')}</p>}</div>}
      <p className="field-map-note">{t('mapHelp')}</p>
      {missing>0&&<aside className="field-map-missing"><strong>{t('noCoordinates')}: {missing}</strong><p>{t('missingMapHelp')}</p></aside>}
    </div><aside className="field-map-directory"><h3>{t('mapDirectory')}</h3><p>{t('noCoordinates')}: {missing}</p>
      <ul className="field-map-list">{summaries.map(({ source, latest, investigation,status }) => <li className="field-card" key={source.id}>
        <div className="field-map-source-status"><span style={{background:colours[status]}} aria-hidden="true" />{investigation?t(investigation.state):label[status]}</div>
        <button type="button" onClick={() => onOpen(source.id)}>{source.code} · {source.name}</button>
        <p>{source.village} · {source.district}</p><p className="field-small">{hasCoordinates(source) ? `${source.latitude}, ${source.longitude}` : t('noCoordinates')}</p>
        <p className="field-small">{reading(latest)}</p>
        {!hasCoordinates(source)&&<button type="button" onClick={()=>onEdit(source.id)}>{t('addCoordinates')}</button>}
      </li>)}</ul>
    </aside></div>
  </section>;
}
