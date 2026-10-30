// PostgreSQL counterpart of TeamStore: keep authorization and evidence rules in parity.
import { Pool, type PoolClient } from 'pg';
import { AsyncLocalStorage } from 'node:async_hooks';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { publicActivityDetail, canonical, type TeamSnapshot, type TeamUser, type TeamRole, type TeamOverview } from './shared';
import type { FieldData } from '@/field/model';
import { validateFieldData } from '@/field/validation';
import { TeamError } from './server';
const digest = (text: string) => createHash('sha256').update(text).digest('hex');
const cleanUser = (row: Record<string, unknown>): TeamUser => ({ id: String(row.id), username: String(row.username), name: String(row.name), role: row.role as TeamRole, organisationId: String(row.organisation_id), ...(row.organisation_name ? { organisationName: String(row.organisation_name) } : {}) });

export class PostgresTeamStore {
  private context = new AsyncLocalStorage<PoolClient>();
  constructor(readonly pool: Pool) {}
  private async rows(sql: string, values: unknown[] = []): Promise<Record<string, unknown>[]> {
    return (await (this.context.getStore() ?? this.pool).query(sql, values)).rows;
  }
  private async one(sql: string, values: unknown[] = []) { return (await this.rows(sql, values))[0]; }
  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    if (this.context.getStore()) return fn();
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      // Serialize team mutations across serverless instances, including first-account setup.
      // READ COMMITTED sees the previous writer's committed state after acquiring the lock.
      await client.query('SELECT pg_advisory_xact_lock(67420126)');
      const result = await this.context.run(client, fn);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  }
  private organisation(actor: TeamUser) {
    if (!actor.organisationId) throw new TeamError(401, 'Sign in again to refresh organisation access.');
    return actor.organisationId;
  }
  private async requireActive(actor:TeamUser) {
    const current=await this.one('SELECT role FROM users WHERE id=$1 AND organisation_id=$2 AND active=1',[actor.id,this.organisation(actor)]);
    if(!current || current.role!==actor.role)throw new TeamError(401,'Account access changed. Sign in again.');
  }
  async log(actor: string, action: string, detail: string) { (await this.rows('INSERT INTO audit(actor,action,at,detail,organisation_id) SELECT $1,$2,$3,$4,organisation_id FROM users WHERE id=$1', [actor, action, new Date().toISOString(), detail])); }
  async hasUsers() { return Number((await this.one('SELECT COUNT(*) AS n FROM users', []))!.n) > 0; }
  async createUser(actor: TeamUser | null, username: string, name: string, password: string, role: TeamRole): Promise<TeamUser> {
    if (actor?.role !== 'supervisor' && (actor || await this.hasUsers())) throw new TeamError(403, 'Supervisor access required.');
    username = username?.trim().toLowerCase(); name = name?.trim();
    if (!/^[a-z0-9._-]{3,64}$/.test(username) || !name || name.length > 100 || typeof password !== 'string' || password.length < 12 || password.length > 256 || !['worker','supervisor'].includes(role)) throw new TeamError(400, 'Use a username of 3–64 letters/numbers, a name, and a password of at least 12 characters.');
    if (!actor) role = 'supervisor';
    const salt = randomBytes(16).toString('hex'); const hash = scryptSync(password, salt, 64).toString('hex');
    const user = { id: randomUUID(), username, name, role, organisationId: actor ? this.organisation(actor) : 'legacy' };
    return this.transaction(async () => {
      if(actor)await this.requireActive(actor);
      if (!actor && await this.hasUsers()) throw new TeamError(409, "Initial setup is already complete.");
      if ((await this.one('SELECT id FROM users WHERE username=$1', [username]))) throw new TeamError(409, 'Username already exists.');
      (await this.rows('INSERT INTO users(id,username,name,role,password,organisation_id) VALUES($1,$2,$3,$4,$5,$6)', [user.id,username,name,role,`${salt}:${hash}`,user.organisationId]));
      await this.log(actor?.id ?? user.id,'create-account',user.id); return {...user,organisationName:String((await this.one('SELECT name FROM organisations WHERE id=$1',[user.organisationId]))!.name)};
    });
  }
  private async loginAttempt(username: string, password: string) {
    if (typeof username !== 'string' || typeof password !== 'string' || username.length > 64 || password.length > 256) throw new TeamError(400, 'Invalid credentials.');
    username = username.trim().toLowerCase();
    const attempt = (await this.one('SELECT * FROM attempts WHERE username=$1', [username]));
    if (attempt && Number(attempt.count) >= 10 && Date.now() - Number(attempt.since) < 15 * 60_000) throw new TeamError(429, 'Too many attempts. Try again in 15 minutes.');
    const row = (await this.one('SELECT u.*,o.name AS organisation_name FROM users u JOIN organisations o ON o.id=u.organisation_id WHERE username=$1 AND active=1', [username]));
    const [salt, expected] = String(row?.password ?? `invalid:${'00'.repeat(64)}`).split(':');
    const match = timingSafeEqual(scryptSync(password,salt,64),Buffer.from(expected,'hex'));
    if (!row || !match) {
      const fresh = !attempt || Date.now() - Number(attempt.since) >= 15 * 60_000;
      (await this.rows('INSERT INTO attempts(username,count,since) VALUES($1,$2,$3) ON CONFLICT(username) DO UPDATE SET count=excluded.count,since=excluded.since', [username,fresh ? 1 : Number(attempt.count)+1,fresh ? Date.now() : Number(attempt.since)]));
      throw new TeamError(401, 'Username or password is incorrect.');
    }
    (await this.rows('DELETE FROM attempts WHERE username=$1', [username]));
    const token = randomBytes(32).toString('hex');
    (await this.rows('DELETE FROM sessions WHERE expires<$1', [Date.now()]));
    (await this.rows('INSERT INTO sessions(token,user_id,expires) VALUES($1,$2,$3)', [digest(token),row.id,Date.now()+12*60*60_000]));
    return { user: cleanUser(row), token };
  }
  async session(token: string): Promise<TeamUser> {
    const row = (await this.one('SELECT u.*,o.name AS organisation_name FROM users u JOIN organisations o ON o.id=u.organisation_id JOIN sessions s ON u.id=s.user_id WHERE s.token=$1 AND s.expires>$2 AND u.active=1', [digest(token),Date.now()]));
    if (!row) throw new TeamError(401, 'Sign in to continue.');
    return cleanUser(row);
  }
  async logout(token: string) { (await this.rows('DELETE FROM sessions WHERE token=$1', [digest(token)])); }
  async users(actor: TeamUser) { if (actor.role !== 'supervisor') throw new TeamError(403,'Supervisor access required.'); await this.requireActive(actor); return (await this.rows('SELECT id,username,name,role,active FROM users WHERE organisation_id=$1 ORDER BY username', [this.organisation(actor)])); }
  async overview(actor: TeamUser): Promise<TeamOverview> {
    if (actor.role !== 'supervisor') throw new TeamError(403,'Supervisor access required.');
    return this.transaction(async () => ({
      snapshot: await this.snapshot(actor),
      users: await this.users(actor) as unknown as TeamOverview['users'],
      activity: ((await this.rows('SELECT a.id, u.name AS "actorName", a.action, a.at, a.detail FROM audit a JOIN users u ON a.actor=u.id WHERE a.organisation_id=$1 ORDER BY a.id DESC LIMIT 200', [this.organisation(actor)])) as unknown as TeamOverview['activity']).map(row=>({...row,detail:publicActivityDetail(row.action,row.detail??'')})),
      at: new Date().toISOString(),
    }));
  }
  async snapshot(actor: TeamUser): Promise<TeamSnapshot> {
    if (!this.context.getStore()) return this.transaction(() => this.snapshot(actor));
    await this.requireActive(actor);
    const rows = actor.role === 'supervisor' ? (await this.rows('SELECT * FROM records WHERE organisation_id=$1 ORDER BY kind,id', [this.organisation(actor)])) : (await this.rows('SELECT r.* FROM records r JOIN assignments a ON r.source_id=a.source_id AND r.organisation_id=a.organisation_id WHERE a.user_id=$1 AND r.organisation_id=$2 ORDER BY r.kind,r.id', [actor.id,this.organisation(actor)]));
    const data: FieldData = { sources: [], measurements: [], investigations: [] };
    for (const row of rows) (data[row.kind as keyof FieldData] as unknown[]).push(JSON.parse(String(row.body)));
    const allAssignments = (await this.rows('SELECT * FROM assignments WHERE organisation_id=$1', [this.organisation(actor)]));
    const ids = new Set(data.sources.map(s => s.id));
    const assignments = Object.fromEntries(allAssignments.filter(r => ids.has(String(r.source_id))).map(r => [String(r.source_id),String(r.user_id)]));
    return { data, assignments, revision: digest(canonical({ data, assignments })) };
  }
  async sync(actor: TeamUser, revision: string, incoming: FieldData) {
    try { validateFieldData(incoming,'MANUAL_FIELD'); } catch { throw new TeamError(400,'Invalid field records.'); }
    return this.transaction(async () => {
      if(actor)await this.requireActive(actor);
      const current = await this.snapshot(actor);
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
          const existing = (await this.one('SELECT * FROM records WHERE kind=$1 AND id=$2 AND organisation_id=$3', [key,record.id,this.organisation(actor)]));
          const assignment = (await this.one('SELECT user_id FROM assignments WHERE source_id=$1 AND organisation_id=$2', [sourceId,this.organisation(actor)]));
          if (actor.role !== 'supervisor' && ((assignment && assignment.user_id !== actor.id) || (existing && !current.data[key].some(r => r.id === record.id)))) throw new TeamError(403,'This source is not assigned to you.');
          if (key === 'sources') {
            const source = record as FieldData['sources'][number];
            const before = existing ? JSON.parse(String(existing.body)) as typeof source : undefined;
            const oldChanges=before?.scheduleChanges??[],changes=source.scheduleChanges??[];
            if(canonical(changes.slice(0,oldChanges.length))!==canonical(oldChanges)||changes.length<oldChanges.length)throw new TeamError(409,'Schedule history cannot be rewritten.');
            if(actor.role!=='supervisor'&&canonical(changes)!==canonical(oldChanges))throw new TeamError(403,'Only supervisors can change schedule history.');
            const oldReviews = before?.visitReviews ?? [], reviews = source.visitReviews ?? [];
            if (canonical(reviews.slice(0,oldReviews.length)) !== canonical(oldReviews) || reviews.length < oldReviews.length) throw new TeamError(409,'Review evidence cannot be rewritten.');
            if (actor.role !== 'supervisor' && (canonical(reviews) !== canonical(oldReviews) || canonical(source.schedule) !== canonical(before?.schedule))) throw new TeamError(403,'Only supervisors can schedule visits or review records.');
            for (const review of reviews.slice(oldReviews.length)) {
              if (review.reviewerId !== actor.id || review.reviewerName !== actor.name) throw new TeamError(403,'Review attribution must match the signed-in supervisor.');
            }
            const duplicate = (await this.one("SELECT id FROM records WHERE kind='sources' AND (body::jsonb ->> 'code')=$1 AND id!=$2 AND organisation_id=$3", [(record as FieldData['sources'][number]).code,record.id,this.organisation(actor)]));
            if (duplicate) throw new TeamError(409,'Source identifier already exists in the team.');
            if (!assignment) (await this.rows('INSERT INTO assignments(source_id,user_id,organisation_id) VALUES($1,$2,$3)', [sourceId,actor.id,this.organisation(actor)]));
          }
          (await this.rows('INSERT INTO records(kind,id,source_id,body,organisation_id) VALUES($1,$2,$3,$4,$5) ON CONFLICT(organisation_id,kind,id) DO UPDATE SET body=excluded.body', [key,record.id,sourceId,JSON.stringify(record),this.organisation(actor)]));
        }
      }
      await this.log(actor.id,'sync',JSON.stringify({ sourceIds:[...new Set((['sources','measurements','investigations'] as const).flatMap(kind=>incoming[kind].filter(row=>canonical(row)!==canonical(current.data[kind].find(old=>old.id===row.id))).map(row=>'sourceId' in row?row.sourceId:row.id)))], sources:incoming.sources.length,measurements:incoming.measurements.length,investigations:incoming.investigations.length }));
      return await this.snapshot(actor);
    });
  }
  async assign(actor: TeamUser, sourceId: string, userId: string) {
    if (actor.role !== 'supervisor') throw new TeamError(403,'Supervisor access required.');
    return this.transaction(async () => {
      if(actor)await this.requireActive(actor);
      if (!(await this.one("SELECT id FROM records WHERE kind='sources' AND id=$1 AND organisation_id=$2", [sourceId,this.organisation(actor)])) || !(await this.one('SELECT id FROM users WHERE id=$1 AND active=1 AND organisation_id=$2', [userId,this.organisation(actor)]))) throw new TeamError(400,'Select an existing source and active account.');
      (await this.rows('INSERT INTO assignments(source_id,user_id,organisation_id) VALUES($1,$2,$3) ON CONFLICT(organisation_id,source_id) DO UPDATE SET user_id=excluded.user_id', [sourceId,userId,this.organisation(actor)]));
      await this.log(actor.id,'assign-source',JSON.stringify({sourceId,userId}));
    });
  }
  async assignMany(actor:TeamUser,sourceIds:string[],userId:string,expected:Record<string,string|undefined>) {
    if(actor.role!=='supervisor')throw new TeamError(403,'Supervisor access required.');
    if(!Array.isArray(sourceIds)||!sourceIds.length||sourceIds.length>500||sourceIds.some(id=>typeof id!=='string'||!id||id.length>200)||new Set(sourceIds).size!==sourceIds.length||typeof userId!=='string'||!expected||typeof expected!=='object'||Array.isArray(expected))throw new TeamError(400,'Select 1–500 distinct sources and an active worker.');
    return this.transaction(async ()=>{
      await this.requireActive(actor);
      if(!(await this.one("SELECT id FROM users WHERE id=$1 AND active=1 AND role='worker' AND organisation_id=$2", [userId,this.organisation(actor)])))throw new TeamError(400,'Select an active field worker.');
      for(const id of sourceIds){
        if(!(await this.one("SELECT id FROM records WHERE kind='sources' AND id=$1 AND organisation_id=$2", [id,this.organisation(actor)])))throw new TeamError(400,'A selected source no longer exists. Refresh the list.');
        const current=(await this.one('SELECT user_id FROM assignments WHERE source_id=$1 AND organisation_id=$2', [id,this.organisation(actor)]))?.user_id;
        if(current!==expected[id])throw new TeamError(409,'Assignments changed. Refresh and review your selection again. Nothing was changed.');
      }
      for(const sourceId of sourceIds){
        (await this.rows('INSERT INTO assignments(source_id,user_id,organisation_id) VALUES($1,$2,$3) ON CONFLICT(organisation_id,source_id) DO UPDATE SET user_id=excluded.user_id', [sourceId,userId,this.organisation(actor)]));
        await this.log(actor.id,'assign-source',JSON.stringify({sourceId,userId}));
      }
    });
  }
  async setActive(actor: TeamUser, userId: string, active: boolean) {
    if (actor.role !== 'supervisor') throw new TeamError(403,'Supervisor access required.');
    if (actor.id === userId) throw new TeamError(400,'You cannot disable your own account.');
    return this.transaction(async () => {
      if(actor)await this.requireActive(actor);
      const target=(await this.one('SELECT id FROM users WHERE id=$1 AND organisation_id=$2', [userId,this.organisation(actor)]));
      if (!target || typeof active !== 'boolean') throw new TeamError(400,'Invalid account.');
      (await this.rows('UPDATE users SET active=$1 WHERE id=$2 AND organisation_id=$3', [active?1:0,userId,this.organisation(actor)]));
      (await this.rows('DELETE FROM sessions WHERE user_id=$1', [userId]));
      await this.log(actor.id,active?'enable-account':'disable-account',userId);
    });
  }
  async resetPassword(actor: TeamUser, userId: string, password: string) {
    if (actor.role !== 'supervisor') throw new TeamError(403,'Supervisor access required.');
    if (typeof password !== 'string' || password.length < 12 || password.length > 256) throw new TeamError(400,'Use a password of at least 12 characters.');
    const salt = randomBytes(16).toString('hex'); const hash=scryptSync(password,salt,64).toString('hex');
    return this.transaction(async () => { await this.requireActive(actor);
      if (!(await this.one('SELECT id FROM users WHERE id=$1 AND organisation_id=$2',[userId,this.organisation(actor)]))) throw new TeamError(400,'Invalid account.');
      (await this.rows('UPDATE users SET password=$1 WHERE id=$2 AND organisation_id=$3', [`${salt}:${hash}`,userId,this.organisation(actor)])); (await this.rows('DELETE FROM sessions WHERE user_id=$1', [userId])); await this.log(actor.id,'reset-password',userId); });
  }
  async login(username: string, password: string) {
    const outcome = await this.transaction(async () => {
      try { return await this.loginAttempt(username, password); }
      catch (error) { if (error instanceof TeamError) return error; throw error; }
    });
    if (outcome instanceof TeamError) throw outcome;
    return outcome;
  }

}
