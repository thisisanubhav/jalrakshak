"use client";
import { useEffect, useEffectEvent, useRef, useState, type FormEvent } from 'react';
import { ConflictReview } from './ConflictReview';
import { fieldDatabase } from '@/field/workspace';
import { FieldApp } from './FieldApp';
import { BackupHealth } from './BackupHealth';
import { BulkAssignments } from './BulkAssignments';
import { FieldAtmosphere } from './FieldChrome';
import { activateWorkspace, closeWorkspace } from '@/field/workspace';
import { api, ApiError, applySnapshot, pendingChanges, pendingCount, conflictReview, type ConflictReview as Review, synchronize } from '@/team/client';
import { createBackup } from '@/field/backup';
import { type TeamSnapshot, type TeamUser } from '@/team/shared';

type Account = TeamUser & { active: number };
export function TeamWorkspace() {
  const [user,setUser]=useState<TeamUser>();
  const [setup,setSetup]=useState(false), [loading,setLoading]=useState(true), [busy,setBusy]=useState(false);
  const [error,setError]=useState(''), [status,setStatus]=useState(''), [conflict,setConflict]=useState(false), [backedUp,setBackedUp]=useState(false);
  const [revision,setRevision]=useState(0), [manage,setManage]=useState(false);
  const [accounts,setAccounts]=useState<Account[]>([]), [snapshot,setSnapshot]=useState<TeamSnapshot>();
  const [pending,setPending]=useState(0), [review,setReview]=useState<Review>();
  const syncLock=useRef(false);
  const [signoutConfirm,setSignoutConfirm]=useState(false);
  async function enter(account:TeamUser, offline=false) {
    setReview(undefined);setPending(0);activateWorkspace(account.id);
    if (!offline) {
      try { localStorage.setItem('team-offline-user',JSON.stringify({user:account,until:Date.now()+12*60*60_000})); } catch { setError('Offline sign-in could not be saved in this browser.'); }
      try { const result=await synchronize(account); setSnapshot(result); setStatus('Team records synchronized. / टीम रिकॉर्ड सिंक हैं।'); }
      catch (err) { setError(err instanceof Error ? err.message : 'Sync failed.'); setConflict(err instanceof ApiError && err.status===409); }
    } else setStatus('Offline: changes stay on this device until you sync. / ऑफ़लाइन: बदलाव सिंक होने तक इस डिवाइस पर रहेंगे।');
    setUser(account); setLoading(false);
  }
  useEffect(()=>{
    let active=true;
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) navigator.serviceWorker.register("/sw-v2.js").catch(()=>{});
    api<{user?:TeamUser;setupRequired?:boolean}>('session').then(async result=>{
      if (!active) return;
      if (result.user) await enter(result.user);
      else { setSetup(Boolean(result.setupRequired)); setLoading(false); }
    }).catch(async err=>{
      if (!active) return;
      if (!(err instanceof ApiError)) {
        try { const saved=JSON.parse(localStorage.getItem('team-offline-user') ?? 'null'); if (saved?.user && saved.until>Date.now()) { await enter(saved.user,true); return; } } catch { /* Show login if local storage is unavailable. */ }
      }
      setLoading(false);
      if (!(err instanceof ApiError && err.status===401)) setError('Cannot reach the team server. Reconnect to sign in. / लॉगिन के लिए सर्वर से जुड़ें।');
    });
    return ()=>{active=false;};
  },[]);
  useEffect(()=>{
    const online=()=>setStatus('Connection restored. Saved work will sync automatically. / कनेक्शन वापस आ गया। काम भेजने के लिए सिंक करें।');
    const offline=()=>setStatus('Offline: changes stay on this device until you sync. / ऑफ़लाइन: बदलाव डिवाइस पर रहेंगे।');
    const changed=()=>setStatus('Unsynced changes saved on this device. Automatic sync is pending. / असिंक बदलाव इस डिवाइस पर सहेजे गए हैं। टीम को भेजने के लिए सिंक करें।');
    addEventListener('jalrakshak-field-changed',changed);
    addEventListener('online',online); addEventListener('offline',offline);
    return ()=>{removeEventListener('jalrakshak-field-changed',changed);removeEventListener('online',online);removeEventListener('offline',offline);};
  },[]);
  async function login(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); setStatus(''); const data=Object.fromEntries(new FormData(event.currentTarget));
    try { const result=await api<{user:TeamUser}>(setup?'setup':'login',data); await enter(result.user); }
    catch(err){setError(err instanceof Error?err.message:'Sign-in failed.');} finally{setBusy(false);}
  }
  async function sync(automatic=false) {
    if(!user||syncLock.current||busy)return;
    syncLock.current=true; setBusy(true);setError('');setStatus('');
    try { const result=await synchronize(user);setSnapshot(result);if(!automatic)setRevision(n=>n+1);setPending(0);setReview(undefined);setStatus('Team records synchronized. / टीम रिकॉर्ड सिंक हैं।');setConflict(false);setBackedUp(false); }
    catch(err){setError(err instanceof Error?err.message:'Sync failed.');setConflict(err instanceof ApiError && err.status===409);if(err instanceof ApiError && err.status===401){try { localStorage.removeItem('team-offline-user'); } catch { /* Account access still closes. */ }closeWorkspace();setUser(undefined);}setStatus('Work is saved on this device; sync is not confirmed. / काम डिवाइस पर है; सिंक की पुष्टि नहीं हुई।');}
    finally{syncLock.current=false;setBusy(false);}
  }
  const uploadIfAvailable=useEffectEvent(()=>sync(true));
  const autoUpload=useEffectEvent(async()=>{
    if(!user||busy||syncLock.current||review)return;
    try {const count=await pendingCount(user);setPending(count);if(count>0&&navigator.onLine&&!conflict&&!manage)await uploadIfAvailable();}
    catch {setError('Pending records could not be checked. Your device records were not replaced.');}
  });
  const recount=useEffectEvent(async()=>{if(user)try{setPending(await pendingCount(user));}catch{setError('Cannot read pending records.');}});
  useEffect(()=>{
    if(!user)return;
    let timer:ReturnType<typeof setTimeout>;
    const changed=()=>{void recount();clearTimeout(timer);timer=setTimeout(()=>void autoUpload(),4000);};
    const reconnect=()=>{clearTimeout(timer);timer=setTimeout(()=>void autoUpload(),1000);};
    queueMicrotask(()=>void recount());const interval=setInterval(()=>void autoUpload(),30000);
    addEventListener('jalrakshak-field-changed',changed);addEventListener('online',reconnect);
    return()=>{clearTimeout(timer);clearInterval(interval);removeEventListener('jalrakshak-field-changed',changed);removeEventListener('online',reconnect);};
  },[user]);
  async function reviewChanges(){if(!user)return;setReview(undefined);setBusy(true);setError('');try{setReview(await conflictReview(user));}catch(err){setError(err instanceof Error?err.message:'Comparison unavailable.');}finally{setBusy(false);}}
  async function downloadRecovery(){if(!user)return;try{
    const records=await fieldDatabase().teamState.filter(r=>r.id.startsWith(`team-recovery-${user.id}-`)).toArray();
    if(!records.length){setStatus('No recovery copies yet.');return;}
    const latest=records.map(r=>r.value as {data:unknown;at:string}).sort((a,b)=>b.at.localeCompare(a.at))[0];
    const blob=new Blob([JSON.stringify({format:'jalrakshak-field-backup',version:1,exportedAt:latest.at,data:latest.data})],{type:'application/json'});
    const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`jalrakshak-recovery-${Date.now()}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }catch{setError('Recovery download failed. Stored copies were not removed.');}}
  async function showTeam() {
    if(!user)return;setError('');setBusy(true);
    try { const [people,records]=await Promise.all([api<{users:Account[]}>('users'),api<TeamSnapshot>('records')]);setAccounts(people.users);setSnapshot(records);setManage(true);requestAnimationFrame(()=>document.getElementById("team-management")?.scrollIntoView({block:"start"})); }
    catch(err){setError(err instanceof Error?err.message:'Team unavailable.');}finally{setBusy(false);}
  }
  async function createAccount(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();const form=event.currentTarget;setBusy(true);setError('');setStatus('');
    try{await api('users',Object.fromEntries(new FormData(form)));form.reset();await showTeam();setStatus('Account created. Share its credentials privately. / खाता बना। जानकारी निजी रूप से दें।');}
    catch(err){setError(err instanceof Error?err.message:'Account creation failed.');}finally{setBusy(false);}
  }
  async function assign(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();setBusy(true);setError('');setStatus('');
    try { await api('assign',Object.fromEntries(new FormData(event.currentTarget)));await showTeam();setStatus('Assignment saved. Workers must sync to refresh access. / कार्य आवंटित। कर्मचारी सिंक करें।'); }
    catch(err){setError(err instanceof Error?err.message:'Assignment failed.');}finally{setBusy(false);}
  }
  async function toggleAccount(account:Account) {
    setBusy(true);setError('');setStatus('');
    try {await api('active',{userId:account.id,active:!account.active});await showTeam();setStatus('Account access updated. Previously downloaded offline records remain on that device.');}
    catch(err){setError(err instanceof Error?err.message:'Account update failed.');}finally{setBusy(false);}
  }
  async function resetPassword(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();const form=event.currentTarget;setBusy(true);setError('');setStatus('');
    try {await api('password',Object.fromEntries(new FormData(form)));form.reset();setStatus('Password reset; previous sessions were revoked. / पासवर्ड बदला; पुराने सत्र समाप्त।');}
    catch(err){setError(err instanceof Error?err.message:'Password reset failed.');}finally{setBusy(false);}
  }
  async function signout(confirmed=false) {
    if(!user)return;
    if(!confirmed) {
      try { if(await pendingChanges(user)){setSignoutConfirm(true);return;} }
      catch { setSignoutConfirm(true);return; }
    }
    setBusy(true);setError('');setStatus('');
    try { await api('logout',{});try { localStorage.removeItem('team-offline-user'); } catch { /* Account access still closes. */ }closeWorkspace();setReview(undefined);setPending(0);setUser(undefined);setManage(false);setStatus('');setSignoutConfirm(false); }
    catch{setError('Reconnect to sign out securely. Your pending records remain on this device.');}finally{setBusy(false);}
  }
  async function savePending() {
    setBusy(true);setError('');setStatus('');
    try { const backup=await createBackup();const url=URL.createObjectURL(new Blob([JSON.stringify(backup)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download=`jalrakshak-pending-${Date.now()}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setBackedUp(true); }
    catch{setError('Backup failed. Your local records have not been replaced.');}finally{setBusy(false);}
  }
  async function reloadTeam() {
    if(!user || !backedUp)return;setBusy(true);setError('');setStatus('');
    try{await applySnapshot(user,await api<TeamSnapshot>('records'));setConflict(false);setBackedUp(false);setRevision(n=>n+1);setStatus('Team copy loaded. Keep the pending backup to review and re-enter conflicting work.');}
    catch(err){setError(err instanceof Error?err.message:'Reload failed.');}finally{setBusy(false);}
  }
  if(loading)return <main className="field-main"><p role="status">Opening your workspace… / कार्यक्षेत्र खुल रहा है…</p></main>;
  if(!user)return <div className="team-shell air-shell"><FieldAtmosphere /><main className="field-main team-login"><section className="field-card">
    <h1>JalRakshak</h1><h2>{setup?'Create the first supervisor / पहला पर्यवेक्षक बनाएँ':'Team sign in / टीम लॉगिन'}</h2>
    <p>Each worker sees assigned sources. Supervisors manage the team. / कर्मचारी अपने आवंटित स्रोत देखते हैं। पर्यवेक्षक टीम सँभालते हैं।</p>
    {setup&&<p>The one-time setup key is in <code>private-data/setup-key.txt</code> on the server. / सेटअप कुंजी सर्वर पर इस फ़ाइल में है।</p>}
    <form onSubmit={login}>
      {setup&&<label>Setup key / सेटअप कुंजी<input name="key" required type="password" autoComplete="off" /></label>}
      {setup&&<label>Name / नाम<input name="name" required maxLength={100} autoComplete="name" /></label>}
      <label>Username / उपयोगकर्ता नाम<input name="username" required autoComplete="username" minLength={3} maxLength={64} /></label>
      <label>Password / पासवर्ड<input name="password" required type="password" minLength={setup?12:1} maxLength={256} autoComplete={setup?'new-password':'current-password'} /></label>
      <button type="submit" disabled={busy}>{setup?'Create supervisor / पर्यवेक्षक बनाएँ':'Sign in / लॉगिन'}</button>
    </form><p>Use your own trusted device. Offline records are stored in its browser. / अपना विश्वसनीय डिवाइस उपयोग करें। ऑफ़लाइन रिकॉर्ड ब्राउज़र में रहते हैं।</p>
    {error&&<p role="alert">{error}</p>}
  </section></main></div>;
  return <div className="team-shell air-shell"><FieldAtmosphere />
    <section className="field-card team-bar no-print" aria-label="Team workspace">
      <div className="team-toolbar">
        <div className="team-identity"><strong>{user.name}</strong><span>{user.role==='supervisor'?'Supervisor / पर्यवेक्षक':'Field worker / कर्मचारी'}</span></div>
        <div className="field-actions team-toolbar-actions"><button type="button" disabled={busy} onClick={()=>void sync()}>Sync now / अभी सिंक करें</button>
          {user.role==='supervisor'&&<button type="button" disabled={busy} onClick={()=>void showTeam()}>Manage team / टीम प्रबंधन</button>}
          <button type="button" disabled={busy} onClick={()=>void signout()}>Sign out / लॉगआउट</button></div>
      </div>
      <div className="team-sync-line">
        <p data-testid="pending-count" className={conflict?'team-sync-paused':'team-sync-ready'}>{pending} pending records / लंबित रिकॉर्ड · {conflict?"Automatic sync paused for review / समीक्षा तक सिंक रुका":"Automatic sync on / स्वचालित सिंक चालू"}</p>
        {status&&<p role="status">{status}</p>}
      </div>
      {error&&<p role="alert">{error}</p>}
      {signoutConfirm&&<div><p>Unsynced work will remain on this device under your account. Sync now, or confirm sign out. / असिंक काम आपके खाते में इस डिवाइस पर रहेगा।</p><button disabled={busy} onClick={()=>void signout(true)}>Keep pending work and sign out</button><button onClick={()=>setSignoutConfirm(false)}>Cancel</button></div>}
      {conflict&&<div className="field-card"><button disabled={busy} onClick={()=>void reviewChanges()}>Review sync conflict / सिंक विवाद की समीक्षा</button><p>Sync paused to preserve both versions. Review and combine changes below, or download a backup before replacing the device copy.</p>
        <button disabled={busy} onClick={()=>void savePending()}>Download pending backup</button>
        {backedUp&&<button disabled={busy} onClick={()=>void reloadTeam()}>I saved the backup — replace device copy with team records</button>}
      </div>}
      {review&&user&&<ConflictReview key={review.remote.revision} review={review} user={user} onCancel={()=>setReview(undefined)} onBusy={setBusy} onRefresh={()=>void reviewChanges()} onResolved={result=>{setSnapshot(result);setReview(undefined);setConflict(false);setPending(0);setRevision(n=>n+1);setStatus('Reviewed changes synchronized. Original device records remain in recovery copies.');}} />}
      <details className="team-sync-details"><summary>Conflict recovery copies / विवाद पुनर्प्राप्ति प्रतियाँ</summary><p>Account / खाता: {user.username}</p><p>Saved records sync automatically while this app is open and online. Sync now is also available. / ऐप खुला और ऑनलाइन होने पर सहेजे गए रिकॉर्ड अपने आप सिंक होंगे। अभी सिंक भी उपलब्ध है।</p><p>Download the original device records preserved before conflict resolution.</p><button disabled={busy} onClick={()=>void downloadRecovery()}>Download latest recovery backup</button></details>
      {manage&&user.role==='supervisor'&&<section id="team-management"><h2>Team management / टीम प्रबंधन</h2>
        <button onClick={()=>setManage(false)}>Close team management</button>
        <BackupHealth /><h3>Create account / खाता बनाएँ</h3><form onSubmit={createAccount} className="field-grid">
          <label>Name<input name="name" required maxLength={100} /></label><label>Username<input name="username" required minLength={3} maxLength={64} autoComplete="off" /></label><label>Initial password<input name="password" type="password" required minLength={12} maxLength={256} autoComplete="new-password" /></label>
          <label>Role<select aria-label="Role" name="role"><option value="worker">Field worker</option><option value="supervisor">Supervisor</option></select></label><button disabled={busy}>Create account</button>
        </form><ul>{accounts.map(account=><li key={account.id}>{account.name} · {account.username} · {account.role} · {account.active ? "Active" : "Disabled"} {account.id!==user.id&&<button disabled={busy} onClick={()=>void toggleAccount(account)}>{account.active ? "Disable" : "Enable"} {account.username}</button>}</li>)}</ul>
        {snapshot&&<BulkAssignments key={snapshot.revision} snapshot={snapshot} accounts={accounts} disabled={busy} onSaved={async()=>{await showTeam();setStatus('Assignments saved. Workers should sync. / आवंटन सहेजे गए। कर्मचारी सिंक करें।');}} />}
        <h3>Assign a source / स्रोत आवंटित करें</h3><p>Sync new sources first. Assignment changes take effect on workers’ next sync.</p>
        <form onSubmit={assign} className="field-grid"><label>Source<select aria-label="Source" name="sourceId" required>{snapshot?.data.sources.map(source=><option value={source.id} key={source.id}>{source.code} · {source.name} — {accounts.find(a=>a.id===snapshot.assignments[source.id])?.username}</option>)}</select></label>
          <label>Assigned worker<select aria-label="Assigned worker" name="userId" required>{accounts.filter(a=>a.active).map(account=><option key={account.id} value={account.id}>{account.username}</option>)}</select></label><button disabled={busy||!snapshot?.data.sources.length}>Save assignment</button></form>
        <h3>Reset account password / पासवर्ड बदलें</h3><form onSubmit={resetPassword} className="field-grid"><label>Account<select aria-label="Account" name="userId">{accounts.map(account=><option value={account.id} key={account.id}>{account.username}</option>)}</select></label><label>New password<input name="password" type="password" required minLength={12} maxLength={256} autoComplete="new-password" /></label><button disabled={busy}>Reset password</button></form>
      </section>}
    </section>
    <fieldset className="team-fieldset" disabled={busy||Boolean(review)}><FieldApp key={`${user.id}-${revision}`} team teamUser={user} onManageTeam={() => void showTeam()} /></fieldset>
  </div>;
}
