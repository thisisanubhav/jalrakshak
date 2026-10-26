'use client';
import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { useUiLanguage } from '../UiLanguage';

async function request(path: string, body: unknown) {
  const response = await fetch(`/api/onboarding/${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Please try again.');
  return result;
}
function useCapabilities() {
  const [value,setValue] = useState({email:false,google:false,ready:false});
  useEffect(()=>{let live=true;fetch('/api/onboarding/capabilities').then(r=>r.ok?r.json():null).then(v=>{if(live)setValue({email:!!v?.email,google:!!v?.google,ready:true});}).catch(()=>{if(live)setValue({email:false,google:false,ready:true});});return()=>{live=false;};},[]);
  return value;
}
export function SignupLinks() {
  const capabilities = useCapabilities(), {locale}=useUiLanguage();
  return capabilities.email || capabilities.google ? <p><Link href="/signup">{locale==='hi'?'खाता बनाएँ या Google से जारी रखें':'Create an account or continue with Google'}</Link></p> : null;
}
export function WorkerInvitations() {
  const capabilities=useCapabilities(),{locale}=useUiLanguage();
  const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(false);
  if (!capabilities.email) return null;
  const hi=locale==='hi';
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();const form=event.currentTarget;setBusy(true);setMessage('');setError(false);
    try {await request('invite',{email:new FormData(form).get('email')});setMessage(hi?'यदि ईमेल पहले से पंजीकृत नहीं है, तो निमंत्रण भेज दिया गया है। लिंक 30 मिनट तक मान्य है।':'Invitation sent if this email is not already registered. The link lasts 30 minutes.');form.reset();}
    catch {setError(true);setMessage(hi?'निमंत्रण नहीं भेजा जा सका। ईमेल जाँचें और बाद में फिर कोशिश करें।':'Could not send the invitation. Check the email and try again later.');}finally{setBusy(false);}
  }
  return <section className="field-card"><h3>{hi?'कर्मचारी को आमंत्रित करें':'Invite a worker'}</h3><p>{hi?'वे ईमेल सत्यापित करके आपकी टीम में शामिल होंगे।':'They verify their email and join your team as a field worker.'}</p><form onSubmit={submit}><label>{hi?'कर्मचारी का ईमेल':'Worker email'}<input name="email" type="email" autoComplete="off" required maxLength={254}/></label><button disabled={busy}>{busy?(hi?'भेज रहे हैं…':'Sending…'):(hi?'निमंत्रण भेजें':'Send invitation')}</button></form>{message&&<p role={error?'alert':'status'}>{message}</p>}</section>;
}
export default function Signup() {
  const {locale,setLocale}=useUiLanguage(),hi=locale==='hi',text=(en:string,hindi:string)=>hi?hindi:en;
  const capabilities=useCapabilities();
  const [token,setToken]=useState(''),[proof,setProof]=useState<{kind:string;email:string;organisation?:string}>(),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
  useEffect(()=>{
    const value=new URLSearchParams(window.location.hash.slice(1)).get('token');
    const googleError=new URLSearchParams(window.location.search).has('error');
    window.history.replaceState(null,'','/signup');
    if(value){request('inspect',{token:value}).then(result=>{setToken(value);setProof(result);}).catch(()=>{setToken('invalid');setError('link');});}
    else if(googleError)queueMicrotask(()=>setError('google'));
  },[]);
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();setBusy(true);setError('');setMessage('');
    const input=Object.fromEntries(new FormData(event.currentTarget));
    try {
      if(proof){await request('complete',{...input,token});window.location.assign('/');}
      else {await request('verify',input);setMessage(text('Check your email for a verification link. If you already have an account, sign in instead.','सत्यापन लिंक के लिए ईमेल देखें। खाता पहले से है तो साइन इन करें।'));}
    }catch{setError('submit');}finally{setBusy(false);}
  }
  async function google(){setBusy(true);setError('');try{const result=await request('google',{});window.location.assign(result.url);}catch{setError('google');setBusy(false);}}
  return <main className="team-login-shell"><section className="field-card team-login-card" lang={locale}>
    <div className="team-login-brand"><strong>JalRakshak</strong><button type="button" onClick={()=>setLocale(hi?'en':'hi')}>{hi?'English':'हिन्दी'}</button></div>
    <h1>{proof?.kind==='invite'?text('Join your team','अपनी टीम से जुड़ें'):text('Create your organisation','अपना संगठन बनाएँ')}</h1>
    <p>{proof?.kind==='invite'?proof.organisation:text('Create a supervisor account, then invite your field workers.','पर्यवेक्षक खाता बनाएँ, फिर कर्मचारियों को आमंत्रित करें।')}</p>
    {proof?<p>{text('Verified email','सत्यापित ईमेल')}: {proof.email}</p>:capabilities.google&&<button type="button" disabled={busy||!!token} onClick={google}>{text('Continue with Google','Google से जारी रखें')}</button>}
    {(proof||(!token&&capabilities.email))&&<form onSubmit={submit}><fieldset disabled={busy}>
      {!proof?<label>{text('Email','ईमेल')}<input name="email" type="email" required maxLength={254} autoComplete="email"/></label>:<>
        <label>{text('Your name','आपका नाम')}<input name="name" required maxLength={100} autoComplete="name"/></label>
        <label>{text('Unique username','अद्वितीय उपयोगकर्ता नाम')}<input name="username" required minLength={3} maxLength={64} pattern="[a-zA-Z0-9._\-]+" autoComplete="username" autoCapitalize="none"/></label>
        {proof.kind!=='google-verified'&&<label>{text('Password · at least 12 characters','पासवर्ड · कम से कम 12 अक्षर')}<input name="password" type="password" required minLength={12} maxLength={256} autoComplete="new-password"/></label>}
        {proof.kind!=='invite'&&<label>{text('Organisation name','संगठन का नाम')}<input name="organisation" required maxLength={100} autoComplete="organization"/></label>}
      </>}
      <button type="submit" className="team-login-submit">{busy?text('Please wait…','कृपया प्रतीक्षा करें…'):proof?text('Create account','खाता बनाएँ'):text('Send verification link','सत्यापन लिंक भेजें')}</button>
    </fieldset></form>}
    {capabilities.ready&&!capabilities.email&&!capabilities.google&&!proof&&<p role="status">{text('Public signup is not available on this server. Contact your supervisor for an account.','इस सर्वर पर सार्वजनिक पंजीकरण उपलब्ध नहीं है। खाते के लिए पर्यवेक्षक से संपर्क करें।')}</p>}
    {message&&<p role="status">{message}</p>}{error&&<p role="alert">{error==='link'?text('This link is invalid or expired. Request a new link.','लिंक अमान्य या समाप्त है। नया लिंक माँगें।'):error==='google'?text('Google sign-in failed. Try again, or use your existing username and password.','Google साइन इन विफल हुआ। फिर कोशिश करें या अपने उपयोगकर्ता नाम और पासवर्ड का उपयोग करें।'):text('Could not create the account or send the link. Check your details, try a different username, or try again later.','खाता नहीं बन सका या लिंक नहीं भेजा जा सका। जानकारी जाँचें, दूसरा उपयोगकर्ता नाम चुनें या बाद में कोशिश करें।')}</p>}
    <p><Link href="/">{text('Back to sign in','साइन इन पर वापस जाएँ')}</Link></p><small><Link href="/privacy">{text('Privacy','गोपनीयता')}</Link> · <Link href="/terms">{text('Use & terms','उपयोग की शर्तें')}</Link></small>
  </section></main>;
}
