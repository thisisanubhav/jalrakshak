import { NextRequest, NextResponse } from 'next/server';
import { teamStore } from '@/team/store';
import { PostgresTeamStore } from '@/team/postgres';
import { OnboardingStore } from '@/team/onboarding';
import { TeamError } from '@/team/server';
import { publicOrigin, sameOrigin, secureSessionCookie } from '@/team/origin';
import { mailConfiguration } from '@/contact/mail';
import { sendOnboardingMail } from '@/team/onboarding-mail';
import { googleConfiguration, startGoogle, finishGoogle } from '@/team/google';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = {'Cache-Control':'no-store','Referrer-Policy':'no-referrer'};
const enabled = () => process.env.JALRAKSHAK_ALLOW_SIGNUP === '1' && !!process.env.DATABASE_URL && !!publicOrigin();
function stores() {
  if (!enabled()) throw new TeamError(503,'Public signup is not enabled.');
  const team = teamStore();
  if (!(team instanceof PostgresTeamStore)) throw new TeamError(503,'Hosted signup is unavailable.');
  return {team,onboarding:new OnboardingStore(team.pool)};
}
function session(response: NextResponse, token: string, request: Request) {
  response.cookies.set('jalrakshak_session',token,{httpOnly:true,secure:secureSessionCookie(request),sameSite:'strict',path:'/',maxAge:12*3600});
  return response;
}
function failure(error: unknown) { return NextResponse.json({error:error instanceof TeamError ? error.message : 'Unable to complete this request. Please try again.'},{status:error instanceof TeamError ? error.status : 503,headers}); }
export async function GET(request: NextRequest, context: {params:Promise<{path:string[]}>}) {
  const path = (await context.params).path.join('/');
  try {
    if (path === 'capabilities') return NextResponse.json({email:enabled() && !!mailConfiguration(),google:enabled() && !!googleConfiguration()},{headers});
    if (path !== 'google/callback') return NextResponse.json({error:'Not found'},{status:404,headers});
    const {onboarding} = stores();
    const result = await finishGoogle(onboarding,request.nextUrl.searchParams.get('state')??'',request.cookies.get('jalrakshak_google_state')?.value??'',request.nextUrl.searchParams.get('code')??'');
    const response = NextResponse.redirect(new URL(result.session ? '/' : `/signup#token=${result.verification}`,publicOrigin()!.origin),303);
    response.headers.set('Cache-Control','no-store'); response.headers.set('Referrer-Policy','no-referrer');
    response.cookies.set('jalrakshak_google_state','',{path:'/api/onboarding/google/callback',maxAge:0});
    return result.session ? session(response,result.session,request) : response;
  } catch (error) {
    if (path === 'google/callback' && publicOrigin()) {
      const response = NextResponse.redirect(new URL('/signup?error=google',publicOrigin()!.origin),303);
      response.cookies.set('jalrakshak_google_state','',{path:'/api/onboarding/google/callback',maxAge:0});
      response.headers.set('Referrer-Policy','no-referrer'); response.headers.set('Cache-Control','no-store');
      return response;
    }
    return failure(error);
  }
}
export async function POST(request: NextRequest, context: {params:Promise<{path:string[]}>}) {
  if (!sameOrigin(request)) return NextResponse.json({error:'Same-origin request required.'},{status:403,headers});
  try {
    const {team,onboarding} = stores(), path = (await context.params).path.join('/');
    const reader = request.body?.getReader(); let body = '', bytes = 0;
    if (reader) { const decoder = new TextDecoder(); while (true) { const {done,value} = await reader.read(); if (done) break; bytes += value.length; if (bytes > 8192) {await reader.cancel(); throw new TeamError(413,'Request too large.');} body += decoder.decode(value,{stream:true}); } body += decoder.decode(); }
    let input; try {input=JSON.parse(body || '{}');} catch {throw new TeamError(400,'Invalid request.');}
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TeamError(400,'Invalid request.');
    if (path === 'google') {
      const result = await startGoogle(onboarding);
      const response = NextResponse.json({url:result.url},{headers});
      response.cookies.set('jalrakshak_google_state',result.state,{httpOnly:true,secure:true,sameSite:'lax',path:'/api/onboarding/google/callback',maxAge:600});
      return response;
    }
    if (path === 'inspect') return NextResponse.json(await onboarding.inspect(input.token),{headers});
    if (path === 'complete') return session(NextResponse.json({ok:true},{headers}),await onboarding.complete(input),request);
    if (path === 'verify' || path === 'invite') {
      if (!mailConfiguration()) throw new TeamError(503,'Email signup is unavailable.');
      const actor = path === 'invite' ? await team.session(request.cookies.get('jalrakshak_session')?.value??'') : undefined;
      const token = await onboarding.issue(input.email,actor);
      if (token) try {await sendOnboardingMail(input.email.trim().toLowerCase(),token,!!actor);} catch {await onboarding.discard(token); throw new TeamError(503,'Email could not be sent. Please try again later.');}
      return NextResponse.json({ok:true},{headers});
    }
    return NextResponse.json({error:'Not found'},{status:404,headers});
  } catch (error) {return failure(error);}
}
