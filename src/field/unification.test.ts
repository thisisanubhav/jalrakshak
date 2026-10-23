import 'fake-indexeddb/auto';
import { afterEach, expect, it } from 'vitest';
import { JalRakshakDatabase, resetDemoData } from '@/data/database';
import { loadFieldDemo, resetFieldDemo } from './demo';
import { defaultRule, type FieldSource, type MeasurementInput, type FieldData } from './model';
import { fieldOverview, hasCoordinates, matchesInvestigation, sourceMapSummary } from './overview';
import { appendInvestigationEvent, readField, saveFieldMeasurement, saveFieldSource } from './store';
const databases: JalRakshakDatabase[] = [];
function database() { const db = new JalRakshakDatabase(`unification-${crypto.randomUUID()}`); databases.push(db); return db; }
afterEach(async () => { for (const db of databases.splice(0)) await db.delete(); });
const source: FieldSource = { id: 'manual', code: 'M1', name: 'Field pump', scope: 'MANUAL_FIELD', village: 'Village', district: 'Khunti', location: '', category: 'HANDPUMP', operator: 'OP', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' };
const input: MeasurementInput = { id: 'visit', sourceId: source.id, scope: source.scope, measuredAt: '2026-01-02T00:00:00.000Z', readings: [600,604], temperature: 25, instrument: 'Meter', device: '', probe: '', calibrationDate: '2026-01-01', calibrationReference: '1413', method: 'DIRECT_SOURCE', operator: 'OP', notes: '' };
it('counts only linked records in the requested provenance scope', async () => {
  const db = database(); await saveFieldSource(source, undefined, db); await saveFieldMeasurement(input, defaultRule, db); await loadFieldDemo(db);
  const real = await readField('MANUAL_FIELD', db); const demo = await readField('SYNTHETIC_DEMO', db);
  const mixed: FieldData = { sources: [...real.sources,...demo.sources], measurements: [...real.measurements,...demo.measurements], investigations: [...real.investigations,...demo.investigations] };
  expect(fieldOverview(mixed,'MANUAL_FIELD').counts).toEqual({ sources:1,eligible:1,all:0,open:0,retests:0,followup:0,closed:0 });
  expect(fieldOverview(mixed,'SYNTHETIC_DEMO').counts).toEqual({ sources:4,eligible:3,all:3,open:2,retests:0,followup:2,closed:1 });
  expect(fieldOverview({...mixed,sources:[]},'SYNTHETIC_DEMO').counts.all).toBe(0);
});
it('updates counts and marker state after each follow-up transition', async () => {
  const db = database(); await loadFieldDemo(db); let data = await readField('SYNTHETIC_DEMO',db);
  const investigation = data.investigations.find(i => i.sourceId === 'field-demo-2')!;
  await appendInvestigationEvent(investigation.id, investigation.events.at(-1)!.id, { id:'request', at:new Date().toISOString(), state:'RETEST_REQUESTED', note:'Repeat visit', operator:'OP', finding:'UNDETERMINED' },db);
  data = await readField('SYNTHETIC_DEMO',db);
  expect(fieldOverview(data,'SYNTHETIC_DEMO').counts).toMatchObject({ retests:1,followup:1,open:2 });
  expect(sourceMapSummary(data,data.sources.find(s => s.id === 'field-demo-2')!).retestRequested).toBe(true);
  expect(sourceMapSummary(data,data.sources.find(s => s.id === 'field-demo-2')!).latest).toBeUndefined();
});
it('ignores a later excluded visit when choosing latest eligible map evidence', async () => {
  const db = database(); await saveFieldSource(source,undefined,db); await saveFieldMeasurement(input,defaultRule,db);
  await saveFieldMeasurement({...input,id:'later',measuredAt:'2026-01-03T00:00:00.000Z',calibrationDate:''},defaultRule,db);
  const data = await readField('MANUAL_FIELD',db);
  expect(sourceMapSummary(data,source).latest?.id).toBe('visit');
  expect(fieldOverview(data,'MANUAL_FIELD').counts.eligible).toBe(1);
});
it('never treats missing calibration as eligible history', async () => {
  const db = database(); await saveFieldSource(source,undefined,db); await saveFieldMeasurement({...input,calibrationReference:''},defaultRule,db);
  expect(fieldOverview(await readField('MANUAL_FIELD',db),'MANUAL_FIELD').counts.eligible).toBe(0);
});
it('accepts zero coordinates and rejects incomplete or non-finite pairs', () => {
  expect(hasCoordinates({...source,latitude:0,longitude:0})).toBe(true);
  for (const coordinates of [{latitude:1},{longitude:1},{latitude:91,longitude:1},{latitude:1,longitude:Infinity},{latitude:NaN,longitude:1}]) expect(hasCoordinates({...source,...coordinates})).toBe(false);
});
it('reset is atomic, idempotent and leaves manual sources and evidence byte-for-byte intact', async () => {
  const db = database(); await saveFieldSource(source,undefined,db); await saveFieldMeasurement(input,defaultRule,db); await loadFieldDemo(db);
  const before = JSON.stringify(await readField('MANUAL_FIELD',db));
  await resetFieldDemo(db); await resetFieldDemo(db);
  expect(await readField('SYNTHETIC_DEMO',db)).toEqual({sources:[],measurements:[],investigations:[]});
  expect(JSON.stringify(await readField('MANUAL_FIELD',db))).toBe(before);
  await loadFieldDemo(db); expect((await readField('SYNTHETIC_DEMO',db)).sources).toHaveLength(4);
});
it('rolls back a partial reset if the transaction fails', async () => {
  const db = database(); await loadFieldDemo(db); const before = await readField('SYNTHETIC_DEMO',db);
  await expect(db.transaction('rw',db.fieldSources,db.fieldMeasurements,db.fieldInvestigations, async () => { await resetFieldDemo(db); throw new Error('write failed'); })).rejects.toThrow('write failed');
  expect(await readField('SYNTHETIC_DEMO',db)).toEqual(before);
});
it('training databases and legacy reset cannot erase field records', async () => {
  const field = database(), training = database(); await saveFieldSource(source,undefined,field); await loadFieldDemo(field);
  await resetDemoData(training); await resetDemoData(field);
  expect((await readField('MANUAL_FIELD',field)).sources).toHaveLength(1);
  expect((await readField('SYNTHETIC_DEMO',field)).sources).toHaveLength(4);
  expect((await readField('MANUAL_FIELD',training)).sources).toHaveLength(0);
});
it('closed investigations never count as open or awaiting follow-up', async () => {
  const db = database(); await loadFieldDemo(db); const closed = (await readField('SYNTHETIC_DEMO',db)).investigations.find(i => i.state === 'CLOSED_UNCONFIRMED')!;
  expect(matchesInvestigation(closed,'closed')).toBe(true); expect(matchesInvestigation(closed,'open')).toBe(false); expect(matchesInvestigation(closed,'followup')).toBe(false);
});
