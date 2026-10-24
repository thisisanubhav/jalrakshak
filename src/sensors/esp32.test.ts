import { describe, expect, it, vi } from 'vitest';
import { Esp32Connection, Esp32Decoder, parseEsp32Sample, type SerialPortLike } from './esp32';
import { validateMeasurement, type MeasurementInput } from '@/field/model';
const sample = { protocol: 'jalrakshak.ec.v1', deviceId: 'ESP32-01', sessionId: 'boot-a', sequence: 1, ecUsCm: 501, temperatureC: 25, stable: true } as const;
const line = JSON.stringify(sample) + '\n';
describe('ESP32 serial protocol', () => {
  it('reassembles fragmented frames and multiple frames with CRLF', () => {
    const decoder = new Esp32Decoder();
    expect(decoder.push(line.slice(0, 20)).samples).toEqual([]);
    expect(decoder.push(line.slice(20) + JSON.stringify({ ...sample, sequence: 2 }) + '\r\n').samples.map(s => s.sequence)).toEqual([1, 2]);
  });
  it('ignores boot noise, bounds oversized frames, and recovers', () => {
    const decoder = new Esp32Decoder();
    expect(decoder.push('boot log\n' + 'x'.repeat(100000)).rejected).toBe(true);
    expect(decoder.push('\n' + line).samples).toEqual([sample]);
  });
  it.each([{ ecUsCm: '501' }, { ecUsCm: -1 }, { ecUsCm: 200001 }, { temperatureC: null }, { temperatureC: 81 }, { stable: 'true' }, { sequence: 1.5 }, { protocol: 'tds.ppm' }, { deviceId: '<script>' }])('rejects invalid data %j', patch => {
    expect(() => parseEsp32Sample(JSON.stringify({ ...sample, ...patch }))).toThrow();
  });
  it('rejects repeated packets, sequence rollback and changed device sessions until reconnect', () => {
    const decoder = new Esp32Decoder(); decoder.push(line);
    for (const patch of [{}, { sequence: 0 }, { sessionId: 'reboot' }, { deviceId: 'other' }]) {
      expect(decoder.push(JSON.stringify({ ...sample, ...patch }) + '\n')).toEqual({ samples: [], rejected: true });
    }
  });
  it('accepts unstable data for preview but never as saved capture evidence', () => {
    expect(parseEsp32Sample(JSON.stringify({ ...sample, stable: false })).stable).toBe(false);
    const input: MeasurementInput = { id: 'm', sourceId: 's', scope: 'MANUAL_FIELD', measuredAt: '2026-01-01T00:00:00.000Z', readings: [501, 502], instrument: 'meter', device: 'ESP32-01', probe: '', calibrationDate: '', calibrationReference: '', method: 'DIRECT_SOURCE', operator: 'op', notes: '', sensorCaptures: [{ ...sample, slot: 0, receivedAt: '2026-01-01T00:00:00.000Z', transport: 'USB_SERIAL' }] };
    expect(() => validateMeasurement(input)).not.toThrow();
    expect(() => validateMeasurement({ ...input, readings: [999, 502] })).toThrow();
    expect(() => validateMeasurement({ ...input, sensorCaptures: [{ ...input.sensorCaptures![0], stable: false }] })).toThrow();
    expect(() => validateMeasurement({ ...input, readings: [501,501], sensorCaptures: [input.sensorCaptures![0], { ...input.sensorCaptures![0], slot: 1 }] })).toThrow();
    expect(() => validateMeasurement({ ...input, sensorCaptures: undefined })).not.toThrow();
  });
  it('reads actual stream chunks and releases the port on disconnect', async () => {
    let stream!: ReadableStreamDefaultController<Uint8Array>;
    const port: SerialPortLike = { readable: new ReadableStream({ start(controller) { stream = controller; } }), open: vi.fn(async () => {}), close: vi.fn(async () => {}) };
    const connection = new Esp32Connection(port); const received = vi.fn(); const end = vi.fn();
    await connection.start(received, vi.fn(), end);
    stream.enqueue(new TextEncoder().encode(line));
    await vi.waitFor(() => expect(received).toHaveBeenCalledWith(sample));
    await connection.stop();
    expect(port.open).toHaveBeenCalledWith({ baudRate: 115200 });
    expect(port.readable?.locked).toBe(false); expect(port.close).toHaveBeenCalledOnce(); expect(end).toHaveBeenCalledOnce();
  });
  it('closes a connection that finishes opening after form unmount', async () => {
    let opened!: () => void;
    const port: SerialPortLike = { readable: null, open: () => new Promise(resolve => { opened = resolve; }), close: vi.fn(async () => {}) };
    const connection = new Esp32Connection(port);
    const start = connection.start(vi.fn(),vi.fn(),vi.fn()); await connection.stop(); opened(); await start;
    expect(port.close).toHaveBeenCalledOnce();
  });
});
