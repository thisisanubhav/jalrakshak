"use client";
import { useEffect, useState, type FormEvent } from 'react';
import { FieldApp } from './FieldApp';
import { activateWorkspace, closeWorkspace } from '@/field/workspace';
import { api, ApiError, applySnapshot, pendingChanges, synchronize } from '@/team/client';
import { createBackup } from '@/field/backup';
import { type TeamSnapshot, type TeamUser } from '@/team/shared';

type Account = TeamUser & { active: number };
export function TeamWorkspace() {
  const [user,setUser]=useState<TeamUser>();
  const [setup,setSetup]=useState(false), [loading,setLoading]=useState(true), [busy,setBusy]=useState(false);
  const [error,setError]=useState(''), [status,setStatus]=useState(''), [conflict,setConflict]=useState(false), [backedUp,setBackedUp]=useState(false);
  const [revision,setRevision]=useState(0), [manage,setManage]=useState(false);
  const [accounts,setAccounts]=useState<Account[]>([]), [snapshot,setSnapshot]=useState<TeamSnapshot>();
  const [signoutConfirm,setSignoutConfirm]=useState(false);
  async function enter(account:TeamUser, offline=false) {
    activateWorkspace(account.id);
    if (!offline) {
      localStorage.setItem('team-offline-user',JSON.stringify({user:account,until:Date.now()+12*60*60_000}));
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
    const online=()=>setStatus('Connection restored. Use Sync now to send pending work. / कनेक्शन वापस आ गया। काम भेजने के लिए सिंक करें।');
    const offline=()=>setStatus('Offline: changes stay on this device until you sync. / ऑफ़लाइन: बदलाव डिवाइस पर रहेंगे।');
    const changed=()=>setStatus('Unsynced changes saved on this device. Use Sync now to share them. / असिंक बदलाव इस डिवाइस पर सहेजे गए हैं। टीम को भेजने के लिए सिंक करें।');
    addEventListener('jalrakshak-field-changed',changed);
    addEventListener('online',online); addEventListener('offline',offline);
    return ()=>{removeEventListener('jalrakshak-field-changed',changed);removeEventListener('online',online);removeEventListener('offline',offline);};
  },[]);
  async function login(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); setStatus(''); const data=Object.fromEntries(new FormData(event.currentTarget));
    try { const result=await api<{user:TeamUser}>(setup?'setup':'login',data); await enter(result.user); }
    catch(err){setError(err instanceof Error?err.message:'Sign-in failed.');} finally{setBusy(false);}
  }
  async function sync() {
    if(!user)return; setBusy(true);setError('');setStatus('');
    try { const result=await synchronize(user);setSnapshot(result);setRevision(n=>n+1);setStatus('Team records synchronized. / टीम रिकॉर्ड सिंक हैं।');setConflict(false);setBackedUp(false); }
    catch(err){setError(err instanceof Error?err.message:'Sync failed.');setConflict(err instanceof ApiError && err.status===409);if(err instanceof ApiError && err.status===401){localStorage.removeItem('team-offline-user');closeWorkspace();setUser(undefined);}setStatus('Work is saved on this device; sync is not confirmed. / काम डिवाइस पर है; सिंक की पुष्टि नहीं हुई।');}
    finally{setBusy(false);}
  }
  async function showTeam() {
    if(!user)return;setError('');setBusy(true);
    try { const [people,records]=await Promise.all([api<{users:Account[]}>('users'),api<TeamSnapshot>('records')]);setAccounts(people.users);setSnapshot(records);setManage(true); }
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
    if(!confirmed && await pendingChanges(user)){setSignoutConfirm(true);return;}
    setBusy(true);setError('');setStatus('');
    try { await api('logout',{});localStorage.removeItem('team-offline-user');closeWorkspace();setUser(undefined);setManage(false);setStatus('');setSignoutConfirm(false); }
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
  if(!user)return <main className="field-main team-login"><section className="field-card">
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
  </section></main>;
  return <>
    <section className="field-card team-bar no-print" aria-label="Team workspace">
      <strong>{user.name} · {user.username} · {user.role==='supervisor'?'Supervisor / पर्यवेक्षक':'Field worker / कर्मचारी'}</strong>
      <p>Save on device during field work. Sync before and after each visit. / दौरे से पहले और बाद में सिंक करें।</p>
      <div className="field-actions"><button type="button" disabled={busy} onClick={()=>void sync()}>Sync now / अभी सिंक करें</button>
        {user.role==='supervisor'&&<button type="button" disabled={busy} onClick={()=>void showTeam()}>Manage team / टीम प्रबंधन</button>}
        <button type="button" disabled={busy} onClick={()=>void signout()}>Sign out / लॉगआउट</button></div>
      {status&&<p role="status">{status}</p>}{error&&<p role="alert">{error}</p>}
      {signoutConfirm&&<div><p>Unsynced work will remain on this device under your account. Sync now, or confirm sign out. / असिंक काम आपके खाते में इस डिवाइस पर रहेगा।</p><button disabled={busy} onClick={()=>void signout(true)}>Keep pending work and sign out</button><button onClick={()=>setSignoutConfirm(false)}>Cancel</button></div>}
      {conflict&&<div className="field-card"><p>Sync stopped to preserve both versions. Download pending work, verify the file, then explicitly replace this device copy with the team copy. Re-enter any remaining changes after review.</p>
        <button disabled={busy} onClick={()=>void savePending()}>Download pending backup</button>
        {backedUp&&<button disabled={busy} onClick={()=>void reloadTeam()}>I saved the backup — replace device copy with team records</button>}
      </div>}
      {manage&&user.role==='supervisor'&&<section><h2>Team management / टीम प्रबंधन</h2>
        <button onClick={()=>setManage(false)}>Close team management</button>
        <h3>Create account / खाता बनाएँ</h3><form onSubmit={createAccount} className="field-grid">
          <label>Name<input name="name" required maxLength={100} /></label><label>Username<input name="username" required minLength={3} maxLength={64} autoComplete="off" /></label><label>Initial password<input name="password" type="password" required minLength={12} maxLength={256} autoComplete="new-password" /></label>
          <label>Role<select name="role"><option value="worker">Field worker</option><option value="supervisor">Supervisor</option></select></label><button disabled={busy}>Create account</button>
        </form><ul>{accounts.map(account=><li key={account.id}>{account.name} · {account.username} · {account.role} · {account.active ? "Active" : "Disabled"} {account.id!==user.id&&<button disabled={busy} onClick={()=>void toggleAccount(account)}>{account.active ? "Disable" : "Enable"} {account.username}</button>}</li>)}</ul>
        <h3>Assign a source / स्रोत आवंटित करें</h3><p>Sync new sources first. Assignment changes take effect on workers’ next sync.</p>
        <form onSubmit={assign} className="field-grid"><label>Source<select name="sourceId" required>{snapshot?.data.sources.map(source=><option value={source.id} key={source.id}>{source.code} · {source.name} — {accounts.find(a=>a.id===snapshot.assignments[source.id])?.username}</option>)}</select></label>
          <label>Assigned worker<select name="userId" required>{accounts.filter(a=>a.active).map(account=><option key={account.id} value={account.id}>{account.username}</option>)}</select></label><button disabled={busy||!snapshot?.data.sources.length}>Save assignment</button></form>
        <h3>Reset account password / पासवर्ड बदलें</h3><form onSubmit={resetPassword} className="field-grid"><label>Account<select name="userId">{accounts.map(account=><option value={account.id} key={account.id}>{account.username}</option>)}</select></label><label>New password<input name="password" type="password" required minLength={12} maxLength={256} autoComplete="new-password" /></label><button disabled={busy}>Reset password</button></form>
      </section>}
    </section>
    <fieldset className="team-fieldset" disabled={busy}><FieldApp key={`${user.id}-${revision}`} team /></fieldset>
  </>;
}
