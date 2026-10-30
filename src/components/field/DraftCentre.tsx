import {useEffect,useState} from 'react';
import {fieldDatabase,workspaceKey} from '@/field/workspace';
import type {FieldData,Scope} from '@/field/model';
type DraftRow={key:string;sourceId:string;context:string;at?:string;scheduleId?:string;fingerprint:string};
export function DraftCentre({data,scope,hi,onResume}:{data:FieldData;scope:Scope;hi:boolean;onResume:(sourceId:string,context:string,scheduleId?:string)=>void}){
  const [rows,setRows]=useState<DraftRow[]>([]),[failed,setFailed]=useState(false),[confirm,setConfirm]=useState(''),[busy,setBusy]=useState(false);
  const label=(en:string,hindi:string)=>hi?hindi:en;
  async function scan(){
    const database=fieldDatabase(),attachments=await database.teamState.toArray();const keys=new Set<string>();
    const prefix=workspaceKey(`field-measure-${scope}-`);
    for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(key?.startsWith(prefix))keys.add(key);}
    for(const row of attachments){for(const kind of ['visit-photos-','voice-draft-'])if(row.id.startsWith(kind+scope+'-'))keys.add(workspaceKey('field-measure-'+row.id.slice(kind.length)));}
    const next:DraftRow[]=[];
    for(const key of keys){const source=data.sources.filter(s=>s.scope===scope).find(s=>key.startsWith(prefix+s.id+'-'));if(!source)continue;
      const context=key.slice((prefix+source.id+'-').length),suffix=`${scope}-${source.id}-${context}`;
      const raw=localStorage.getItem(key),form=JSON.parse(raw??'{}');
      const media=attachments.filter(r=>r.id===`visit-photos-${suffix}`||r.id===`voice-draft-${suffix}`);
      const hasMedia=media.some(r=>Array.isArray(r.value)?r.value.length>0:!!(r.value as {audio?:Blob;note?:string;transcript?:string})?.audio||!!(r.value as {note?:string})?.note||!!(r.value as {transcript?:string})?.transcript);
      if(!form.measuredAt&&!form.reading1&&!form.reading2&&!form.notes&&!hasMedia)continue;
      next.push({key,sourceId:source.id,context,at:form.__updatedAt,scheduleId:form.scheduleContext||undefined,fingerprint:raw??''});
    }
    setRows(next.sort((a,b)=>(b.at??'').localeCompare(a.at??'')));
  }
  useEffect(()=>{const timer=setTimeout(()=>{scan().catch(()=>setFailed(true));},0);return()=>clearTimeout(timer);},[data,scope]);
  async function discard(row:DraftRow){setBusy(true);setFailed(false);try{
    if((localStorage.getItem(row.key)??'')!==row.fingerprint)throw new Error('Draft changed');
    const suffix=`${scope}-${row.sourceId}-${row.context}`;
    await fieldDatabase().teamState.bulkDelete([`visit-photos-${suffix}`,`voice-draft-${suffix}`]);localStorage.removeItem(row.key);setConfirm('');await scan();
  }catch{setFailed(true);}finally{setBusy(false);}}
  if(!rows.length&&!failed)return null;
  return <details className="field-card no-print"><summary>{label('Unfinished visits','अधूरी विज़िट')} ({rows.length})</summary><p>{label('Drafts stay on this device and are not synced or included in field backups. Close other JalRakshak tabs before discarding.','ड्राफ़्ट इसी डिवाइस पर हैं; सिंक या फ़ील्ड बैकअप में शामिल नहीं हैं। हटाने से पहले अन्य JalRakshak टैब बंद करें।')}</p>{failed&&<p role="alert">{label('Drafts could not be read or changed. Refresh before trying again.','ड्राफ़्ट पढ़े या बदले नहीं जा सके। फिर कोशिश से पहले ताज़ा करें।')}</p>}<ul className="field-task-list">{rows.map(row=>{const source=data.sources.find(s=>s.id===row.sourceId)!;const available=row.context==='new'||data.investigations.some(i=>i.id===row.context&&i.sourceId===row.sourceId)||data.measurements.some(m=>m.id===row.context&&m.sourceId===row.sourceId);return <li key={row.key}><div><strong>{source.code} · {source.name}</strong><p>{row.at?new Date(row.at).toLocaleString(hi?'hi-IN':'en-IN'):label('Edit time unavailable','संपादन समय उपलब्ध नहीं')}</p>{!available&&<p>{label('Linked record unavailable. Sync before resuming.','जुड़ा रिकॉर्ड उपलब्ध नहीं। जारी रखने से पहले सिंक करें।')}</p>}<div className="field-actions"><button type="button" disabled={busy||!available} onClick={()=>onResume(row.sourceId,row.context,row.scheduleId)}>{label('Resume draft','ड्राफ़्ट जारी रखें')}</button><button type="button" disabled={busy} onClick={()=>setConfirm(row.key)}>{label('Discard draft','ड्राफ़्ट हटाएँ')}</button></div>{confirm===row.key&&<><p>{label('Delete this unfinished visit, including its draft photos and audio? Saved visits stay unchanged.','अधूरी विज़िट, उसकी ड्राफ़्ट फ़ोटो और ऑडियो हटाएँ? सहेजी विज़िट नहीं बदलेंगी।')}</p><button type="button" disabled={busy} onClick={()=>void discard(row)}>{label('Confirm discard','हटाने की पुष्टि')}</button><button type="button" onClick={()=>setConfirm('')}>{label('Keep draft','ड्राफ़्ट रखें')}</button></>}</div></li>;})}</ul></details>;
}
