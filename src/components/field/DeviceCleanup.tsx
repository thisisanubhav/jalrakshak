'use client';
import { UiText } from '@/components/UiLanguage';

import { useState } from 'react';
import { removeAccountDeviceData } from '@/field/device-cleanup';
import type { TeamUser } from '@/team/shared';

export function DeviceCleanup({user,onDone,onBusy}:{user:TeamUser;onDone:()=>void;onBusy:(busy:boolean)=>void}) {
  const [confirm,setConfirm]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  async function remove() {
    if(busy||confirm!==user.username)return;
    setBusy(true);onBusy(true);setError('');
    try {await removeAccountDeviceData(user.id);onDone();}
    catch {setError('Cleanup could not finish. Close other JalRakshak tabs and retry. / अन्य टैब बंद करके फिर प्रयास करें।');}
    finally {setBusy(false);onBusy(false);}
  }
  return <details className="field-card no-print"><summary><UiText text={"Remove this account’s device data / इस खाते का डिवाइस डेटा हटाएँ"}/></summary>
    <p>{user.name} · {user.username}</p>
    <p><UiText text={"Deletes this account’s local records, photos, recordings, drafts and recovery copies—including unsynced work. Server records, other accounts and downloaded files stay unchanged. / इस खाते का स्थानीय डेटा और असिंक काम मिटेगा। सर्वर, दूसरे खाते और डाउनलोड की गई फ़ाइलें नहीं मिटेंगी।"}/></p>
    <p><UiText text={"Save needed backups first. Close other JalRakshak tabs. This cannot be undone. / पहले ज़रूरी बैकअप लें और अन्य टैब बंद करें। इसे वापस नहीं किया जा सकता।"}/></p>
    <label className="field-label"><UiText text={"Type username to confirm / पुष्टि के लिए उपयोगकर्ता नाम"}/><input value={confirm} disabled={busy} autoComplete="off" onChange={e=>setConfirm(e.target.value)} /></label>
    <button type="button" disabled={busy||confirm!==user.username} onClick={()=>void remove()}><UiText text={"Remove device data permanently / डिवाइस डेटा स्थायी रूप से हटाएँ"}/></button>
    {busy&&<p role="status">Removing device data… Close other tabs if this takes too long.</p>}
    {error&&<p role="alert">{error}</p>}
  </details>;
}
