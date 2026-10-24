import { DatabaseSync, backup } from 'node:sqlite';
import { mkdirSync, existsSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import console from 'node:console';
const source = process.env.JALRAKSHAK_TEAM_DB ?? join(process.cwd(), 'private-data', 'team.sqlite');
if (!existsSync(source)) throw new Error('No team database exists yet. Complete supervisor setup first.');
const directory = join(process.cwd(), 'private-data', 'backups');
mkdirSync(directory, { recursive: true, mode: 0o700 });
const target = join(directory, `team-${new Date().toISOString().replace(/[:.]/g, '-')}.sqlite`);
const database = new DatabaseSync(source, { readOnly: true });
try {
  await backup(database, target);
  chmodSync(target, 0o600);
  console.log(`Team database backup saved: ${target}`);
  console.log('Contains accounts and field records. Keep a private copy on separate storage.');
} finally { database.close(); }
