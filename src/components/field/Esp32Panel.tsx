import { useEffect, useRef, useState } from 'react';
import { Esp32Connection, serialApi, type Esp32Sample, type SensorCapture } from '@/sensors/esp32';
import type { Translate } from '@/field/i18n';

export function Esp32Panel({ t, disabled, occupied, onCapture }: {
  t: Translate; disabled: boolean; occupied: boolean[]; onCapture: (capture: SensorCapture) => void;
}) {
  const connection = useRef<Esp32Connection | undefined>(undefined);
  const mounted = useRef(false); const connecting = useRef(false);
  const used = useRef(new Set<string>());
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'disconnected' | 'error' | 'unsupported' | 'invalid'>('idle');
  const [linked, setLinked] = useState(false);
  const [sample, setSample] = useState<{ value: Esp32Sample; at: number }>();
  const [now, setNow] = useState(0);
  useEffect(() => {
    mounted.current = true;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => { mounted.current = false; clearInterval(timer); void connection.current?.stop(); };
  }, []);
  async function connect() {
    if (connecting.current || connection.current) return;
    const api = serialApi();
    if (!api) { setStatus('unsupported'); return; }
    connecting.current = true; setStatus('connecting'); setSample(undefined);
    try {
      const port = await api.requestPort();
      if (!mounted.current) return;
      const current = new Esp32Connection(port); connection.current = current; setLinked(true);
      await current.start(value => {
        if (!mounted.current) return;
        setSample({ value, at: Date.now() }); setNow(Date.now()); setStatus('connected');
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
  const fresh = sample && now - sample.at <= 5000 && sample.value.stable;
  function capture(slot: number, capturedAt: number) {
    if (!sample || !fresh || used.current.has(key) || capturedAt - sample.at > 5000 || disabled || occupied[slot]) return;
    used.current.add(key);
    onCapture({ ...sample.value, slot, receivedAt: new Date(sample.at).toISOString(), transport: 'USB_SERIAL' });
    setSample(undefined);
  }
  return <section className="field-sensor" aria-label={t('sensorConnection')}>
    <h3>{t('sensorConnection')}</h3><p>{t('sensorHelp')}</p>
    <p role="status">{t(({ idle: 'sensorManual', connecting: 'sensorConnecting', connected: 'sensorConnected', disconnected: 'sensorDisconnected', error: 'sensorError', unsupported: 'sensorUnsupported', invalid: 'sensorInvalid' } as const)[status])}</p>
    <div className="field-actions">
      {!linked && <button type="button" disabled={disabled || status === 'connecting'} onClick={() => void connect()}>{t('sensorConnect')}</button>}
      {linked && <button type="button" onClick={() => void connection.current?.stop()}>{t('sensorDisconnect')}</button>}
    </div>
    {sample && <p><strong>{sample.value.ecUsCm} µS/cm · {sample.value.temperatureC} °C</strong> · {sample.value.deviceId} · {t(now - sample.at > 5000 ? 'sensorStale' : sample.value.stable ? 'sensorStable' : 'sensorUnstable')}</p>}
    {linked && <div className="field-actions">{(['sensorCapture1', 'sensorCapture2', 'sensorCapture3'] as const).map((label, slot) => <button key={label} type="button" disabled={disabled || !fresh || occupied[slot]} onClick={() => capture(slot, Date.now())}>{t(label)}</button>)}</div>}
    <p className="field-map-note">{t('sensorIndependent')}</p>
  </section>;
}
