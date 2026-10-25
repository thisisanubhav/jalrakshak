"use client";
import { useCallback, useEffect, useState } from 'react';
import { MapPin, LocateFixed } from 'lucide-react';
import type { FieldData, Scope } from '@/field/model';
import type { Translate } from '@/field/i18n';
import { hasCoordinates, sourceMapSummary, sourceMapStatus } from '@/field/overview';
import { SourceMap, type SourceMarker } from '../SourceMap';
import { sourceMapLocation } from '@/field/map-location';
import { localDate, nextScheduledVisit } from '@/field/operations';
const symbols={retest:'↻',followup:'!',overdue:'◷',reviewed:'✓',recorded:'•',unmeasured:'—'};
const colours={retest:'#a33c15',followup:'#6941a5',overdue:'#8a4b08',reviewed:'#285b76',recorded:'#285b76',unmeasured:'#53616c'};
export function FieldMap({ data, scope, online, t, onOpen, onEdit, onRecord }: {
  data: FieldData; scope: Scope; online: boolean; t: Translate; onOpen: (id: string) => void; onEdit:(id:string)=>void; onRecord:(id:string)=>void;
}) {
  const [today,setToday]=useState(()=>localDate());
  useEffect(()=>{const update=()=>setToday(localDate());const timer=setInterval(update,60_000);addEventListener('focus',update);return()=>{clearInterval(timer);removeEventListener('focus',update);};},[]);
  const [failed, setFailed] = useState(false);
  const onError = useCallback(() => setFailed(true), []);
  const sources = data.sources.filter(s => s.scope === scope);
  const summaries = sources.map(source => {
    const summary=sourceMapSummary(data,source);
    const status=sourceMapStatus(data,source,today);
    return {source,position:sourceMapLocation(source),...summary,status};
  });
  const label={overdue:t('mapOverdue'),reviewed:t('mapReviewed'),retest:t('mapRetest'),followup:t('mapFollowup'),recorded:t('mapRecorded'),unmeasured:t('mapUnmeasured')};
  const reading=(latest:ReturnType<typeof sourceMapSummary>['latest'])=>latest?`${t('mapLatest')}: ${latest.quality.representativeRawEcUsCm} µS/cm · ${new Date(latest.measuredAt).toLocaleString()}`:t('mapUnmeasured');
  const nextVisit=(source:typeof sources[number])=>{const next=nextScheduledVisit(source,data.measurements);return next?`${t('mapNextVisit')}: ${new Date(next.date+'T12:00:00').toLocaleDateString(t('navHome')==='होम'?'hi-IN':'en-IN',{day:'numeric',month:'short',year:'numeric'})}`:t('mapNoVisit');};
  const markers:SourceMarker[]=[];
  const areaMarkers=new Map<string,SourceMarker>();
  for(const {source,position,latest,status} of summaries) {
    if(!position)continue;
    const title=`${source.code} · ${source.name}`;
    if(position.precision==='coordinates') {
      markers.push({id:source.id,title,shortLabel:source.code,...position,colour:colours[status],symbol:symbols[status],description:[t('mapGps'),`${source.village} · ${source.district} · ${source.state??''}`,`${symbols[status]} ${label[status]}`,reading(latest),nextVisit(source),t(scope==='MANUAL_FIELD'?'manual':'synthetic')]});
    } else {
      let marker=areaMarkers.get(position.key);
      if(!marker) {
        marker={id:source.id,title:position.area,latitude:position.latitude,longitude:position.longitude,colour:'#526779',approximate:true,maxZoom:position.precision==='district'?8:5,description:[t(position.precision==='district'?'mapAreaApproximate':'mapStateApproximate')],members:[]};
        areaMarkers.set(position.key,marker);markers.push(marker);
      }
      marker.members!.push({id:source.id,title,description:[`${symbols[status]} ${label[status]}`,reading(latest),nextVisit(source)]});
      marker.shortLabel=`≈ ${marker.members!.length}`;
    }
  }
  const mapped=summaries.filter(s=>s.position).length;
  const missing=sources.length-mapped;
  const noGps=sources.filter(s=>!hasCoordinates(s)).length;
  return <section id="field-map-workspace" className="field-map-workspace" aria-label={t('mapView')}>
    <header className="field-map-heading"><div><p className="field-map-eyebrow"><MapPin size={16} aria-hidden="true" />{t('mapView')}</p><h2>{t('mapTitle')}</h2><p>{t('mapIntro')}</p></div><div className="field-map-total"><strong>{mapped}</strong><span>{t('mappedSources')} / {sources.length}</span></div></header>
    <div className="field-map-legend" aria-label={t('mapLegend')}><strong>{t('mapLegend')}</strong><ul>{(Object.keys(colours) as (keyof typeof colours)[]).map(status=><li key={status}><span style={{background:colours[status]}} aria-hidden="true">{symbols[status]}</span>{label[status]} <b>{summaries.filter(s=>s.status===status).length}</b></li>)}</ul></div>
    <p className="field-map-accuracy"><span>● {t('mapGps')}</span><span>≈ {t('mapApproximate')}</span></p>
    <div className="field-map-layout"><div className="field-map-stage">
      {online && !failed && markers.length > 0 ? <SourceMap markers={markers} label={t('mapView')} openLabel={t('history')} fitLabel={t('fitSources')} onOpen={onOpen} onRecord={onRecord} recordLabel={t('recordVisit')} onError={onError} /> : <div className="field-map-empty"><LocateFixed size={40} aria-hidden="true" /><p role="status">{t(!sources.length?'empty':!markers.length?'mapNoCoordinates':'mapUnavailable')}</p>{missing>0&&<p>{t('missingMapHelp')}</p>}{online&&failed&&<button type="button" onClick={()=>setFailed(false)}>{t('retryMap')}</button>}</div>}
      <p className="field-map-note">{t('mapHelp')}</p>
      <p className="field-map-note">{t('mapAreaHelp')} <a href="https://github.com/datta07/INDIAN-SHAPEFILES" target="_blank" rel="noreferrer">{t('mapAreaCredit')}</a></p>
      {missing>0&&<aside className="field-map-missing"><strong>{t('noCoordinates')}: {noGps}</strong><p>{t('missingMapHelp')}</p></aside>}
    </div><aside className="field-map-directory"><h3>{t('mapDirectory')}</h3><p>{t('noCoordinates')}: {noGps}</p>
      <ul className="field-map-list">{summaries.map(({ source, position, latest,status }) => <li className="field-card" key={source.id}>
        <div className="field-map-source-status"><span style={{background:colours[status]}} aria-hidden="true">{symbols[status]}</span>{label[status]}</div>
        <button type="button" onClick={() => onOpen(source.id)}>{source.code} · {source.name}</button>
        <p>{source.village} · {source.district}</p><p className="field-small">{hasCoordinates(source) ? `${t('mapGps')}: ${source.latitude}, ${source.longitude}` : position ? `${t(position.precision==='district'?'mapAreaApproximate':'mapStateApproximate')} · ${position.area}` : t('noCoordinates')}</p>
        <p className="field-small">{reading(latest)}</p><p className="field-small">{nextVisit(source)}</p>
        <button type="button" onClick={()=>onRecord(source.id)}>{t('recordVisit')}</button>
        {!hasCoordinates(source)&&<button type="button" onClick={()=>onEdit(source.id)}>{t('addCoordinates')}</button>}
      </li>)}</ul>
    </aside></div>
  </section>;
}
