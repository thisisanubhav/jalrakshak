'use client';
import { useEffect, useState, useRef, type FormEvent } from 'react';
import { Send, Mail } from 'lucide-react';
import {contactCategories,contactRecipient,validateContact} from '@/contact/shared';
const empty={name:'',email:'',category:'issue',subject:'',details:'',source:'',website:'',consent:false};
export function ContactForm() {
  const [form,setForm]=useState(empty),[available,setAvailable]=useState<boolean>(),[busy,setBusy]=useState(false),[error,setError]=useState(''),[reference,setReference]=useState(''),[draftOpened,setDraftOpened]=useState(false);
  const element=useRef<HTMLFormElement>(null);
  useEffect(()=>{let active=true;fetch('/api/contact',{cache:'no-store'}).then(r=>r.json()).then(data=>{if(active)setAvailable(data.available===true);}).catch(()=>{if(active)setAvailable(false);});return()=>{active=false;};},[]);
  function update(key:keyof typeof empty,value:string|boolean) {setForm(old=>({...old,[key]:value}));setReference('');setError('');setDraftOpened(false);}
  async function submit(event:FormEvent) {
    event.preventDefault();if(busy||reference)return;
    setError('');setBusy(true);setDraftOpened(false);
    try {
      const input=validateContact(form);
      const response=await fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...input,website:form.website}),signal:AbortSignal.timeout(35_000)});
      const data=await response.json();
      if(!response.ok||data.accepted!==true||typeof data.reference!=='string')throw new Error(data.error||'Email could not be confirmed. Your text is still here.');
      setReference(data.reference);
    }catch(err){setError(err instanceof Error&&err.name!=='TimeoutError'&&err.name!=='TypeError'?err.message:'Email could not be confirmed. Your text is still here. Check before retrying, or use your email app.');}
    finally{setBusy(false);}
  }
  function emailDraft() {
    if(!element.current?.reportValidity())return;
    try {
      const input=validateContact(form);
      const body=`Name: ${input.name}\nReply email: ${input.email}\nType: ${contactCategories[input.category]}\nSource/visit reference: ${input.source||'Not provided'}\n\n${input.details}`;
      window.location.href=`mailto:${contactRecipient}?subject=${encodeURIComponent(`[JalRakshak ${input.category}] ${input.subject}`)}&body=${encodeURIComponent(body)}`;
      setDraftOpened(true);setError('');
    }catch(err){setError(err instanceof Error?err.message:'Check the form.');}
  }
  return <form ref={element} className="contact-form" onSubmit={submit}>
    <div className="field-grid">
      <label className="field-label">Your name / आपका नाम<input required minLength={2} maxLength={100} autoComplete="name" value={form.name} disabled={busy} onChange={e=>update('name',e.target.value)} /></label>
      <label className="field-label">Reply email / उत्तर का ईमेल<input required type="email" maxLength={254} autoComplete="email" value={form.email} disabled={busy} onChange={e=>update('email',e.target.value)} /></label>
    </div>
    <label className="field-label">Request type / अनुरोध का प्रकार<select value={form.category} disabled={busy} onChange={e=>update('category',e.target.value)}>{Object.entries(contactCategories).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
    <label className="field-label">Subject / विषय<input required minLength={5} maxLength={160} value={form.subject} disabled={busy} onChange={e=>update('subject',e.target.value)} /></label>
    <label className="field-label">Source or visit reference (optional) / स्रोत या दौरा संदर्भ<input maxLength={100} value={form.source} disabled={busy} onChange={e=>update('source',e.target.value)} /></label>
    <label className="field-label">Issue or grievance details / समस्या या शिकायत का विवरण<textarea required minLength={20} maxLength={4000} rows={6} value={form.details} disabled={busy} onChange={e=>update('details',e.target.value)} placeholder="Describe what happened, when, and what help you need. / क्या हुआ, कब हुआ और क्या सहायता चाहिए।" /></label>
    <small>{form.details.length} / 4000 · At least 20 characters / कम से कम 20 अक्षर</small>
    <label hidden>Leave blank<input tabIndex={-1} autoComplete="off" value={form.website} onChange={e=>update('website',e.target.value)} /></label>
    <label className="contact-consent"><input required type="checkbox" checked={form.consent} disabled={busy} onChange={e=>update('consent',e.target.checked)} /><span>Send these details to Anubhav Harsh Sinha to handle my request. / मेरा अनुरोध संभालने के लिए ये विवरण अनुभव हर्ष सिन्हा को भेजें।</span></label>
    {available===false&&<p className="contact-status">Automatic sending is not configured or unavailable. Use your email app below. / स्वतः भेजना उपलब्ध नहीं है। नीचे ईमेल ऐप का उपयोग करें।</p>}
    <button type="submit" disabled={busy||available!==true||!!reference}><Send size={16} aria-hidden="true"/> {busy?'Sending… / भेज रहे हैं…':'Send request / अनुरोध भेजें'}</button>
    <button type="button" disabled={busy} onClick={emailDraft}><Mail size={16} aria-hidden="true"/> Open in email app / ईमेल ऐप में खोलें</button>
    {error&&<p role="alert" className="field-error">{error}</p>}
    {reference&&<p role="status" className="contact-status">Accepted by the email service. Reference / संदर्भ: <strong>{reference}</strong>. Inbox delivery is not guaranteed. / ईमेल सेवा ने स्वीकार किया; इनबॉक्स डिलीवरी की गारंटी नहीं है।</p>}
    {draftOpened&&<p role="status">Email draft requested. Review and send it in your email app; this page has not sent it. / ईमेल ऐप में जाँचकर भेजें; इस पेज ने ईमेल नहीं भेजा है।</p>}
  </form>;
}
