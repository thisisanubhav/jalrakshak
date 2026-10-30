'use client';
import Link from 'next/link';
import {useEffect,useState,type FormEvent} from 'react';
import {useUiLanguage} from '@/components/UiLanguage';

type Status={email:string|null;google:boolean;available:boolean};
export default function AccountSettings(){
  const {locale}=useUiLanguage(),text=(en:string,hi:string)=>locale==='hi'?hi:en;
  const [status,setStatus]=useState<Status>(),[token,setToken]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState<'sent'|'verified'>(),[error,setError]=useState(0);
  async function request(path:string,body:object={}){
    const response=await fetch(`/api/onboarding/${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    if(!response.ok)throw response.status;
    return response.json();
  }
  useEffect(()=>{
    let active=true;
    function receive(){const value=new URLSearchParams(location.hash.slice(1)).get('token');history.replaceState(null,'','/account');if(value)queueMicrotask(()=>{if(active){setToken(value);setMessage(undefined);}});}
    receive();addEventListener('hashchange',receive);
    request('recovery-email-status').then(value=>{if(active)setStatus(value);}).catch(code=>{if(active)setError(typeof code==='number'?code:503);});
    return()=>{active=false;removeEventListener('hashchange',receive);};
  },[]);
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();const form=event.currentTarget,data=new FormData(form);setBusy(true);setError(0);setMessage(undefined);
    try{
      await request(token?'recovery-email-confirm':'recovery-email-request',token?{token}:{email:data.get('email'),password:data.get('password')});
      form.reset();setMessage(token?'verified':'sent');setToken('');setStatus(await request('recovery-email-status'));
    }catch(code){setError(typeof code==='number'?code:503);}finally{setBusy(false);}
  }
  return <main className="team-login-shell team-login"><section className="field-card team-login-card">
    <h1>{text('Account settings','खाता सेटिंग')}</h1>
    <h2>{text('Recovery email','पुनर्प्राप्ति ईमेल')}</h2>
    <p>{text('Keep signing in with your username. A verified email helps you recover a forgotten password.','अपने उपयोगकर्ता नाम से साइन इन करते रहें। सत्यापित ईमेल भूला पासवर्ड बदलने में मदद करता है।')}</p>
    {!status&&!error&&<p role="status">{text('Loading account…','खाता खुल रहा है…')}</p>}
    {status&&<>
      <p>{status.google?text('This account uses Google. Manage access through Google.','यह खाता Google से जुड़ा है। पहुँच Google से प्रबंधित करें।'):status.email?text('Recovery email verified','पुनर्प्राप्ति ईमेल सत्यापित है'):text('Add a recovery email','पुनर्प्राप्ति ईमेल जोड़ें')}{status.email&&<>: <strong>{status.email}</strong></>}</p>
      {!status.google&&(status.available||token)?<form onSubmit={submit}><fieldset disabled={busy}>
        {token?<p>{text('Confirm this email for the account you are signed in to.','इस ईमेल की पुष्टि अपने साइन इन किए हुए खाते के लिए करें।')}</p>:<>
          <label>{text('Recovery email address','पुनर्प्राप्ति ईमेल पता')}<input name="email" type="email" required maxLength={254} autoComplete="email"/></label>
          <label>{text('Current password','वर्तमान पासवर्ड')}<input name="password" type="password" required maxLength={256} autoComplete="current-password"/></label>
          {status.email&&<p>{text('Your current email stays active until you verify the new one.','नया ईमेल सत्यापित होने तक वर्तमान ईमेल सक्रिय रहेगा।')}</p>}
        </>}
        <button type="submit">{busy?text('Please wait…','कृपया प्रतीक्षा करें…'):token?text('Verify recovery email','पुनर्प्राप्ति ईमेल सत्यापित करें'):text('Send verification link','सत्यापन लिंक भेजें')}</button>
      </fieldset></form>:!status.google&&<p>{text('Email service is unavailable. Try again when online or contact your supervisor.','ईमेल सेवा उपलब्ध नहीं है। ऑनलाइन होने पर फिर कोशिश करें या पर्यवेक्षक से संपर्क करें।')}</p>}
    </>}
    {message&&<p role="status">{message==='sent'?text('Check your email, including spam. Open the link within 30 minutes while signed in to this account.','स्पैम सहित अपना ईमेल जाँचें। इस खाते में साइन इन रहते हुए 30 मिनट में लिंक खोलें।'):text('Recovery email verified. Your username is unchanged.','पुनर्प्राप्ति ईमेल सत्यापित है। आपका उपयोगकर्ता नाम नहीं बदला है।')}</p>}
    {!!error&&<p role="alert">{error===401?text('Sign in to your account, then reopen the email link.','अपने खाते में साइन इन करें, फिर ईमेल लिंक दोबारा खोलें।'):error===429?text('Too many attempts. Try again in an hour.','बहुत अधिक प्रयास हुए। एक घंटे बाद फिर कोशिश करें।'):error===503?text('Account settings need an online hosted connection. Try again later.','खाता सेटिंग के लिए ऑनलाइन होस्टेड कनेक्शन चाहिए। बाद में फिर कोशिश करें।'):text('Check your current password and email, or request a fresh verification link. The email may already be registered.','वर्तमान पासवर्ड और ईमेल जाँचें, या नया सत्यापन लिंक माँगें। ईमेल पहले से पंजीकृत हो सकता है।')}</p>}
    <p><Link href="/">{text('Back to workspace / sign in','कार्यस्थल / साइन इन पर वापस जाएँ')}</Link></p>
    {token&&<a href="/account">{text('Request a new verification link','नया सत्यापन लिंक माँगें')}</a>}
  </section></main>;
}
