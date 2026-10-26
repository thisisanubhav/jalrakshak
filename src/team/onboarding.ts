import { createHash, randomBytes, randomUUID, scryptSync } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { TeamError } from './server';
import type { TeamUser } from './shared';
import { validEmail } from '@/contact/shared';

export const tokenHash = (value: string) => createHash('sha256').update(value).digest('hex');
export class OnboardingStore {
  constructor(readonly pool: Pool) {}
  async transaction<T>(action: (client: PoolClient) => Promise<T>) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(67420126)');
      const result = await action(client);
      await client.query('COMMIT');
      return result;
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }
  async issue(email: string, actor?: TeamUser) {
    email = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!validEmail(email)) throw new TeamError(400, 'Enter a valid email address.');
    return this.transaction(async client => {
      if (actor) {
        const active = await client.query("SELECT id FROM users WHERE id=$1 AND organisation_id=$2 AND role='supervisor' AND active=1", [actor.id, actor.organisationId]);
        if (!active.rowCount) throw new TeamError(403, 'Supervisor access required.');
      }
      // Persistent, atomic limits apply across all serverless instances.
      await client.query('DELETE FROM onboarding_limits WHERE reset_at<$1', [Date.now()]);
      await client.query('DELETE FROM onboarding_tokens WHERE expires<$1', [Date.now()]);
      for (const [key, max] of [[`email:${tokenHash(email)}`, 3], ['global', 100]] as const) {
        const result = await client.query('INSERT INTO onboarding_limits(key,count,reset_at) VALUES($1,1,$2) ON CONFLICT(key) DO UPDATE SET count=onboarding_limits.count+1 RETURNING count', [key, Date.now()+3600_000]);
        if (result.rows[0].count > max) throw new TeamError(429, 'Too many requests. Try again later.');
      }
      if ((await client.query('SELECT id FROM users WHERE email=$1', [email])).rowCount) return undefined;
      const token = randomBytes(32).toString('hex');
      await client.query('INSERT INTO onboarding_tokens(token_hash,kind,email,organisation_id,inviter_id,expires) VALUES($1,$2,$3,$4,$5,$6)', [tokenHash(token), actor ? 'invite' : 'verify', email, actor?.organisationId ?? null, actor?.id ?? null, Date.now()+30*60_000]);
      return token;
    });
  }
  async discard(token: string) { await this.pool.query('DELETE FROM onboarding_tokens WHERE token_hash=$1', [tokenHash(token)]); }
  async inspect(token: string) {
    if (!/^[a-f0-9]{64}$/.test(token)) throw new TeamError(400, 'This link is invalid or expired.');
    const result = await this.pool.query("SELECT t.kind,t.email,o.name AS organisation FROM onboarding_tokens t LEFT JOIN organisations o ON o.id=t.organisation_id WHERE token_hash=$1 AND expires>$2 AND kind IN ('verify','invite','google-verified')", [tokenHash(token), Date.now()]);
    if (!result.rowCount) throw new TeamError(400, 'This link is invalid or expired.');
    return result.rows[0] as {kind: string; email: string; organisation?: string};
  }
  async complete(input: {token: string; username: string; name: string; password?: string; organisation?: string}) {
    const username = input.username?.trim().toLowerCase(), name = input.name?.trim();
    if (!/^[a-z0-9._-]{3,64}$/.test(username ?? '') || !name || name.length > 100) throw new TeamError(400, 'Enter your name and a username of 3–64 letters or numbers.');
    await this.inspect(input.token);
    return this.transaction(async client => {
      const result = await client.query('DELETE FROM onboarding_tokens WHERE token_hash=$1 AND expires>$2 RETURNING *', [tokenHash(input.token), Date.now()]);
      const proof = result.rows[0];
      if (!proof || !['verify','invite','google-verified'].includes(proof.kind)) throw new TeamError(400, 'This link is invalid or expired.');
      const password = proof.kind === 'google-verified' ? randomBytes(48).toString('hex') : input.password;
      if (typeof password !== 'string' || password.length < 12 || password.length > 256) throw new TeamError(400, 'Use a password of at least 12 characters.');
      let organisationId = proof.organisation_id;
      if (proof.kind === 'invite') {
        if (!(await client.query("SELECT id FROM users WHERE id=$1 AND organisation_id=$2 AND active=1 AND role='supervisor'", [proof.inviter_id, organisationId])).rowCount) throw new TeamError(400, 'This invitation is no longer available.');
      } else {
        const organisation = input.organisation?.trim();
        if (!organisation || organisation.length > 100) throw new TeamError(400, 'Enter an organisation name (up to 100 characters).');
        organisationId = randomUUID();
        await client.query('INSERT INTO organisations(id,name,created_at) VALUES($1,$2,$3)', [organisationId, organisation, new Date().toISOString()]);
      }
      if ((await client.query('SELECT id FROM users WHERE username=$1 OR email=$2', [username, proof.email])).rowCount) throw new TeamError(409, 'Username or email is already registered. Use another username or sign in.');
      const id = randomUUID(), salt = randomBytes(16).toString('hex');
      await client.query('INSERT INTO users(id,username,name,role,password,organisation_id,email,google_subject) VALUES($1,$2,$3,$4,$5,$6,$7,$8)', [id, username, name, proof.kind === 'invite' ? 'worker' : 'supervisor', `${salt}:${scryptSync(password,salt,64).toString('hex')}`, organisationId, proof.email, proof.kind === 'google-verified' ? proof.payload.subject : null]);
      await client.query('INSERT INTO audit(actor,action,at,detail,organisation_id) VALUES($1,$2,$3,$4,$5)', [id,'verified-signup',new Date().toISOString(),id,organisationId]);
      const token = randomBytes(32).toString('hex');
      await client.query('INSERT INTO sessions(token,user_id,expires) VALUES($1,$2,$3)', [tokenHash(token),id,Date.now()+12*3600_000]);
      return token;
    });
  }
}
