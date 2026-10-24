'use client';
import { useEffect, useRef, useState } from 'react';
import { aiError, aiRequest } from '@/ai/client';
import type { Translate } from '@/field/i18n';

export function ReportAiDraft({kind, filters, t, onOpen}: {kind: 'history' | 'monthly'; filters: Record<string,string>; t: Translate; onOpen: (id:string)=>void}) {
  const hi=t('navHome')==='होम', label=(en:string,hindi:string)=>hi?hindi:en;
  const [draft,setDraft]=useState(''), [busy,setBusy]=useState(false), [error,setError]=useState('');
  const [evidence,setEvidence]=useState<{basis?:string;references?:{sourceId:string;label:string}[]}>({});
  const [reviewed,setReviewed]=useState(false);
  const active=useRef(true), request=useRef<AbortController|null>(null);
  useEffect(()=>{active.current=true;return()=>{active.current=false;request.current?.abort();};},[]);
  const title=kind==='history'?label('AI source history summary','AI स्रोत इतिहास सारांश'):label('AI monthly report draft','AI मासिक रिपोर्ट मसौदा');
  async function generate(){
    if(busy)return;setBusy(true);setError('');const controller=new AbortController();request.current=controller;
    try{const result=await aiRequest(kind,{...filters,language:hi?'hi':'en'},controller.signal);if(active.current){setDraft(result.text);setEvidence(result);setReviewed(false);}}
    catch(err){if(active.current&&!controller.signal.aborted)setError(aiError(err,hi));}
    finally{if(active.current)setBusy(false);}
  }
  function download(){
    const text=[title,JSON.stringify(filters),evidence.basis,draft,label('Human-reviewed draft; not a water-safety assessment.','मानव द्वारा जाँचा मसौदा; जल सुरक्षा का आकलन नहीं।')].join('\n\n');
    const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download=`jalrakshak-${kind}-draft.txt`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return <details className="visit-ai-summary field-card no-print"><summary>{title}</summary>
    <p>{label('Sync first. Review against the records below. Drafts are temporary and do not change records or approvals.','पहले सिंक करें। नीचे रिकॉर्ड से जाँचें। मसौदे अस्थायी हैं; रिकॉर्ड या स्वीकृति नहीं बदलते।')}</p>
    <button type="button" disabled={busy} onClick={()=>void generate()}>{label('Generate draft','मसौदा बनाएँ')}</button>
    {busy&&<p role="status">{label('Preparing draft…','मसौदा तैयार हो रहा है…')} <button type="button" onClick={()=>request.current?.abort()}>{label('Cancel AI request','AI अनुरोध रद्द करें')}</button></p>}
    {draft&&<><p>{evidence.basis}</p><label>{label('Draft — review and edit','मसौदा — जाँचें और संपादित करें')}<textarea aria-label={label('Draft — review and edit','मसौदा — जाँचें और संपादित करें')} maxLength={1500} value={draft} disabled={busy} onChange={e=>{setDraft(e.target.value);setReviewed(false);}} /></label>
      <p>{label('Evidence sources considered','साक्ष्य के स्रोत')}</p><div className="field-actions">{evidence.references?.map(r=><button type="button" key={r.sourceId} onClick={()=>onOpen(r.sourceId)}>{r.label}</button>)}</div>
      <label><input type="checkbox" checked={reviewed} disabled={busy} onChange={e=>setReviewed(e.target.checked)} />{label('I checked this draft against the records.','मैंने रिकॉर्ड से मसौदे की जाँच की है।')}</label>
      <div className="field-actions"><button type="button" disabled={!reviewed||busy||!draft.trim()} onClick={download}>{label('Download reviewed draft','जाँचा मसौदा डाउनलोड करें')}</button><button type="button" disabled={busy} onClick={()=>{setDraft('');setReviewed(false);}}>{label('Discard draft','मसौदा हटाएँ')}</button></div></>}
    {error&&<p role="alert">{error}</p>}
  </details>;
}
