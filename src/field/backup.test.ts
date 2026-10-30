import 'fake-indexeddb/auto';
import { verifyBackupRestore } from './verify-backup';
import { activateWorkspace, closeWorkspace } from './workspace';
import Dexie from 'dexie';
import { afterEach, expect, it, vi } from 'vitest';
import { JalRakshakDatabase } from '@/data/database';
import { createBackup, parseBackup, planRestore, restoreBackup } from './backup';
import { defaultRule, type FieldSource, type MeasurementInput } from './model';
import { readField, saveFieldMeasurement, saveFieldSource } from './store';
import { loadFieldDemo } from './demo';
const databases: JalRakshakDatabase[] = [];
function database() { const d = new JalRakshakDatabase(`backup-${crypto.randomUUID()}`); databases.push(d); return d; }
afterEach(async () => { vi.restoreAllMocks(); for (const d of databases.splice(0)) await d.delete(); });
const source: FieldSource = { id: 'manual', code: 'M1', name: 'Pump', scope: 'MANUAL_FIELD', village: 'Village', district: 'Khunti', location: '', category: 'HANDPUMP', operator: 'OP', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', photo: 'data:image/png;base64,YQ==' };
const input: MeasurementInput = { id: 'visit', sourceId: source.id, scope: source.scope, measuredAt: '2026-01-02T00:00:00.000Z', readings: [600,900], temperature: 25, instrument: 'Meter', device: '', probe: '', calibrationDate: '2026-01-01', calibrationReference: '1413', method: 'DIRECT_SOURCE', operator: 'OP', notes: 'Retest on next visit' };
async function seed(d: JalRakshakDatabase) { await saveFieldSource(source, undefined, d); await saveFieldMeasurement(input, defaultRule, d); }
it('round-trips sources, photos, measurements and investigations into an empty device', async () => {
  const from = database(), to = database(); await seed(from);
  const backup = parseBackup(JSON.stringify(await createBackup(from)));
  await restoreBackup(backup, to);
  expect(await readField('MANUAL_FIELD', to)).toEqual(await readField('MANUAL_FIELD', from));
});
it('excludes training and leaves synthetic records untouched during restore', async () => {
  const from = database(), to = database(); await seed(from); await loadFieldDemo(from); await loadFieldDemo(to);
  const before = await readField('SYNTHETIC_DEMO', to);
  const backup = await createBackup(from); expect(backup.data.sources).toHaveLength(1);
  await restoreBackup(backup, to);
  expect(await readField('SYNTHETIC_DEMO', to)).toEqual(before);
});
it('restores identical files idempotently and keeps unrelated existing records', async () => {
  const from = database(), to = database(); await seed(from);
  await saveFieldSource({ ...source, id: 'other', code: 'M2' }, undefined, to);
  const backup = await createBackup(from); await restoreBackup(backup, to);
  const again = await restoreBackup(backup, to);
  expect(again).toEqual({ sources: [], measurements: [], investigations: [] });
  expect((await readField('MANUAL_FIELD', to)).sources).toHaveLength(2);
});
it('rejects changed matching records without overwriting newer device data', async () => {
  const from = database(), to = database(); await seed(from); const backup = await createBackup(from);
  await saveFieldSource({ ...source, name: 'Updated pump' }, undefined, to);
  const before = await readField('MANUAL_FIELD', to);
  await expect(restoreBackup(backup, to)).rejects.toMatchObject({ code: 'backupConflict' });
  expect(await readField('MANUAL_FIELD', to)).toEqual(before);
});
it('rechecks conflicts after preview and rejects source-code collisions', async () => {
  const from = database(), to = database(); await seed(from); const backup = await createBackup(from);
  expect(planRestore(await readField('MANUAL_FIELD', to), backup.data).added.sources).toHaveLength(1);
  await saveFieldSource({ ...source, id: 'new-id' }, undefined, to);
  await expect(restoreBackup(backup, to)).rejects.toMatchObject({ code: 'backupConflict' });
  expect(await to.fieldMeasurements.count()).toBe(0);
});
it('rejects corrupt, unsupported, synthetic, duplicate and broken-linked backups', async () => {
  const from = database(); await seed(from); const valid = await createBackup(from);
  const mutations = [
    { ...valid, version: 2 }, { ...valid, exportedAt: 'not-a-date' },
    { ...valid, data: { ...valid.data, sources: [] } },
    { ...valid, data: { ...valid.data, sources: [source, source] } },
    { ...valid, data: { ...valid.data, sources: [{ ...source, scope: 'SYNTHETIC_DEMO' }] } },
    { ...valid, data: { ...valid.data, measurements: [{ ...valid.data.measurements[0], quality: {} }] } },
  ];
  for (const invalid of mutations) expect(() => parseBackup(JSON.stringify(invalid))).toThrow();
  expect(() => parseBackup('{broken')).toThrow(); expect(() => parseBackup('null')).toThrow();
});
it('rolls back every collection when a write fails after sources were added', async () => {
  const from = database(), to = database(); await seed(from); const backup = await createBackup(from);
  vi.spyOn(to.fieldMeasurements, 'bulkAdd').mockRejectedValueOnce(new Error('storage full'));
  await expect(restoreBackup(backup, to)).rejects.toThrow('storage full');
  expect(await to.fieldSources.count()).toBe(0); expect(await to.fieldInvestigations.count()).toBe(0);
});
it('never overwrites an ID belonging to a different scope', async () => {
  const from = database(), to = database(); await seed(from); const backup = await createBackup(from);
  await to.fieldSources.add({ ...source, scope: 'SYNTHETIC_DEMO' });
  await expect(restoreBackup(backup, to)).rejects.toThrow();
  expect((await to.fieldSources.get(source.id))?.scope).toBe('SYNTHETIC_DEMO');
  expect(await to.fieldMeasurements.count()).toBe(0);
});

it('verifies a real restore without changing the active account or leaving a temporary database', async () => {
  const from=database(); await seed(from);
  const active=activateWorkspace(crypto.randomUUID()); databases.push(active);
  try {
    const backup=await createBackup(from);
    const before=await readField('MANUAL_FIELD',active);
    const result=await verifyBackupRestore(backup);
    expect(result).toMatchObject({sources:1,visits:1});
    expect(await readField('MANUAL_FIELD',active)).toEqual(before);
    expect((await Dexie.getDatabaseNames()).filter(name=>name.startsWith('jalrakshak-restore-check-'))).toEqual([]);
  } finally { closeWorkspace(); }
});
it('rejects invalid verification input without creating a temporary database', async () => {
  const from=database(); await seed(from);
  const backup=await createBackup(from); backup.data.measurements[0].sourceId='missing';
  await expect(verifyBackupRestore(backup)).rejects.toThrow();
  expect((await Dexie.getDatabaseNames()).filter(name=>name.startsWith('jalrakshak-restore-check-'))).toEqual([]);
});
