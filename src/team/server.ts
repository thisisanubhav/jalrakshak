// Only imported by Node route handlers and server-side tests.
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync, chmodSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { canonical, type TeamSnapshot, type TeamUser, type TeamRole, type TeamOverview } from './shared';
import type { FieldData } from '@/field/model';
import { validateFieldData } from '@/field/validation';

export class TeamError extends Error { constructor(public status: number, message: string) { super(message); } }
const digest = (text: string) => createHash('sha256').update(text).digest('hex');
const cleanUser = (row: Record<string, unknown>): TeamUser => ({ id: String(row.id), username: String(row.username), name: String(row.name), role: row.role as TeamRole });
export class TeamStore {
  sql: DatabaseSync;
  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    this.sql = new DatabaseSync(path);
    this.sql.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL, password TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1);
      CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS records(kind TEXT NOT NULL, id TEXT NOT NULL, source_id TEXT NOT NULL, body TEXT NOT NULL, PRIMARY KEY(kind,id));
      CREATE TABLE IF NOT EXISTS assignments(source_id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id));
      CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY, actor TEXT NOT NULL, action TEXT NOT NULL, at TEXT NOT NULL, detail TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS attempts(username TEXT PRIMARY KEY, count INTEGER NOT NULL, since INTEGER NOT NULL);`);
    if (path !== ':memory:') chmodSync(path, 0o600);
  }
  transaction<T>(fn: () => T): T { this.sql.exec('BEGIN IMMEDIATE'); try { const result = fn(); this.sql.exec('COMMIT'); return result; } catch (err) { this.sql.exec('ROLLBACK'); throw err; } }
  log(actor: string, action: string, detail: string) { this.sql.prepare('INSERT INTO audit(actor,action,at,detail) VALUES(?,?,?,?)').run(actor, action, new Date().toISOString(), detail); }
  hasUsers() { return Number(this.sql.prepare('SELECT COUNT(*) AS n FROM users').get()!.n) > 0; }
  createUser(actor: TeamUser | null, username: string, name: string, password: string, role: TeamRole): TeamUser {
    if (actor?.role !== 'supervisor' && (actor || this.hasUsers())) throw new TeamError(403, 'Supervisor access required.');
    username = username?.trim().toLowerCase(); name = name?.trim();
    if (!/^[a-z0-9._-]{3,64}$/.test(username) || !name || name.length > 100 || typeof password !== 'string' || password.length < 12 || password.length > 256 || !['worker','supervisor'].includes(role)) throw new TeamError(400, 'Use a username of 3–64 letters/numbers, a name, and a password of at least 12 characters.');
    if (!actor) role = 'supervisor';
    const salt = randomBytes(16).toString('hex'); const hash = scryptSync(password, salt, 64).toString('hex');
    const user = { id: randomUUID(), username, name, role };
    return this.transaction(() => {
      if (!actor && this.hasUsers()) throw new TeamError(409, "Initial setup is already complete.");
      if (this.sql.prepare('SELECT id FROM users WHERE username=?').get(username)) throw new TeamError(409, 'Username already exists.');
      this.sql.prepare('INSERT INTO users(id,username,name,role,password) VALUES(?,?,?,?,?)').run(user.id,username,name,role,`${salt}:${hash}`);
      this.log(actor?.id ?? user.id,'create-account',user.id); return user;
    });
  }
  login(username: string, password: string) {
    if (typeof username !== 'string' || typeof password !== 'string' || username.length > 64 || password.length > 256) throw new TeamError(400, 'Invalid credentials.');
    username = username.trim().toLowerCase();
    const attempt = this.sql.prepare('SELECT * FROM attempts WHERE username=?').get(username);
    if (attempt && Number(attempt.count) >= 10 && Date.now() - Number(attempt.since) < 15 * 60_000) throw new TeamError(429, 'Too many attempts. Try again in 15 minutes.');
    const row = this.sql.prepare('SELECT * FROM users WHERE username=? AND active=1').get(username);
    const [salt, expected] = String(row?.password ?? `invalid:${'00'.repeat(64)}`).split(':');
    const match = timingSafeEqual(scryptSync(password,salt,64),Buffer.from(expected,'hex'));
    if (!row || !match) {
      const fresh = !attempt || Date.now() - Number(attempt.since) >= 15 * 60_000;
      this.sql.prepare('INSERT OR REPLACE INTO attempts(username,count,since) VALUES(?,?,?)').run(username,fresh ? 1 : Number(attempt.count)+1,fresh ? Date.now() : Number(attempt.since));
      throw new TeamError(401, 'Username or password is incorrect.');
    }
    this.sql.prepare('DELETE FROM attempts WHERE username=?').run(username);
    const token = randomBytes(32).toString('hex');
    this.sql.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());
    this.sql.prepare('INSERT INTO sessions(token,user_id,expires) VALUES(?,?,?)').run(digest(token),row.id,Date.now()+12*60*60_000);
    return { user: cleanUser(row), token };
  }
  session(token: string): TeamUser {
    const row = this.sql.prepare('SELECT u.* FROM users u JOIN sessions s ON u.id=s.user_id WHERE s.token=? AND s.expires>? AND u.active=1').get(digest(token),Date.now());
    if (!row) throw new TeamError(401, 'Sign in to continue.');
    return cleanUser(row);
  }
  logout(token: string) { this.sql.prepare('DELETE FROM sessions WHERE token=?').run(digest(token)); }
  users(actor: TeamUser) { if (actor.role !== 'supervisor') throw new TeamError(403,'Supervisor access required.'); return this.sql.prepare('SELECT id,username,name,role,active FROM users ORDER BY username').all(); }
  overview(actor: TeamUser): TeamOverview {
    if (actor.role !== 'supervisor') throw new TeamError(403,'Supervisor access required.');
    return this.transaction(() => ({
      snapshot: this.snapshot(actor),
      users: this.users(actor) as unknown as TeamOverview['users'],
      activity: this.sql.prepare('SELECT a.id, u.name AS actorName, a.action, a.at FROM audit a JOIN users u ON a.actor=u.id ORDER BY a.id DESC LIMIT 20').all() as unknown as TeamOverview['activity'],
      at: new Date().toISOString(),
    }));
  }
  snapshot(actor: TeamUser): TeamSnapshot {
    const rows = actor.role === 'supervisor' ? this.sql.prepare('SELECT * FROM records ORDER BY kind,id').all() : this.sql.prepare('SELECT r.* FROM records r JOIN assignments a ON r.source_id=a.source_id WHERE a.user_id=? ORDER BY r.kind,r.id').all(actor.id);
    const data: FieldData = { sources: [], measurements: [], investigations: [] };
    for (const row of rows) (data[row.kind as keyof FieldData] as unknown[]).push(JSON.parse(String(row.body)));
    const allAssignments = this.sql.prepare('SELECT * FROM assignments').all();
    const ids = new Set(data.sources.map(s => s.id));
    const assignments = Object.fromEntries(allAssignments.filter(r => ids.has(String(r.source_id))).map(r => [String(r.source_id),String(r.user_id)]));
    return { data, assignments, revision: digest(canonical({ data, assignments })) };
  }
  sync(actor: TeamUser, revision: string, incoming: FieldData) {
    try { validateFieldData(incoming,'MANUAL_FIELD'); } catch { throw new TeamError(400,'Invalid field records.'); }
    return this.transaction(() => {
      const current = this.snapshot(actor);
      if (canonical(current.data) === canonical(incoming)) return current;
      if (current.revision !== revision) throw new TeamError(409,'Team records changed. Download a backup of pending work, then reload team records before reapplying your changes.');
      for (const key of ['sources','measurements','investigations'] as const) {
        const next = new Map(incoming[key].map(r => [r.id, r]));
        for (const old of current.data[key]) {
          const updated = next.get(old.id);
          if (!updated) throw new TeamError(409,'Existing records cannot be deleted by sync.');
          if (key === 'measurements' && canonical(old) !== canonical(updated)) throw new TeamError(409,'Saved measurements are immutable.');
          if (key === 'investigations') {
            const before = old as FieldData['investigations'][number], after = updated as typeof before;
            if (canonical({ ...before, events: [], state: '' }) !== canonical({ ...after, events: [], state: '' }) || canonical(after.events.slice(0,before.events.length)) !== canonical(before.events)) throw new TeamError(409,'Investigation evidence cannot be rewritten.');
          }
          if (key === 'sources' && (old as FieldData['sources'][number]).createdAt !== (updated as FieldData['sources'][number]).createdAt) throw new TeamError(409,'Source creation time cannot be rewritten.');
        }
        for (const record of incoming[key]) {
          const sourceId = key === 'sources' ? record.id : (record as {sourceId:string}).sourceId;
          const existing = this.sql.prepare('SELECT * FROM records WHERE kind=? AND id=?').get(key,record.id);
          const assignment = this.sql.prepare('SELECT user_id FROM assignments WHERE source_id=?').get(sourceId);
          if (actor.role !== 'supervisor' && ((assignment && assignment.user_id !== actor.id) || (existing && !current.data[key].some(r => r.id === record.id)))) throw new TeamError(403,'This source is not assigned to you.');
          if (key === 'sources') {
            const source = record as FieldData['sources'][number];
            const before = existing ? JSON.parse(String(existing.body)) as typeof source : undefined;
            const oldReviews = before?.visitReviews ?? [], reviews = source.visitReviews ?? [];
            if (canonical(reviews.slice(0,oldReviews.length)) !== canonical(oldReviews) || reviews.length < oldReviews.length) throw new TeamError(409,'Review evidence cannot be rewritten.');
            if (actor.role !== 'supervisor' && (canonical(reviews) !== canonical(oldReviews) || canonical(source.schedule) !== canonical(before?.schedule))) throw new TeamError(403,'Only supervisors can schedule visits or review records.');
            for (const review of reviews.slice(oldReviews.length)) {
              if (review.reviewerId !== actor.id || review.reviewerName !== actor.name) throw new TeamError(403,'Review attribution must match the signed-in supervisor.');
            }
            const duplicate = this.sql.prepare("SELECT id FROM records WHERE kind='sources' AND json_extract(body,'$.code')=? AND id!=?").get((record as FieldData['sources'][number]).code,record.id);
            if (duplicate) throw new TeamError(409,'Source identifier already exists in the team.');
            if (!assignment) this.sql.prepare('INSERT INTO assignments(source_id,user_id) VALUES(?,?)').run(sourceId,actor.id);
          }
          this.sql.prepare('INSERT INTO records(kind,id,source_id,body) VALUES(?,?,?,?) ON CONFLICT(kind,id) DO UPDATE SET body=excluded.body').run(key,record.id,sourceId,JSON.stringify(record));
        }
      }
      this.log(actor.id,'sync',JSON.stringify({ sources:incoming.sources.length,measurements:incoming.measurements.length,investigations:incoming.investigations.length }));
      return this.snapshot(actor);
    });
  }
  assign(actor: TeamUser, sourceId: string, userId: string) {
    if (actor.role !== 'supervisor') throw new TeamError(403,'Supervisor access required.');
    return this.transaction(() => {
      if (!this.sql.prepare("SELECT id FROM records WHERE kind='sources' AND id=?").get(sourceId) || !this.sql.prepare('SELECT id FROM users WHERE id=? AND active=1').get(userId)) throw new TeamError(400,'Select an existing source and active account.');
      this.sql.prepare('INSERT OR REPLACE INTO assignments(source_id,user_id) VALUES(?,?)').run(sourceId,userId);
      this.log(actor.id,'assign-source',JSON.stringify({sourceId,userId}));
    });
  }
  assignMany(actor:TeamUser,sourceIds:string[],userId:string,expected:Record<string,string|undefined>) {
    if(actor.role!=='supervisor')throw new TeamError(403,'Supervisor access required.');
    if(!Array.isArray(sourceIds)||!sourceIds.length||sourceIds.length>500||sourceIds.some(id=>typeof id!=='string'||!id||id.length>200)||new Set(sourceIds).size!==sourceIds.length||typeof userId!=='string'||!expected||typeof expected!=='object'||Array.isArray(expected))throw new TeamError(400,'Select 1–500 distinct sources and an active worker.');
    return this.transaction(()=>{
      if(!this.sql.prepare("SELECT id FROM users WHERE id=? AND active=1 AND role='worker'").get(userId))throw new TeamError(400,'Select an active field worker.');
      for(const id of sourceIds){
        if(!this.sql.prepare("SELECT id FROM records WHERE kind='sources' AND id=?").get(id))throw new TeamError(400,'A selected source no longer exists. Refresh the list.');
        const current=this.sql.prepare('SELECT user_id FROM assignments WHERE source_id=?').get(id)?.user_id;
        if(current!==expected[id])throw new TeamError(409,'Assignments changed. Refresh and review your selection again. Nothing was changed.');
      }
      for(const sourceId of sourceIds){
        this.sql.prepare('INSERT OR REPLACE INTO assignments(source_id,user_id) VALUES(?,?)').run(sourceId,userId);
        this.log(actor.id,'assign-source',JSON.stringify({sourceId,userId}));
      }
    });
  }
  setActive(actor: TeamUser, userId: string, active: boolean) {
    if (actor.role !== 'supervisor') throw new TeamError(403,'Supervisor access required.');
    if (actor.id === userId) throw new TeamError(400,'You cannot disable your own account.');
    this.transaction(() => {
      const target=this.sql.prepare('SELECT id FROM users WHERE id=?').get(userId);
      if (!target || typeof active !== 'boolean') throw new TeamError(400,'Invalid account.');
      this.sql.prepare('UPDATE users SET active=? WHERE id=?').run(active?1:0,userId);
      this.sql.prepare('DELETE FROM sessions WHERE user_id=?').run(userId);
      this.log(actor.id,active?'enable-account':'disable-account',userId);
    });
  }
  resetPassword(actor: TeamUser, userId: string, password: string) {
    if (actor.role !== 'supervisor') throw new TeamError(403,'Supervisor access required.');
    if (typeof password !== 'string' || password.length < 12 || password.length > 256) throw new TeamError(400,'Use a password of at least 12 characters.');
    const salt = randomBytes(16).toString('hex'); const hash=scryptSync(password,salt,64).toString('hex');
    this.transaction(() => { this.sql.prepare('UPDATE users SET password=? WHERE id=?').run(`${salt}:${hash}`,userId); this.sql.prepare('DELETE FROM sessions WHERE user_id=?').run(userId); this.log(actor.id,'reset-password',userId); });
  }
}
let singleton: TeamStore | undefined;
export function teamStore() { return singleton ??= new TeamStore(process.env.JALRAKSHAK_TEAM_DB ?? join(process.cwd(),'private-data','team.sqlite')); }
export function setupToken() {
  if (process.env.JALRAKSHAK_SETUP_TOKEN) return process.env.JALRAKSHAK_SETUP_TOKEN;
  if (process.env.VERCEL) throw new TeamError(503, 'Initial setup is not configured.');
  const folder=join(process.cwd(),'private-data'); mkdirSync(folder,{recursive:true,mode:0o700});
  const file=join(folder,'setup-key.txt');
  if (!existsSync(file)) { try { writeFileSync(file,randomBytes(24).toString('hex'),{mode:0o600,flag:'wx'}); } catch (err) { if (!existsSync(file)) throw err; } }
  return readFileSync(file,'utf8').trim();
}
