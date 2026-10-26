import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateKeyPair, SignJWT } from 'jose';
import { finishGoogle, startGoogle } from './google';
import type { OnboardingStore } from './onboarding';
const keyHolder = vi.hoisted(()=>({key:undefined as unknown}));
vi.mock('jose',async importOriginal=>({...await importOriginal<typeof import('jose')>(),createRemoteJWKSet:()=>()=>keyHolder.key}));
const state='a'.repeat(64),nonce='nonce';
let privateKey: Awaited<ReturnType<typeof generateKeyPair>>['privateKey'];
let store: OnboardingStore;
let query: ReturnType<typeof vi.fn>;
async function signed(overrides:Record<string,unknown>={}) {
  return new SignJWT({nonce,email:'verified@example.com',email_verified:true,...overrides}).setProtectedHeader({alg:'RS256'}).setIssuer('https://accounts.google.com').setAudience('client').setSubject('google-user').setIssuedAt().setExpirationTime('5m').sign(privateKey);
}
async function response(token:string) {vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({id_token:token}),{status:200})));}
beforeEach(async()=>{
  vi.stubEnv('GOOGLE_CLIENT_ID','client');vi.stubEnv('GOOGLE_CLIENT_SECRET','secret');vi.stubEnv('JALRAKSHAK_PUBLIC_ORIGIN','https://example.com');
  const pair=await generateKeyPair('RS256');privateKey=pair.privateKey;keyHolder.key=pair.publicKey;
  query=vi.fn(async(sql:string)=>{
    if(sql.startsWith('DELETE')&&sql.includes('RETURNING'))return {rowCount:1,rows:[{payload:{nonce,verifier:'verifier'}}]};
    if(sql.includes('count(*)'))return {rowCount:1,rows:[{n:0}]};
    return {rowCount:0,rows:[]};
  });
  store={pool:{query},transaction:async(fn:(client:unknown)=>Promise<unknown>)=>fn({query})} as unknown as OnboardingStore;
});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
describe('Google identity verification',()=>{
  it('requests only identity scopes and binds authorization to PKCE',async()=>{
    const result=await startGoogle(store),url=new URL(result.url);
    expect(url.origin).toBe('https://accounts.google.com');expect(url.searchParams.get('scope')).toBe('openid email profile');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');expect(url.searchParams.get('state')).toBe(result.state);
    expect(url.searchParams.get('redirect_uri')).toBe('https://example.com/api/onboarding/google/callback');expect(url.searchParams.has('client_secret')).toBe(false);
  });
  it('rejects mismatched browser state before exchanging a code',async()=>{
    await expect(finishGoogle(store,state,'b'.repeat(64),'code')).rejects.toThrow('could not be verified');expect(query).not.toHaveBeenCalled();
  });
  it.each([{nonce:'wrong'},{email_verified:false},{email:'invalid'},{azp:'another-client'}])('rejects invalid identity claims %j',async claims=>{
    await response(await signed(claims));await expect(finishGoogle(store,state,state,'code')).rejects.toThrow('could not be verified');
  });
  it('rejects a validly signed token for a different audience',async()=>{
    const token=await new SignJWT({nonce,email:'verified@example.com',email_verified:true}).setProtectedHeader({alg:'RS256'}).setIssuer('https://accounts.google.com').setAudience('other-client').setSubject('user').setIssuedAt().setExpirationTime('5m').sign(privateKey);
    await response(token);await expect(finishGoogle(store,state,state,'code')).rejects.toThrow();
  });
  it('creates a short-lived verified proof instead of an account',async()=>{
    await response(await signed());const result=await finishGoogle(store,state,state,'code');expect(result.verification).toMatch(/^[a-f0-9]{64}$/);
    expect(query.mock.calls.some(([sql])=>sql.includes("'google-verified'"))).toBe(true);
    expect(query.mock.calls.some(([sql])=>sql.startsWith('INSERT INTO users'))).toBe(false);
  });
});
