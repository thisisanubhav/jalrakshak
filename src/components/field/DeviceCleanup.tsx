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
    <p><UiText text={"Permanently clears this account’s data on this device, including unsynced work. Keeps server data, other accounts and downloads. / इस डिवाइस से इस खाते का डेटा और असिंक काम हमेशा के लिए मिटेगा। सर्वर डेटा, दूसरे खाते और डाउनलोड सुरक्षित रहेंगे।"}/></p>
    <p><UiText text={"Back up first and close other JalRakshak tabs. / पहले बैकअप लें और अन्य JalRakshak टैब बंद करें।"}/></p>
    <label className="field-label"><UiText text={"Type username to confirm / पुष्टि के लिए उपयोगकर्ता नाम"}/><input value={confirm} disabled={busy} autoComplete="off" onChange={e=>setConfirm(e.target.value)} /></label>
    <button type="button" disabled={busy||confirm!==user.username} onClick={()=>void remove()}><UiText text={"Remove device data permanently / डिवाइस डेटा स्थायी रूप से हटाएँ"}/></button>
    {busy&&<p role="status"><UiText text={"Removing device data… Close other tabs if this takes too long."}/></p>}
    {error&&<p role="alert"><UiText text={error}/></p>}
  </details>;
}
