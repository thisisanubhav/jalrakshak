import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { OnboardingStore, tokenHash } from './onboarding';
import { TeamError } from './server';
import type { TeamUser } from './shared';
import { validEmail } from '@/contact/shared';

export class RecoveryEmailStore extends OnboardingStore {
  async status(actor: TeamUser) {
    const row = (await this.pool.query('SELECT email,google_subject FROM users WHERE id=$1 AND organisation_id=$2 AND active=1', [actor.id,actor.organisationId])).rows[0];
    if (!row) throw new TeamError(401,'Sign in to continue.');
    return {email:row.email as string|null,google:!!row.google_subject};
  }
  async request(actor: TeamUser, email: string, password: string) {
    email = typeof email==='string' ? email.trim().toLowerCase() : '';
    if (!validEmail(email) || typeof password!=='string' || password.length>256) throw new TeamError(400,'Check your email and current password.');
    // Return expected errors so failed password attempts remain rate-limited after commit.
    const outcome = await this.transaction(async client => {
      await client.query('DELETE FROM onboarding_limits WHERE reset_at<$1',[Date.now()]);
      for (const [key,max] of [[`recovery-email-user:${actor.id}`,5],[`email:${tokenHash(email)}`,3],['global',100]] as const) {
        const limit=(await client.query('INSERT INTO onboarding_limits(key,count,reset_at) VALUES($1,1,$2) ON CONFLICT(key) DO UPDATE SET count=onboarding_limits.count+1 RETURNING count',[key,Date.now()+3600_000])).rows[0];
        if(limit.count>max) return new TeamError(429,'Too many requests. Try again in an hour.');
      }
      const row=(await client.query('SELECT email,password,google_subject FROM users WHERE id=$1 AND organisation_id=$2 AND active=1',[actor.id,actor.organisationId])).rows[0];
      if(!row) return new TeamError(401,'Sign in to continue.');
      if(row.google_subject) return new TeamError(400,'Use Google to manage access to this account.');
      const [salt,hash]=row.password.split(':');
      if(!timingSafeEqual(scryptSync(password,salt,64),Buffer.from(hash,'hex'))) return new TeamError(400,'Check your email and current password.');
      if(row.email===email || (await client.query('SELECT id FROM users WHERE email=$1',[email])).rowCount) return new TeamError(400,'This email cannot be used. Choose another address.');
      const token=randomBytes(32).toString('hex');
      await client.query('DELETE FROM recovery_email_tokens WHERE expires<$1 OR user_id=$2',[Date.now(),actor.id]);
      await client.query('INSERT INTO recovery_email_tokens(token_hash,user_id,email,previous_email,password_version,expires) VALUES($1,$2,$3,$4,$5,$6)',[tokenHash(token),actor.id,email,row.email,tokenHash(row.password),Date.now()+30*60_000]);
      return token;
    });
    if(outcome instanceof TeamError) throw outcome;
    return outcome;
  }
  async confirm(actor: TeamUser, token: string) {
    if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token)) throw new TeamError(400,'This link is invalid or expired.');
    await this.transaction(async client=>{
      const proof=(await client.query('SELECT * FROM recovery_email_tokens WHERE token_hash=$1 AND user_id=$2 AND expires>$3',[tokenHash(token),actor.id,Date.now()])).rows[0];
      const row=(await client.query('SELECT email,password,google_subject FROM users WHERE id=$1 AND organisation_id=$2 AND active=1',[actor.id,actor.organisationId])).rows[0];
      if(!proof||!row||row.google_subject||proof.previous_email!==row.email||proof.password_version!==tokenHash(row.password)) throw new TeamError(400,'This link is invalid or expired.');
      if((await client.query('SELECT id FROM users WHERE email=$1 AND id<>$2',[proof.email,actor.id])).rowCount) throw new TeamError(400,'This email cannot be used. Request a new link with another address.');
      await client.query('UPDATE users SET email=$1 WHERE id=$2',[proof.email,actor.id]);
      await client.query("DELETE FROM onboarding_tokens WHERE kind='reset' AND email IN ($1,$2)",[row.email,proof.email]);
      await client.query('DELETE FROM recovery_email_tokens WHERE user_id=$1',[actor.id]);
      await client.query("INSERT INTO audit(actor,action,at,detail,organisation_id) VALUES($1,'recovery-email-verified',$2,$1,$3)",[actor.id,new Date().toISOString(),actor.organisationId]);
    });
  }
  async discardEmail(token:string) { await this.pool.query('DELETE FROM recovery_email_tokens WHERE token_hash=$1',[tokenHash(token)]); }
}
