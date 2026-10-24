/** JalRakshak serial protocol v1: raw (not temperature-compensated) EC, µS/cm. */
export interface Esp32Sample {
  protocol: 'jalrakshak.ec.v1'; deviceId: string; sessionId: string; sequence: number;
  ecUsCm: number; temperatureC: number; stable: boolean;
}
export interface SensorCapture extends Esp32Sample { slot: number; receivedAt: string; transport: 'USB_SERIAL' }
export function parseEsp32Sample(line: string): Esp32Sample {
  if (line.length > 1024) throw new Error('Invalid sensor packet');
  const s = JSON.parse(line);
  if (!s || s.protocol !== 'jalrakshak.ec.v1' ||
    ![s.deviceId, s.sessionId].every(v => typeof v === 'string' && /^[A-Za-z0-9._-]{1,64}$/.test(v)) ||
    !Number.isSafeInteger(s.sequence) || s.sequence < 0 ||
    typeof s.ecUsCm !== 'number' || !Number.isFinite(s.ecUsCm) || s.ecUsCm < 0 || s.ecUsCm > 200000 ||
    typeof s.temperatureC !== 'number' || !Number.isFinite(s.temperatureC) || s.temperatureC < -20 || s.temperatureC > 80 ||
    typeof s.stable !== 'boolean') throw new Error('Invalid sensor packet');
  return { protocol: s.protocol, deviceId: s.deviceId, sessionId: s.sessionId, sequence: s.sequence, ecUsCm: s.ecUsCm, temperatureC: s.temperatureC, stable: s.stable };
}
/** Bound memory, discard boot logs, reject truncated/oversized frames and replayed samples. */
export class Esp32Decoder {
  private buffer = ''; private dropping = false;
  private device = ''; private session = ''; private sequence = -1;
  push(text: string): { samples: Esp32Sample[]; rejected: boolean } {
    const samples: Esp32Sample[] = []; let rejected = false;
    for (const char of text) {
      if (char === '\n') {
        const line = this.buffer.trim(); this.buffer = '';
        if (this.dropping) { this.dropping = false; rejected = true; continue; }
        if (!line) continue;
        try {
          const sample = parseEsp32Sample(line);
          if (this.device && (sample.deviceId !== this.device || sample.sessionId !== this.session || sample.sequence <= this.sequence)) throw new Error('Reconnect after device restart');
          this.device = sample.deviceId; this.session = sample.sessionId; this.sequence = sample.sequence;
          samples.push(sample);
        } catch { rejected = true; }
      } else if (!this.dropping) {
        this.buffer += char;
        if (this.buffer.length > 1024) { this.buffer = ''; this.dropping = true; rejected = true; }
      }
    }
    return { samples, rejected };
  }
}
export interface SerialPortLike {
  readable: ReadableStream<Uint8Array> | null;
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
}
export interface SerialApi { requestPort(): Promise<SerialPortLike> }
export function serialApi(): SerialApi | undefined {
  return typeof navigator !== 'undefined' && isSecureContext ? (navigator as Navigator & { serial?: SerialApi }).serial : undefined;
}
export class Esp32Connection {
  private reader?: ReadableStreamDefaultReader<Uint8Array>;
  private stopped = false;
  private task?: Promise<void>;
  constructor(private port: SerialPortLike) {}
  async start(onSample: (sample: Esp32Sample) => void, onInvalid: () => void, onEnd: () => void) {
    await this.port.open({ baudRate: 115200 });
    if (this.stopped) { await this.port.close(); return; }
    if (!this.port.readable) { await this.port.close(); throw new Error('No readable serial stream'); }
    this.reader = this.port.readable.getReader();
    const decoder = new TextDecoder(); const frames = new Esp32Decoder();
    this.task = (async () => {
      try {
        while (!this.stopped) {
          const { value, done } = await this.reader!.read();
          if (done || this.stopped) break;
          const result = frames.push(decoder.decode(value, { stream: true }));
          if (result.rejected) onInvalid();
          for (const sample of result.samples) onSample(sample);
        }
      } catch { /* Unplug/read failure returns the UI to manual mode. */ }
      finally {
        this.reader?.releaseLock(); this.reader = undefined;
        try { await this.port.close(); } catch { /* Already unplugged. */ }
        onEnd();
      }
    })();
  }
  async stop() {
    this.stopped = true;
    try { await this.reader?.cancel(); } catch { /* Already unplugged. */ }
    await this.task;
  }
}
