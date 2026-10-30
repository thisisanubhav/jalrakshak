import { JalRakshakDatabase } from '@/data/database';
import { canonical } from '@/team/shared';
import { parseBackup, restoreBackup, type FieldBackup } from './backup';
import { readField } from './store';

/** Exercise the real restore path in a disposable database, never the active account. */
export async function verifyBackupRestore(backup: FieldBackup) {
  const checked = parseBackup(JSON.stringify(backup));
  const database = new JalRakshakDatabase(`jalrakshak-restore-check-${crypto.randomUUID()}`);
  try {
    await restoreBackup(checked, database);
    const restored = await readField('MANUAL_FIELD', database);
    for (const kind of ['sources', 'measurements', 'investigations'] as const) {
      const ordered = (rows: {id: string}[]) => [...rows].sort((a,b) => a.id.localeCompare(b.id));
      if (canonical(ordered(restored[kind])) !== canonical(ordered(checked.data[kind]))) throw new Error('Backup restore verification failed');
    }
    return { checkedAt: new Date().toISOString(), sources: restored.sources.length, visits: restored.measurements.length, investigations: restored.investigations.length };
  } finally {
    database.close();
    await database.delete();
  }
}
