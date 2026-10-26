import { PostgresTeamStore } from '@/team/postgres';
import { SyncUploads } from '@/team/uploads';
import { teamStore } from '@/team/store';
import { requestLimits } from '@/team/request-limits';
import { NextRequest, NextResponse } from 'next/server';
import { sameOrigin, secureSessionCookie } from '@/team/origin';
import { backupHealth } from '@/team/backup-health';
import { timingSafeEqual } from 'node:crypto';
import { TeamError, setupToken } from '@/team/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
const cookie = 'jalrakshak_session';
function reply(data: unknown, status = 200) {
  const bytes=new TextEncoder().encode(JSON.stringify(data));let offset=0;
  // Streaming avoids Vercel's buffered response limit for photo-heavy snapshots.
  const stream=new ReadableStream({pull(controller){if(offset>=bytes.length){controller.close();return;}controller.enqueue(bytes.subarray(offset,offset+64*1024));offset+=64*1024;}});
  return new NextResponse(stream,{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
}
async function body(request: NextRequest, limit=50*1024*1024) {
  const reader = request.body?.getReader(); if (!reader) throw new TeamError(400,'Missing request.');
  const chunks: Uint8Array[] = []; let size=0;
  while (true) { const { done,value }=await reader.read(); if (done) break; size+=value.length; if (size>limit) { await reader.cancel(); throw new TeamError(413,'Request is too large.'); } chunks.push(value); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new TeamError(400,'Invalid JSON.'); }
}
async function handle(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  try {
    const path=(await context.params).path.join('/');
    if (request.method === 'POST' && !sameOrigin(request)) throw new TeamError(403,'Request origin rejected.');
    const store=teamStore(); const token=request.cookies.get(cookie)?.value ?? '';
    if (request.method === 'GET' && path === 'session') {
      if (!(await store.hasUsers())) { setupToken(); return reply({ setupRequired:true }); }
      return reply({ user:(await store.session(token)), chunkedSync:store instanceof PostgresTeamStore });
    }
    if (request.method === 'POST' && (path === 'login' || path === 'setup')) {
      requestLimits.check('authentication',120);
      const data=await body(request,16*1024);
      if (path === 'setup') {
        const expected=Buffer.from(setupToken()), supplied=Buffer.from(typeof data.key === 'string' ? data.key : '');
        if (supplied.length !== expected.length || !timingSafeEqual(supplied,expected)) throw new TeamError(403,'Setup key is incorrect.');
        (await store.createUser(null,data.username,data.name,data.password,'supervisor'));
      }
      const session=(await store.login(data.username,data.password)); const response=reply({user:session.user});
      response.cookies.set(cookie,session.token,{httpOnly:true,secure:secureSessionCookie(request),sameSite:'strict',path:'/',maxAge:12*60*60}); return response;
    }
    const user=(await store.session(token));
    requestLimits.check(`team:${user.id}`,240);
    const expectedAccount=request.headers.get("x-jalrakshak-account");
    if (expectedAccount && expectedAccount !== user.id) throw new TeamError(401,"A different account signed in in another tab. Sign in again; local work was preserved.");
    if (request.method === 'POST' && path === 'logout') { (await store.logout(token)); const response=reply({ok:true}); response.cookies.set(cookie,'',{httpOnly:true,secure:secureSessionCookie(request),path:'/',sameSite:'strict',maxAge:0}); return response; }
    if (request.method === 'GET') {
      if (path === 'backups') {
        if(user.role!=='supervisor')throw new TeamError(403,'Supervisor access required.');
        return reply(backupHealth());
      }
      if (path === 'overview') return reply((await store.overview(user)));
      if (path === 'records') return reply((await store.snapshot(user)));
      if (path === 'users') return reply({users:(await store.users(user))});
    } else {
      const data=await body(request,path==='sync'?50*1024*1024:path==='sync-part'?2*1024*1024:64*1024);
      if (store instanceof PostgresTeamStore && path.startsWith('sync-')) {
        const uploads=new SyncUploads(store.pool);
        if(path==='sync-start')return reply(await uploads.start(user,token,data.parts));
        if(path==='sync-part'){await uploads.part(user,token,data.id,data.index,data.body);return reply({ok:true});}
        if(path==='sync-finish'){
          const incoming=await uploads.read(user,token,data.id);
          const result=await store.sync(user,incoming.revision,incoming.data);
          await uploads.remove(user,token,data.id);return reply(result);
        }
      }
      if (path === 'sync') return reply((await store.sync(user,data.revision,data.data)));
      if (path === 'users') return reply({user:(await store.createUser(user,data.username,data.name,data.password,data.role))});
      if (path === 'assign') { (await store.assign(user,data.sourceId,data.userId)); return reply({ok:true}); }
      if (path === 'assign-bulk') { (await store.assignMany(user,data.sourceIds,data.userId,data.expectedAssignments)); return reply({ok:true}); }
      if (path === 'active') { (await store.setActive(user,data.userId,data.active)); return reply({ok:true}); }
      if (path === 'password') { (await store.resetPassword(user,data.userId,data.password)); return reply({ok:true}); }
    }
    throw new TeamError(404,'Not found.');
  } catch (err) {
    if (err instanceof TeamError) return reply({error:err.message},err.status);
    return reply({error:'The operation could not be completed. No successful save is confirmed.'},500);
  }
}
export const GET=handle;
export const POST=handle;
