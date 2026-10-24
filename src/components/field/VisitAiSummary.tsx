'use client';
import { useEffect, useRef, useState } from 'react';
import { aiError, aiRequest } from '@/ai/client';
import type { Translate } from '@/field/i18n';
export function VisitAiSummary({ visitId, t, onUse, onOpen }: { visitId: string; t: Translate; onUse: (text: string) => boolean; onOpen: () => void }) {
  const hi=t('navHome')==='होम', label=(en:string,hindi:string)=>hi?hindi:en;
  const [text,setText]=useState(''), [busy,setBusy]=useState(false), [error,setError]=useState('');
  const active=useRef(true), request=useRef<AbortController|null>(null);
  useEffect(()=>{active.current=true;return()=>{active.current=false;request.current?.abort();};},[]);
  async function summarize(){
    if(busy)return;setBusy(true);setError('');const controller=new AbortController();request.current=controller;
    try{const result=await aiRequest('summary',{visitId,language:hi?'hi':'en'},controller.signal);if(active.current)setText(result.text);}
    catch(err){if(active.current&&!controller.signal.aborted)setError(aiError(err,hi));}
    finally{if(active.current)setBusy(false);}
  }
  return <details className="visit-ai-summary"><summary>{label('AI visit summary', 'AI विज़िट सारांश')}</summary>
    <p>{label('Summarizes this synced visit, photo captions and linked follow-up. Photos are not analysed. Review the evidence before using the draft.', 'इस सिंक विज़िट, फ़ोटो कैप्शन और जुड़े फ़ॉलो-अप का सारांश। फ़ोटो का विश्लेषण नहीं होता। मसौदा इस्तेमाल करने से पहले साक्ष्य जाँचें।')}</p>
    <button type="button" disabled={busy} onClick={()=>void summarize()}>{label('Summarize visit', 'विज़िट का सारांश बनाएँ')}</button>
    {busy&&<p role="status">{label('Preparing draft…', 'मसौदा तैयार हो रहा है…')} <button type="button" onClick={()=>request.current?.abort()}>{label('Cancel AI request', 'AI अनुरोध रद्द करें')}</button></p>}
    {text&&<><label>{label('AI summary — review and edit', 'AI सारांश — जाँचें और संपादित करें')}<textarea maxLength={1500} value={text} disabled={busy} onChange={e=>setText(e.target.value)} /></label><p>{label('AI may be wrong. This is not an approval or a water-safety assessment.', 'AI गलत हो सकता है। यह स्वीकृति या जल सुरक्षा का आकलन नहीं है।')}</p><div className="field-actions"><button type="button" onClick={onOpen}>{label('Open source evidence', 'स्रोत के साक्ष्य खोलें')}</button><button type="button" disabled={busy||!text.trim()} onClick={()=>{if(!onUse(text))setError(label('Review note would exceed 2,000 characters. Shorten it first.', 'समीक्षा नोट 2,000 अक्षर से बड़ा होगा। पहले छोटा करें।'));}}>{label('Add reviewed summary to review note', 'जाँचा सारांश समीक्षा नोट में जोड़ें')}</button><button type="button" disabled={busy} onClick={()=>setText('')}>{label('Discard summary', 'सारांश हटाएँ')}</button></div></>}
    {error&&<p role="alert">{error}</p>}
  </details>;
}
