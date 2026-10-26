import { Pool } from 'pg';
import { PostgresTeamStore } from './postgres';
import { teamStore as sqliteStore, TeamError } from './server';

let hosted: PostgresTeamStore | undefined;
/** No connection at build time; production must never fall back to ephemeral SQLite. */
export function teamStore() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    if (process.env.VERCEL) throw new TeamError(503, 'Shared database is not configured.');
    return sqliteStore();
  }
  if (!hosted) {
    const url = new URL(connectionString);
    if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new TeamError(503, 'Invalid database configuration.');
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    // Enforce certificate verification for hosted connections regardless of URL options.
    for (const key of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert']) url.searchParams.delete(key);
    const pool = new Pool({connectionString:url.toString(), ssl:local && !process.env.VERCEL ? false : {rejectUnauthorized:true}, max:3, idleTimeoutMillis:10_000, connectionTimeoutMillis:10_000, statement_timeout:25_000, allowExitOnIdle:true});
    pool.on('error', () => { console.error('Hosted database connection interrupted.'); });
    hosted = new PostgresTeamStore(pool);
  }
  return hosted;
}
