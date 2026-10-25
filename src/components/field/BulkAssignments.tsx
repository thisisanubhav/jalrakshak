
import { UiText, pickLanguage, useUiLanguage } from '@/components/UiLanguage';
import { useState } from 'react';
import { api } from '@/team/client';
import type { TeamSnapshot,TeamUser } from '@/team/shared';

export function BulkAssignments({snapshot,accounts,disabled,onSaved}:{snapshot:TeamSnapshot;accounts:(TeamUser&{active:number})[];disabled:boolean;onSaved:()=>Promise<void>}){
  const {locale:uiLocale}=useUiLanguage();
  const [selected,setSelected]=useState<string[]>([]),[worker,setWorker]=useState(''),[query,setQuery]=useState(''),[village,setVillage]=useState('');
  const [preview,setPreview]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
  const workers=accounts.filter(a=>a.active&&a.role==='worker');
  const target=workers.find(a=>a.id===worker);
  const visible=snapshot.data.sources.filter(s=>(!village||s.village===village)&&`${s.code} ${s.name} ${s.village}`.toLowerCase().includes(query.trim().toLowerCase()));
  const chosen=snapshot.data.sources.filter(s=>selected.includes(s.id));
  const owner=(id:string)=>accounts.find(a=>a.id===snapshot.assignments[id])?.username??'Unassigned / अनावंटित';
  function choose(ids:string[]){setSelected(ids);setPreview(false);setMessage('');setError('');}
  async function save(){
    if(!target||!chosen.length||chosen.length>500||busy)return;
    setBusy(true);setError('');setMessage('');
    try{await api('assign-bulk',{sourceIds:selected,userId:worker,expectedAssignments:Object.fromEntries(selected.map(id=>[id,snapshot.assignments[id]]))});}
    catch(err){setError(err instanceof Error?err.message:'Assignment failed. Refresh and try again.');setPreview(false);setBusy(false);return;}
    setSelected([]);setPreview(false);setMessage('Assignments saved. Workers should sync. / आवंटन सहेजे गए। कर्मचारी सिंक करें।');
    try{await onSaved();}catch{setError('Saved, but the list could not refresh. Reopen Manage team. / सहेजा गया; सूची फिर खोलें।');}finally{setBusy(false);}
  }
  return <section className="field-card bulk-assignments" aria-label={pickLanguage("Bulk assignments / सामूहिक आवंटन",uiLocale)}><h3><UiText text={"Bulk assignments / सामूहिक आवंटन"}/></h3>
    <p><UiText text={"Select sources, choose a worker, then review. Sync new sources first. / स्रोत और कर्मचारी चुनें, फिर समीक्षा करें। नए स्रोत पहले सिंक करें।"}/></p>
    <fieldset disabled={disabled||busy}><div className="field-grid">
      <label><UiText text={"Search sources / स्रोत खोजें"}/><input aria-label="Bulk source search" value={query} onChange={e=>{setQuery(e.target.value);setPreview(false);}} /></label>
      <label><UiText text={"Village / गाँव"}/><select aria-label="Bulk village" value={village} onChange={e=>{setVillage(e.target.value);setPreview(false);}}><option value=""><UiText text={"All / सभी"}/></option>{[...new Set(snapshot.data.sources.map(s=>s.village))].sort().map(v=><option key={v}>{v}</option>)}</select></label>
      <label><UiText text={"Assign to / कर्मचारी"}/><select aria-label="Bulk assigned worker" value={worker} onChange={e=>{setWorker(e.target.value);setPreview(false);}}><option value=""><UiText text={"Choose worker / कर्मचारी चुनें"}/></option>{workers.map(w=><option key={w.id} value={w.id}>{w.name} · {w.username}</option>)}</select></label>
    </div>
    {!workers.length&&<p><UiText text={"Create or enable a field worker first. / पहले कर्मचारी खाता बनाएँ या चालू करें।"}/></p>}
    <div className="field-actions"><button type="button" disabled={!visible.length||new Set([...selected,...visible.map(s=>s.id)]).size>500} onClick={()=>choose([...new Set([...selected,...visible.map(s=>s.id)])])}><UiText text={"Select shown / दिख रहे स्रोत चुनें"}/></button><button type="button" disabled={!selected.length} onClick={()=>choose([])}><UiText text={"Clear selection / चयन हटाएँ"}/></button></div>
    <p>{selected.length} <UiText text={"selected / चयनित ·"}/>{selected.filter(id=>!visible.some(s=>s.id===id)).length} <UiText text={"outside filter / फ़िल्टर से बाहर · Max 500"}/></p>
    {!visible.length&&<p><UiText text={"No matching sources. / कोई स्रोत नहीं मिला।"}/></p>}
    <ul className="field-task-list">{visible.map(s=><li key={s.id}><label><input type="checkbox" aria-label={`Select ${s.code}`} checked={selected.includes(s.id)} disabled={!selected.includes(s.id)&&selected.length>=500} onChange={e=>choose(e.target.checked?[...selected,s.id]:selected.filter(id=>id!==s.id))} /> {s.code} · {s.name}<br/>{s.village} · {owner(s.id)}</label></li>)}</ul>
    <button type="button" disabled={!target||!selected.length||selected.length>500} onClick={()=>setPreview(true)}><UiText text={"Review assignments / आवंटन समीक्षा"}/></button>
    {preview&&target&&<section aria-label="Assignment preview"><h4>{chosen.length} sources → {target.name} · {target.username}</h4><p><UiText text={"Existing assignments will change. / मौजूदा आवंटन बदलेंगे।"}/></p><ul>{chosen.map(s=><li key={s.id}>{s.code} · {owner(s.id)} → {target.username}</li>)}</ul><button type="button" onClick={()=>void save()}><UiText text={"Confirm assignments / आवंटन की पुष्टि करें"}/></button><button type="button" onClick={()=>setPreview(false)}><UiText text={"Cancel / रद्द करें"}/></button></section>}
    </fieldset>{message&&<p role="status">{message}</p>}{error&&<p role="alert">{error}</p>}
  </section>;
}
