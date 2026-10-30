import {useContext,useEffect,useState} from 'react';
import {WorkflowContext} from './WorkflowGuidance';
import {workspaceKey} from '@/field/workspace';
import type {FieldData} from '@/field/model';
import type {TeamUser} from '@/team/shared';
export function OfflineReadiness({data,user,hi}:{data:FieldData;user?:TeamUser;hi:boolean}){
  const sync=useContext(WorkflowContext),label=(en:string,hindi:string)=>hi?hindi:en;
  const [state,setState]=useState<{until?:number;cached:boolean;usage?:number;quota?:number;protected?:boolean;backup?:string}>(),[failed,setFailed]=useState(false),[busy,setBusy]=useState(false);
  async function check(){setBusy(true);setFailed(false);try{
    const account=JSON.parse(localStorage.getItem('team-offline-user')??'null');
    const estimate=await navigator.storage?.estimate?.();const protectedStorage=await navigator.storage?.persisted?.();
    const registration=await navigator.serviceWorker?.getRegistration();const cached=!!registration?.active&&!!await caches.match(user?'/':'/personal');
    setState({until:account?.user?.id===user?.id?account?.until:undefined,cached,usage:estimate?.usage,quota:estimate?.quota,protected:protectedStorage,backup:localStorage.getItem(workspaceKey('field-last-backup-download'))??undefined});
  }catch{setFailed(true);}finally{setBusy(false);}}
  useEffect(()=>{const timer=setTimeout(()=>void check(),0);return()=>clearTimeout(timer);},[]); // Recheck explicitly before leaving.
  const mb=(n:number)=>(n/1048576).toFixed(1)+' MB';
  return <details className="field-card no-print"><summary>{label('Before you go offline','ऑफ़लाइन जाने से पहले')}</summary><button type="button" disabled={busy} onClick={()=>void check()}>{busy?label('Checking…','जाँच जारी…'):label('Check device readiness','डिवाइस की तैयारी जाँचें')}</button>{failed&&<p role="alert">{label('Some checks are unavailable. Open online and check again.','कुछ जाँच उपलब्ध नहीं हैं। ऑनलाइन खोलें और फिर जाँचें।')}</p>}{state&&<ul>
    <li>{label('App cache','ऐप कैश')}: {state.cached?label('Available','उपलब्ध'):label('Not confirmed — open online first','पुष्टि नहीं — पहले ऑनलाइन खोलें')}</li>
    {user&&<li>{label('Cached account access','कैश खाते की पहुँच')}: {state.until&&state.until>Date.now()?new Date(state.until).toLocaleString(hi?'hi-IN':'en-IN'):label('Expired or unavailable — sign in online','समाप्त या अनुपलब्ध — ऑनलाइन साइन इन करें')}</li>}
    <li>{label('Sources on this device','इस डिवाइस पर स्रोत')}: {data.sources.filter(s=>s.scope==='MANUAL_FIELD').length}{user&&' · '+(sync?.snapshot?label('Sync before leaving to refresh assignments','आवंटन ताज़ा करने के लिए जाने से पहले सिंक करें'):label('No confirmed team snapshot','पुष्ट टीम प्रति नहीं'))}</li>
    <li>{label('Storage for this site','इस साइट का संग्रह')}: {state.usage!==undefined&&state.quota?`${mb(state.usage)} / ${mb(state.quota)} · ${Math.round(state.usage/state.quota*100)}%`:label('Estimate unavailable','अनुमान उपलब्ध नहीं')}{state.quota&&state.usage!==undefined&&state.usage/state.quota>.8?' · '+label('Low space — back up before adding photos','जगह कम — फ़ोटो जोड़ने से पहले बैकअप लें'):''}</li>
    <li>{label('Persistent storage','स्थायी संग्रह')}: {state.protected?label('Granted','अनुमति है'):label('Not confirmed','पुष्टि नहीं')}</li>
    <li>{label('Last backup download requested','अंतिम बैकअप डाउनलोड अनुरोध')}: {state.backup?new Date(state.backup).toLocaleString(hi?'hi-IN':'en-IN'):label('None recorded','दर्ज नहीं')}</li>
  </ul>}<p>{label('Save drafts as visits and check sync before leaving. Open the app once in airplane mode to check access. Map tiles and AI need a connection. Verify downloaded backups yourself.','जाने से पहले ड्राफ़्ट को विज़िट के रूप में सहेजें और सिंक जाँचें। पहुँच जाँचने के लिए ऐप एक बार विमान मोड में खोलें। नक्शे और AI को कनेक्शन चाहिए। डाउनलोड बैकअप स्वयं जाँचें।')}</p></details>;
}
