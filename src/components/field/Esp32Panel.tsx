import { useEffect, useRef, useState } from 'react';
import { Esp32Connection, serialApi, type SensorCapture } from '@/sensors/esp32';
import { SensorPreview } from './SensorPreview';
import { SensorSimulator } from './SensorSimulator';
import { appendHistory, captureAllowed, type SensorPoint } from '@/sensors/monitor';
import type { Translate } from '@/field/i18n';

export function Esp32Panel({ t, disabled, occupied, onCapture }: {
  t: Translate; disabled: boolean; occupied: boolean[]; onCapture: (capture: SensorCapture) => void;
}) {
  const connection = useRef<Esp32Connection | undefined>(undefined);
  const mounted = useRef(false); const connecting = useRef(false);
  const used = useRef(new Set<string>());
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'disconnected' | 'error' | 'unsupported' | 'invalid'>('idle');
  const [linked, setLinked] = useState(false);
  const [sample, setSample] = useState<SensorPoint>();
  const [history,setHistory]=useState<SensorPoint[]>([]);
  const [practice,setPractice]=useState(false);
  const [capturedKey,setCapturedKey]=useState('');
  const [usedKeys,setUsedKeys]=useState<Set<string>>(()=>new Set());
  const [now, setNow] = useState(0);
  useEffect(() => {
    mounted.current = true;
    const timer = setInterval(() => setNow(performance.now()), 1000);
    return () => { mounted.current = false; clearInterval(timer); void connection.current?.stop(); };
  }, []);
  async function connect() {
    if (connecting.current || connection.current) return;
    const api = serialApi();
    if (!api) { setStatus('unsupported'); return; }
    connecting.current = true; setStatus('connecting'); setSample(undefined);setHistory([]);setCapturedKey('');
    try {
      const port = await api.requestPort();
      if (!mounted.current) return;
      const current = new Esp32Connection(port); connection.current = current; setLinked(true);
      await current.start(value => {
        if (!mounted.current) return;
        const point={value,at:performance.now(),receivedAt:new Date().toISOString()};
        setSample(point);setHistory(old=>appendHistory(old,point));setNow(point.at);setStatus('connected');
      }, () => { if (mounted.current) { setSample(undefined); setStatus('invalid'); } }, () => {
        if (connection.current === current) connection.current = undefined;
        if (mounted.current) { setLinked(false); setSample(undefined); setStatus('disconnected'); }
      });
      if (mounted.current && connection.current === current) setStatus('connected');
    } catch (error) {
      connection.current = undefined;
      if (mounted.current) setLinked(false);
      if (mounted.current) setStatus(error instanceof DOMException && error.name === 'NotFoundError' ? 'idle' : 'error');
    } finally { connecting.current = false; }
  }
  const key = sample ? `${sample.value.deviceId}/${sample.value.sessionId}/${sample.value.sequence}` : '';
  const fresh = captureAllowed(sample,now,linked,usedKeys.has(key),false,disabled);
  function capture(slot: number, capturedAt: number) {
    if (!sample || !captureAllowed(sample,capturedAt,linked,used.current.has(key),!!occupied[slot],disabled)) return;
    used.current.add(key);setUsedKeys(new Set(used.current));
    onCapture({ ...sample.value, slot, receivedAt: sample.receivedAt, transport: 'USB_SERIAL' });
    setCapturedKey(key);
  }
  return <section className="field-sensor" aria-label={t('sensorConnection')}>
    <h3>{t('sensorConnection')}</h3><p>{t('sensorHelp')}</p>
    <p role="status">{t(({ idle: 'sensorManual', connecting: 'sensorConnecting', connected: sample?'sensorReady':'sensorConnected', disconnected: 'sensorDisconnected', error: 'sensorError', unsupported: 'sensorUnsupported', invalid: 'sensorInvalid' } as const)[status])}</p>
    <div className="field-actions">
      {!linked && <button type="button" disabled={disabled || status === 'connecting'} onClick={() => void connect()}>{t('sensorConnect')}</button>}
      {linked && <button type="button" onClick={() => void connection.current?.stop()}>{t('sensorDisconnect')}</button>}
    </div>
    {linked&&<SensorPreview point={sample} history={history} now={now} t={t}/>}
    {sample&&capturedKey===key&&<p role="status">{t('sensorConsumed')}</p>}
    {linked && <div className="field-actions">{(['sensorCapture1', 'sensorCapture2', 'sensorCapture3'] as const).map((label, slot) => <button key={label} type="button" disabled={disabled || !fresh || occupied[slot]} onClick={() => capture(slot, performance.now())}>{t(label)}</button>)}</div>}
    {linked&&<p className="field-map-note">{t('sensorIndependent')}</p>}
    <details onToggle={event=>setPractice(event.currentTarget.open)}><summary>{t('sensorPractice')}</summary>{practice&&<SensorSimulator t={t}/>}</details>
  </section>;
}
