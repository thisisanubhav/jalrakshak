import { useUiLanguage } from '../UiLanguage';
import { useState,type FormEvent } from 'react';

export function TeamLogin({setup,busy,error,onSubmit}:{setup:boolean;busy:boolean;error:string;onSubmit:(event:FormEvent<HTMLFormElement>)=>void}){
  const {locale,setLocale}=useUiLanguage();
  const hi=locale==='hi';
  const [visible,setVisible]=useState(false);
  const text=(en:string,hindi:string)=>hi?hindi:en;
  let message='';
  if(error){
    if(/too many attempts/i.test(error))message=text('Too many attempts. Try again in 15 minutes.','बहुत अधिक प्रयास। 15 मिनट बाद फिर कोशिश करें।');
    else if(/setup key/i.test(error))message=text('The setup key is incorrect.','सेटअप कुंजी गलत है।');
    else if(/incorrect|invalid credentials/i.test(error))message=text('Username or password is incorrect.','उपयोगकर्ता नाम या पासवर्ड गलत है।');
    else if(/username|password|name|already exists/i.test(error))message=text('Check the account details and try again.','खाते की जानकारी जाँचें और फिर कोशिश करें।');
    else message=text('Cannot reach the server. Check your connection and try again.','सर्वर से संपर्क नहीं हो सका। कनेक्शन जाँचकर फिर कोशिश करें।');
  }
  return <section className="field-card team-login-card" lang={hi?'hi':'en'}>
    <div className="team-login-brand"><strong>JalRakshak</strong><button type="button" aria-label={text('Switch to Hindi','Switch to English')} onClick={()=>setLocale(hi?'en':'hi')}>{hi?'English':'हिन्दी'}</button></div>
    <h1>{setup?text('Create your supervisor account','पर्यवेक्षक खाता बनाएँ'):text('Sign in to JalRakshak','JalRakshak में साइन इन करें')}</h1>
    <form onSubmit={onSubmit} aria-busy={busy}>
      <fieldset disabled={busy}>
        {setup&&<><label>{text('Setup key','सेटअप कुंजी')}<input name="key" required type="password" autoComplete="off" /></label><p>{text('Find the key in private-data/setup-key.txt on the server.','कुंजी सर्वर की private-data/setup-key.txt फ़ाइल में है।')}</p><label>{text('Name','नाम')}<input name="name" required maxLength={100} autoComplete="name" /></label></>}
        <label>{text('Username','उपयोगकर्ता नाम')}<input name="username" required autoComplete="username" autoCapitalize="none" spellCheck={false} minLength={3} maxLength={64} aria-describedby={error?'team-login-error':undefined} /></label>
        <label>{text('Password','पासवर्ड')}<input name="password" required type={visible?'text':'password'} minLength={setup?12:1} maxLength={256} autoComplete={setup?'new-password':'current-password'} aria-describedby={error?'team-login-error':undefined} /></label>
        <button className="team-password-toggle" type="button" aria-pressed={visible} onClick={()=>setVisible(!visible)}>{visible?text('Hide password','पासवर्ड छिपाएँ'):text('Show password','पासवर्ड दिखाएँ')}</button>
        {message&&<p className="field-error" id="team-login-error" role="alert">{message}</p>}
        <button className="team-login-submit" type="submit" disabled={busy}>{busy?text('Signing in…','साइन इन हो रहा है…'):setup?text('Create supervisor','पर्यवेक्षक बनाएँ'):text('Sign in','साइन इन करें')}</button>
      </fieldset>
    </form>
    {!setup&&<p className="team-login-help">{text('Forgot your password? Contact your supervisor.','पासवर्ड भूल गए? अपने पर्यवेक्षक से संपर्क करें।')}</p>}
    <small>{text('Use a trusted device for offline records.','ऑफ़लाइन रिकॉर्ड के लिए विश्वसनीय डिवाइस उपयोग करें।')}</small>
  </section>;
}
