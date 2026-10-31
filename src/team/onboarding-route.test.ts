import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {NextRequest} from 'next/server';
const mocks=vi.hoisted(()=>({inspect:vi.fn(),complete:vi.fn(),issue:vi.fn(),resetPassword:vi.fn(),status:vi.fn(),finishGoogle:vi.fn(),send:vi.fn()}));
vi.mock('@/team/postgres',()=>({PostgresTeamStore:class {pool={};async session(){return {id:'user',organisationId:'org'};}}}));
vi.mock('@/team/store',async()=>{const {PostgresTeamStore}=await import('@/team/postgres');return {teamStore:()=>new PostgresTeamStore('unused')};});
vi.mock('@/team/onboarding',()=>({OnboardingStore:class {inspect=mocks.inspect;complete=mocks.complete;issue=mocks.issue;resetPassword=mocks.resetPassword;}}));
vi.mock('@/team/recovery-email',()=>({RecoveryEmailStore:class {status=mocks.status;}}));
vi.mock('@/contact/mail',()=>({mailConfiguration:()=>({configured:true})}));
vi.mock('@/team/onboarding-mail',()=>({sendOnboardingMail:mocks.send}));
vi.mock('@/team/google',()=>({googleConfiguration:()=>({configured:true}),startGoogle:vi.fn(),finishGoogle:mocks.finishGoogle}));
import {GET,POST} from '@/app/api/onboarding/[...path]/route';
function post(path:string,body:object={}){return POST(new NextRequest(`https://example.com/api/onboarding/${path}`,{method:'POST',headers:{Origin:'https://example.com','Content-Type':'application/json'},body:JSON.stringify(body)}),{params:Promise.resolve({path:[path]})});}
beforeEach(()=>{
  vi.resetAllMocks();vi.stubEnv('JALRAKSHAK_ALLOW_SIGNUP','0');vi.stubEnv('DATABASE_URL','postgres://unused');vi.stubEnv('JALRAKSHAK_PUBLIC_ORIGIN','https://example.com');
  mocks.complete.mockResolvedValue('session-token');mocks.status.mockResolvedValue({email:null,google:false});
});
afterEach(()=>vi.unstubAllEnvs());
it('advertises existing-account services while public registration is closed',async()=>{
  const response=await GET(new NextRequest('https://example.com/api/onboarding/capabilities'),{params:Promise.resolve({path:['capabilities']})});
  expect(await response.json()).toEqual({signup:false,email:true,google:true});
});
it('blocks new email verification requests before issuing mail',async()=>{
  expect((await post('verify',{email:'new@example.com'})).status).toBe(403);
  expect(mocks.issue).not.toHaveBeenCalled();expect(mocks.send).not.toHaveBeenCalled();
});
it.each(['verify','google-verified'])('rejects outstanding %s signup proofs when registration closes',async kind=>{
  mocks.inspect.mockResolvedValue({kind});expect((await post('complete',{token:'proof'})).status).toBe(403);expect(mocks.complete).not.toHaveBeenCalled();
});
it('still permits supervisor-issued worker invitations',async()=>{
  mocks.inspect.mockResolvedValue({kind:'invite'});expect((await post('complete',{token:'invite'})).status).toBe(200);expect(mocks.complete).toHaveBeenCalled();
});
it('retains password recovery and account settings when registration closes',async()=>{
  expect((await post('recover',{email:'existing@example.com'})).status).toBe(200);
  expect(mocks.issue).toHaveBeenCalledWith('existing@example.com',undefined,true);
  expect((await post('reset-password',{token:'proof',password:'a-long-password'})).status).toBe(200);
  expect(mocks.resetPassword).toHaveBeenCalledWith('proof','a-long-password');
  expect((await post('recovery-email-status')).status).toBe(200);expect(mocks.status).toHaveBeenCalled();
});
it('routes Google failure back to login and clears the OAuth cookie',async()=>{
  mocks.finishGoogle.mockRejectedValue(new Error('cancelled'));
  const response=await GET(new NextRequest('https://example.com/api/onboarding/google/callback?error=access_denied'),{params:Promise.resolve({path:['google','callback']})});
  expect(response.headers.get('location')).toBe('https://example.com/?error=google');
  expect(response.cookies.get('jalrakshak_google_state')?.value).toBe('');
  expect(mocks.finishGoogle.mock.calls[0][4]).toBe(false);
});
it('allows new registration only when explicitly enabled',async()=>{
  vi.stubEnv('JALRAKSHAK_ALLOW_SIGNUP','1');expect((await post('verify',{email:'new@example.com'})).status).toBe(200);expect(mocks.issue).toHaveBeenCalled();
});
