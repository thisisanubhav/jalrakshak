import { createHash, randomBytes } from 'node:crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { publicOrigin } from './origin';
import { OnboardingStore, tokenHash } from './onboarding';
import { TeamError } from './server';
import { validEmail } from '@/contact/shared';

const keys = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
export function googleConfiguration() {
  const origin = publicOrigin(), id = process.env.GOOGLE_CLIENT_ID, secret = process.env.GOOGLE_CLIENT_SECRET;
  return origin && id && secret ? {id,secret,redirect:`${origin.origin}/api/onboarding/google/callback`} : undefined;
}
export async function startGoogle(store: OnboardingStore) {
  const config = googleConfiguration();
  if (!config) throw new TeamError(503, 'Google sign-in is unavailable.');
  const state = randomBytes(32).toString('hex'), nonce = randomBytes(32).toString('hex'), verifier = randomBytes(32).toString('base64url');
  await store.transaction(async client => {
    await client.query("DELETE FROM onboarding_tokens WHERE expires<$1 AND kind<>'invite'", [Date.now()]);
    if (Number((await client.query("SELECT count(*) AS n FROM onboarding_tokens WHERE kind='google-state'")).rows[0].n) >= 1000) throw new TeamError(429,'Please try again later.');
    await client.query("INSERT INTO onboarding_tokens(token_hash,kind,email,payload,expires) VALUES($1,'google-state','',$2,$3)", [tokenHash(state),JSON.stringify({nonce,verifier}),Date.now()+10*60_000]);
  });
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({client_id:config.id,redirect_uri:config.redirect,response_type:'code',scope:'openid email profile',state,nonce,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'}).toString();
  return {state,url:url.toString()};
}
export async function finishGoogle(store: OnboardingStore, state: string, cookie: string, code: string, allowSignup = true) {
  const config = googleConfiguration();
  if (!config || !/^[a-f0-9]{64}$/.test(state) || state !== cookie || !code || code.length > 4096) throw new TeamError(400,'Google sign-in could not be verified.');
  const consumed = await store.pool.query("DELETE FROM onboarding_tokens WHERE token_hash=$1 AND kind='google-state' AND expires>$2 RETURNING payload", [tokenHash(state),Date.now()]);
  if (!consumed.rowCount) throw new TeamError(400,'Google sign-in expired. Try again.');
  const {nonce,verifier} = consumed.rows[0].payload;
  const response = await fetch('https://oauth2.googleapis.com/token',{method:'POST',redirect:'error',signal:AbortSignal.timeout(15_000),headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:config.id,client_secret:config.secret,code,code_verifier:verifier,redirect_uri:config.redirect,grant_type:'authorization_code'})});
  if (!response.ok) throw new TeamError(400,'Google sign-in failed. Try again.');
  const body = await response.text();
  if (body.length > 32_768) throw new TeamError(400,'Invalid Google response.');
  const {id_token} = JSON.parse(body);
  const {payload} = await jwtVerify(id_token,keys,{issuer:['https://accounts.google.com','accounts.google.com'],audience:config.id,algorithms:['RS256'],requiredClaims:['exp','iat','sub','nonce','email']});
  if (payload.nonce !== nonce || payload.email_verified !== true || typeof payload.email !== 'string' || !validEmail(payload.email) || !payload.sub || (payload.azp && payload.azp !== config.id)) throw new TeamError(400,'Google identity could not be verified.');
  return store.transaction(async client => {
    const existing = await client.query('SELECT id,active FROM users WHERE google_subject=$1', [payload.sub]);
    const token = randomBytes(32).toString('hex');
    if (existing.rowCount) {
      if (existing.rows[0].active !== 1) throw new TeamError(403,'Account access is disabled.');
      await client.query('INSERT INTO sessions(token,user_id,expires) VALUES($1,$2,$3)',[tokenHash(token),existing.rows[0].id,Date.now()+12*3600_000]);
      return {session:token};
    }
    if (!allowSignup) throw new TeamError(403,'New account registration is closed. Sign in with an existing account.');
    const email = payload.email!.toString().toLowerCase();
    if ((await client.query('SELECT id FROM users WHERE email=$1',[email])).rowCount) throw new TeamError(409,'Use your existing username and password.');
    await client.query("INSERT INTO onboarding_tokens(token_hash,kind,email,payload,expires) VALUES($1,'google-verified',$2,$3,$4)",[tokenHash(token),email,JSON.stringify({subject:payload.sub}),Date.now()+10*60_000]);
    return {verification:token};
  });
}
