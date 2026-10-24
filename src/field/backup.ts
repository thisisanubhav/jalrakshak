import { fieldDatabase } from "./workspace";
import { type JalRakshakDatabase } from '@/data/database';
import { type FieldData, validTime } from './model';
import { readField, validateFieldData } from './store';

export const MAX_BACKUP_BYTES = 50 * 1024 * 1024;
export interface FieldBackup {
  format: 'jalrakshak-field-backup'; version: 1; exportedAt: string; data: FieldData;
}
export class BackupError extends Error {
  constructor(public code: 'backupInvalid' | 'backupConflict' | 'backupTooLarge') { super(code); }
}
import { canonical } from "@/team/shared";
export function parseBackup(text: string): FieldBackup {
  if (new TextEncoder().encode(text).length > MAX_BACKUP_BYTES) throw new BackupError('backupTooLarge');
  try {
    const backup = JSON.parse(text) as FieldBackup;
    if (backup.format !== 'jalrakshak-field-backup' || backup.version !== 1 || !validTime(backup.exportedAt)) throw new Error('format');
    validateFieldData(backup.data, 'MANUAL_FIELD');
    return backup;
  } catch { throw new BackupError('backupInvalid'); }
}
export async function createBackup(database: JalRakshakDatabase = fieldDatabase()): Promise<FieldBackup> {
  return database.transaction('r', database.fieldSources, database.fieldMeasurements, database.fieldInvestigations, async () => {
    const data = await readField('MANUAL_FIELD', database);
    return { format: 'jalrakshak-field-backup', version: 1, exportedAt: new Date().toISOString(), data };
  });
}
export function planRestore(current: FieldData, incoming: FieldData) {
  validateFieldData(current, 'MANUAL_FIELD');
  validateFieldData(incoming, 'MANUAL_FIELD');
  const added: FieldData = { sources: [], measurements: [], investigations: [] };
  const merged: FieldData = { sources: [], measurements: [], investigations: [] };
  for (const key of ['sources', 'measurements', 'investigations'] as const) {
    const existing = new Map<string, unknown>(current[key].map(row => [row.id, row]));
    for (const row of incoming[key]) {
      const old = existing.get(row.id);
      if (old && canonical(old) !== canonical(row)) throw new BackupError('backupConflict');
    }
    // Each collection retains its own row type.
    Object.assign(added, { [key]: incoming[key].filter(row => !existing.has(row.id)) });
    Object.assign(merged, { [key]: [...current[key], ...added[key]] });
  }
  try { validateFieldData(merged, 'MANUAL_FIELD'); } catch { throw new BackupError('backupConflict'); }
  return { added, merged };
}
export async function restoreBackup(backup: FieldBackup, database: JalRakshakDatabase = fieldDatabase()) {
  // Revalidate at the write boundary, including changes since the preview.
  const checked = parseBackup(JSON.stringify(backup));
  return database.transaction('rw', database.fieldSources, database.fieldMeasurements, database.fieldInvestigations, async () => {
    const { added } = planRestore(await readField('MANUAL_FIELD', database), checked.data);
    // add (not put) also rejects collisions with records in another scope.
    await database.fieldSources.bulkAdd(added.sources);
    await database.fieldMeasurements.bulkAdd(added.measurements);
    await database.fieldInvestigations.bulkAdd(added.investigations);
    return added;
  });
}
