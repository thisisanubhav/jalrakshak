'use client';
import Link from 'next/link';
import {useEffect,useState,type FormEvent} from 'react';
import {useUiLanguage} from '@/components/UiLanguage';
export default function Recovery() {
  const {locale}=useUiLanguage(), text=(en:string,hi:string)=>locale==='hi'?hi:en;
  const [token,setToken]=useState(''),[busy,setBusy]=useState(false),[done,setDone]=useState(false),[error,setError]=useState(false);
  useEffect(()=>{
    function receive(){const value=new URLSearchParams(location.hash.slice(1)).get('token');history.replaceState(null,'','/recover');if(value)queueMicrotask(()=>{setToken(value);setDone(false);setError(false);});}
    receive();addEventListener('hashchange',receive);return()=>removeEventListener('hashchange',receive);
  },[]);
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();const form=new FormData(event.currentTarget);setError(false);
    if(token&&form.get('password')!==form.get('confirmation')){setError(true);return;}
    setBusy(true);
    try{const response=await fetch(`/api/onboarding/${token?'reset-password':'recover'}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(token?{token,password:form.get('password')}:{email:form.get('email')})});if(!response.ok)throw new Error();setDone(true);}catch{setError(true);}finally{setBusy(false);}
  }
  return <main className="team-login-shell team-login"><section className="field-card team-login-card"><h1>{text('Reset your password','पासवर्ड बदलें')}</h1>
    {!done?<><p>{text('Use your verified account email. Google accounts should continue with Google; accounts without email need a supervisor.','खाते का सत्यापित ईमेल उपयोग करें। Google खाते Google से साइन इन करें; बिना ईमेल वाले खाते पर्यवेक्षक से संपर्क करें।')}</p><form onSubmit={submit}><fieldset disabled={busy}>
      {token?<><label>{text('New password','नया पासवर्ड')}<input name="password" type="password" required minLength={12} maxLength={256} autoComplete="new-password"/></label><label>{text('Confirm password','पासवर्ड की पुष्टि')}<input name="confirmation" type="password" required minLength={12} maxLength={256} autoComplete="new-password"/></label></>:<label>{text('Verified email','सत्यापित ईमेल')}<input name="email" type="email" required maxLength={254} autoComplete="email"/></label>}
      <button type="submit">{busy?text('Please wait…','कृपया प्रतीक्षा करें…'):token?text('Save new password','नया पासवर्ड सहेजें'):text('Send reset link','रीसेट लिंक भेजें')}</button>
    </fieldset></form></>:<p role="status">{token?text('Password changed. Sign in again. Previous server sessions have ended.','पासवर्ड बदल गया। फिर साइन इन करें। पुराने सर्वर सत्र समाप्त हो गए हैं।'):text('If this email has an eligible account, a reset link will arrive. Check spam too.','यदि इस ईमेल का पात्र खाता है, तो रीसेट लिंक आएगा। स्पैम भी जाँचें।')}</p>}
    {error&&<p role="alert">{text('Check matching passwords (12+ characters) and an unexpired link, or try again later.','मिलते हुए पासवर्ड (12+ अक्षर) और मान्य लिंक जाँचें, या बाद में फिर कोशिश करें।')}</p>}
    <p><Link href="/">{text('Back to sign in','साइन इन पर वापस जाएँ')}</Link></p>{token&&<a href="/recover">{text('Request a new link','नया लिंक माँगें')}</a>}
  </section></main>;
}
