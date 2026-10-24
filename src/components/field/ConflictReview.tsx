"use client";
import { useState } from 'react';
import { mergeRecords } from '@/team/merge';
import { type ConflictReview as Review, resolveConflict } from '@/team/client';
import type { TeamSnapshot, TeamUser } from '@/team/shared';
function describe(value:unknown) {return value===undefined?'No longer available to this account':JSON.stringify(value,null,2);}
export function ConflictReview({review,user,onResolved,onRefresh,onBusy,onCancel}:{review:Review;user:TeamUser;onResolved:(snapshot:TeamSnapshot)=>void;onRefresh:()=>void;onBusy:(busy:boolean)=>void;onCancel:()=>void}) {
  const [choices,setChoices]=useState<Record<string,'local'|'remote'>>({});const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const initial=mergeRecords(review.base,review.local,review.remote);
  async function save(){setBusy(true);onBusy(true);setError('');try{onResolved(await resolveConflict(user,review,choices));}catch(err){setError(err instanceof Error?err.message:'Resolution failed.');}finally{setBusy(false);onBusy(false);}}
  return <section className="field-card conflict-review" aria-label="Resolve sync conflicts"><h2>Review changes / बदलाव की समीक्षा</h2>
    <p>Independent records and edits are combined. Choose between overlapping edits below. Saved evidence and assignment restrictions remain protected. Your original device records are kept as a recovery copy before applying choices.</p>
    {!initial.conflicts.length&&<p>No overlapping edits. Both sets of changes can be combined.</p>}
    {initial.conflicts.map(item=><section key={item.key}><h3>{item.label}</h3><div className="field-grid"><div><h4>This device / यह डिवाइस</h4><pre>{describe(item.local)}</pre></div><div><h4>Shared records / साझा रिकॉर्ड</h4><pre>{describe(item.remote)}</pre></div></div>
      <label>Decision / निर्णय<select aria-label={`Decision: ${item.label}`} value={choices[item.key]??''} onChange={e=>setChoices({...choices,[item.key]:e.target.value as 'local'|'remote'})}><option value="">Choose…</option>{item.localAllowed&&<option value="local">Keep device value / डिवाइस का मान रखें</option>}<option value="remote">Keep shared value; preserve device copy / साझा मान रखें</option></select></label>
      {!item.localAllowed&&<p>This record cannot replace shared evidence or bypass an assignment. The device version remains in your recovery copy.</p>}</section>)}
    {error&&<p role="alert">{error}</p>}
    <div className="field-actions"><button disabled={busy||initial.conflicts.some(c=>!choices[c.key])} onClick={()=>void save()}>Apply reviewed changes / बदलाव लागू करें</button><button disabled={busy} onClick={onRefresh}>Refresh comparison / तुलना ताज़ा करें</button><button disabled={busy} onClick={onCancel}>Back to device records / डिवाइस रिकॉर्ड पर वापस</button></div>
  </section>;
}
