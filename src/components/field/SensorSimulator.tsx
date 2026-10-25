import { useEffect, useRef, useState } from 'react';
import type { Translate } from '@/field/i18n';
import { Esp32Decoder } from '@/sensors/esp32';
import { appendHistory, readingState, type SensorPoint } from '@/sensors/monitor';
import { SensorPreview } from './SensorPreview';
/** Deliberately has no capture callback, database, serial connection or network access. */
export function SensorSimulator({t}:{t:Translate}) {
  const [running,setRunning]=useState(false),[paused,setPaused]=useState(false),[stable,setStable]=useState(true),[invalid,setInvalid]=useState(false);
  const [point,setPoint]=useState<SensorPoint>(),[history,setHistory]=useState<SensorPoint[]>([]),[now,setNow]=useState(0);
  const decoder=useRef(new Esp32Decoder()),sequence=useRef(0);
  useEffect(()=>{
    if(!running)return;
    const timer=setInterval(()=>{
      const at=performance.now();setNow(at);
      if(paused)return;
      const n=++sequence.current;
      const packet={protocol:'jalrakshak.ec.v1',deviceId:'PRACTICE-ONLY',sessionId:'simulation',sequence:n,ecUsCm:stable?500+n%3:500+Math.round(Math.sin(n)*100),temperatureC:25,stable};
      const sample=decoder.current.push(JSON.stringify(packet)+'\n').samples[0];
      if(sample){const next={value:sample,at,receivedAt:new Date().toISOString()};setPoint(next);setHistory(old=>appendHistory(old,next));setInvalid(false);}
    },1000);
    return()=>clearInterval(timer);
  },[running,paused,stable]);
  function start(){decoder.current=new Esp32Decoder();sequence.current=0;setPoint(undefined);setHistory([]);setPaused(false);setInvalid(false);setRunning(true);}
  function badPacket(){decoder.current.push('invalid packet\n');setInvalid(true);setPoint(undefined);setPaused(true);}
  return <section className="sensor-simulator" aria-label={t('sensorPractice')}>
    <p>{t('sensorPracticeHelp')}</p>
    <div className="field-actions">
      {!running?<button type="button" onClick={start}>{t('sensorStart')}</button>:<>
        <button type="button" onClick={()=>{setRunning(false);setPoint(undefined);setHistory([]);setInvalid(false);}}>{t('sensorStop')}</button>
        <button type="button" onClick={()=>setPaused(p=>!p)}>{t(paused?'sensorResume':'sensorPause')}</button>
        <button type="button" onClick={()=>{setStable(s=>!s);setPoint(undefined);}}>{t(stable?'sensorSimUnstable':'sensorSimStable')}</button>
        <button type="button" onClick={badPacket}>{t('sensorSimInvalid')}</button>
      </>}
    </div>
    {!running?<p role="status">{t('sensorSimDisconnected')}</p>:<>
      <p><small>{t('sensorSimulated')}</small></p>
      {invalid&&<p role="status">{t('sensorInvalid')}</p>}
      <SensorPreview point={point} history={history} now={now} t={t}/>
      <p role="status">{t(readingState(point,now)==='stable'?'sensorSimEligible':'sensorSimBlocked')}</p>
    </>}
  </section>;
}
