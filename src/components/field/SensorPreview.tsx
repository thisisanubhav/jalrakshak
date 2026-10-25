import type { Translate } from '@/field/i18n';
import { chartSegments, readingState, type SensorPoint } from '@/sensors/monitor';
export function SensorPreview({point,history,now,t}:{point?:SensorPoint;history:SensorPoint[];now:number;t:Translate}) {
  const state=readingState(point,now);
  const low=Math.min(...history.map(p=>p.value.ecUsCm)),high=Math.max(...history.map(p=>p.value.ecUsCm));
  const padding=Math.max(1,(high-low)*.1),min=low-padding,max=high+padding;
  const start=history[0]?.at??0,end=history.at(-1)?.at??start;
  const x=(p:SensorPoint)=>48+(p.at-start)/Math.max(1000,end-start)*500;
  const y=(p:SensorPoint)=>140-(p.value.ecUsCm-min)/(max-min)*115;
  return <div className="sensor-preview" aria-label={t('sensorPreview')}>
    <dl className="sensor-device-facts">
      <div><dt>{t('sensorDevice')}</dt><dd>{point?.value.deviceId??'—'}</dd></div>
      <div><dt>{t('sensorProtocol')}</dt><dd>{point?.value.protocol??'—'}</dd></div>
      <div><dt>{t('sensorLastReceived')}</dt><dd>{point?`${new Date(point.receivedAt).toLocaleTimeString()} · ${Math.max(0,Math.floor((now-point.at)/1000))} s`:'—'}</dd></div>
    </dl>
    <p className="sensor-reading-status" role="status">{t(({waiting:'sensorWaiting',stale:'sensorStale',stable:'sensorStable',unstable:'sensorUnstable'} as const)[state])}</p>
    {point&&<p className="sensor-live-value"><strong>{point.value.ecUsCm} µS/cm</strong> · {point.value.temperatureC} °C</p>}
    {history.length>0&&<figure className="sensor-live-chart">
      <figcaption>{t('sensorChart')}</figcaption>
      <svg viewBox="0 0 580 180" role="img" aria-label={`${t('sensorChart')}: ${low}–${high} µS/cm`}>
        <path d="M48 18V140H550" fill="none" stroke="currentColor" opacity=".3"/>
        <text x="44" y="30" textAnchor="end">{max.toFixed(1)}</text><text x="44" y="140" textAnchor="end">{min.toFixed(1)}</text>
        <text x="48" y="165">0 s</text><text x="550" y="165" textAnchor="end">{Math.round((end-start)/1000)} s</text>
        {chartSegments(history).map((segment,i)=><polyline key={i} points={segment.map(p=>`${x(p)},${y(p)}`).join(' ')} fill="none" stroke="#245a76" strokeWidth="2"/>)}
        {history.map(p=><circle key={`${p.value.sessionId}/${p.value.sequence}`} cx={x(p)} cy={y(p)} r="3" fill={p.value.stable?'#245a76':'#b45c20'}><title>#{p.value.sequence} · {p.value.ecUsCm} µS/cm · {p.value.temperatureC} °C</title></circle>)}
      </svg>
      <p className="field-small">{t('sensorChartHelp')}</p>
    </figure>}
  </div>;
}
