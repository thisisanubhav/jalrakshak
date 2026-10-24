import { useState } from 'react';
import { exclusion, type FieldMeasurement } from '@/field/model';
import { localDate } from '@/field/operations';
import { exclusionLabel, type Translate } from '@/field/i18n';
export function VisitTrend({measurements,t}:{measurements:FieldMeasurement[];t:Translate}){
  const [from,setFrom]=useState(''),[to,setTo]=useState('');
  if(!measurements.length)return null;
  const visits=[...measurements].filter(m=>{const day=localDate(new Date(m.measuredAt));return (!from||day>=from)&&(!to||day<=to);}).sort((a,b)=>a.measuredAt.localeCompare(b.measuredAt)||a.id.localeCompare(b.id));
  const start=visits.length?Date.parse(visits[0].measuredAt):0,end=visits.length?Date.parse(visits.at(-1)!.measuredAt):0;
  const max=Math.max(1,...visits.flatMap(m=>m.readings))*1.1;
  const x=(m:FieldMeasurement)=>end===start?340:75+(Date.parse(m.measuredAt)-start)/(end-start)*535;
  const y=(value:number)=>215-value/max*170;
  const eligible=(m:FieldMeasurement)=>!exclusion(m,m,m.rule,false)&&m.quality.representativeRawEcUsCm!==undefined;
  return <figure className="field-card visit-trend"><figcaption>{t('trend')}</figcaption><p>{t('chartHelp')}</p><p>{t('trendLegend')}</p><div className="field-grid no-print"><label>{t('dateRange')}<input type="date" value={from} max={to||undefined} onChange={e=>setFrom(e.target.value)} /></label><label>{t('dateRangeEnd')}<input type="date" value={to} min={from||undefined} onChange={e=>setTo(e.target.value)} /></label></div>
    {!visits.length?<p>{t('trendEmpty')}</p>:<><svg viewBox="0 0 680 275" role="img" aria-label={t('trend')}><title>{t('trend')}</title><desc>{t('trendLegend')}</desc><text x="8" y="20" fontSize="12">EC (µS/cm)</text>
      {[0,.25,.5,.75,1].map(part=><g key={part}><line x1="75" x2="610" y1={y(max*part)} y2={y(max*part)} stroke="#94a3b8" strokeDasharray="4 5"/><text x="65" y={y(max*part)+4} textAnchor="end" fontSize="11">{Math.round(max*part)}</text></g>)}
      {visits.map((m,index)=>{const value=m.quality.representativeRawEcUsCm,previous=visits[index-1],reason=exclusion(m,m,m.rule,false);return <g key={m.id}><title>{m.measuredAt}: {m.readings.join(' / ')} µS/cm — {reason?t(exclusionLabel(reason)):t(m.comparison.status)} {m.investigationId?t('retestMarker'):''}</title>
        {previous&&eligible(previous)&&eligible(m)&&!exclusion(m,previous,m.rule)&&<line x1={x(previous)} y1={y(previous.quality.representativeRawEcUsCm!)} x2={x(m)} y2={y(value!)} stroke="#245a76" strokeWidth="2"/>}
        {value!==undefined?<circle cx={x(m)} cy={y(value)} r="5" fill={reason?'#92400e':'#245a76'}/>:m.readings.map((v,i)=><path key={i} d={`M${x(m)-4},${y(v)-4}l8,8m0,-8l-8,8`} stroke="#92400e" strokeWidth="2"/>)}
        {m.investigationId&&(value!==undefined?[value]:m.readings).map((v,i)=><circle key={i} cx={x(m)} cy={y(v)} r="9" fill="none" stroke="#6b3fa0" strokeWidth="2"/>)}
      </g>;})}
      <text x="75" y="245" fontSize="11" textAnchor="start">{localDate(new Date(start))}</text><text x="610" y="245" fontSize="11" textAnchor="end">{localDate(new Date(end))}</text>
    </svg><div className="visit-trend-table"><table><caption>{t('rawReadings')}</caption><thead><tr><th>{t('measuredAt')}</th><th>EC (µS/cm)</th><th>{t('quality')}</th><th>{t('status')}</th></tr></thead><tbody>{visits.map(m=>{const reason=exclusion(m,m,m.rule,false);return <tr key={m.id}><td>{m.measuredAt}{m.investigationId&&<strong> · {t('retestMarker')}</strong>}{m.correctsMeasurementId&&<span> · {t('correctsVisit')}</span>}</td><td>{m.readings.join(' / ')}</td><td>{t(m.quality.status==='REPEATABLE'?'repeatable':'disagreement')}</td><td>{reason?`${t('excluded')}: ${t(exclusionLabel(reason))}`:t(m.comparison.status)}</td></tr>;})}</tbody></table></div></>}
  </figure>;
}
