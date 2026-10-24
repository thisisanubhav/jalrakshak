import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { TeamError, teamStore, setupToken } from '@/team/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const cookie = 'jalrakshak_session';
function reply(data: unknown, status = 200) { return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } }); }
async function body(request: NextRequest) {
  const reader = request.body?.getReader(); if (!reader) throw new TeamError(400,'Missing request.');
  const chunks: Uint8Array[] = []; let size=0;
  while (true) { const { done,value }=await reader.read(); if (done) break; size+=value.length; if (size>50*1024*1024) { await reader.cancel(); throw new TeamError(413,'Request exceeds 50 MB.'); } chunks.push(value); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new TeamError(400,'Invalid JSON.'); }
}
async function handle(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  try {
    const path=(await context.params).path.join('/');
    if (request.method === 'POST' && (request.headers.get('origin') !== new URL(request.url).origin || request.headers.get('sec-fetch-site') === 'cross-site')) throw new TeamError(403,'Request origin rejected.');
    const store=teamStore(); const token=request.cookies.get(cookie)?.value ?? '';
    if (request.method === 'GET' && path === 'session') {
      if (!store.hasUsers()) { setupToken(); return reply({ setupRequired:true }); }
      return reply({ user:store.session(token) });
    }
    if (request.method === 'POST' && (path === 'login' || path === 'setup')) {
      const data=await body(request);
      if (path === 'setup') {
        const expected=Buffer.from(setupToken()), supplied=Buffer.from(typeof data.key === 'string' ? data.key : '');
        if (supplied.length !== expected.length || !timingSafeEqual(supplied,expected)) throw new TeamError(403,'Setup key is incorrect.');
        store.createUser(null,data.username,data.name,data.password,'supervisor');
      }
      const session=store.login(data.username,data.password); const response=reply({user:session.user});
      response.cookies.set(cookie,session.token,{httpOnly:true,secure:request.nextUrl.protocol==='https:',sameSite:'strict',path:'/',maxAge:12*60*60}); return response;
    }
    if (request.method === 'POST' && path === 'logout') { store.logout(token); const response=reply({ok:true}); response.cookies.set(cookie,'',{httpOnly:true,path:'/',sameSite:'strict',maxAge:0}); return response; }
    const user=store.session(token);
    if (request.method === 'GET') {
      if (path === 'records') return reply(store.snapshot(user));
      if (path === 'users') return reply({users:store.users(user)});
    } else {
      const data=await body(request);
      if (path === 'sync') return reply(store.sync(user,data.revision,data.data));
      if (path === 'users') return reply({user:store.createUser(user,data.username,data.name,data.password,data.role)});
      if (path === 'assign') { store.assign(user,data.sourceId,data.userId); return reply({ok:true}); }
      if (path === 'active') { store.setActive(user,data.userId,data.active); return reply({ok:true}); }
      if (path === 'password') { store.resetPassword(user,data.userId,data.password); return reply({ok:true}); }
    }
    throw new TeamError(404,'Not found.');
  } catch (err) {
    if (err instanceof TeamError) return reply({error:err.message},err.status);
    return reply({error:'The operation could not be completed. No successful save is confirmed.'},500);
  }
}
export const GET=handle;
export const POST=handle;
