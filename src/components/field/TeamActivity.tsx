import {useState} from 'react';
import type {TeamOverview} from '@/team/shared';
import {translate} from '@/field/i18n';
import {localDate} from '@/field/operations';
export function TeamActivity({overview,hi}:{overview:TeamOverview;hi:boolean}){
  const label=(en:string,hindi:string)=>hi?hindi:en;
  const [query,setQuery]=useState(''),[action,setAction]=useState(''),[from,setFrom]=useState(''),[to,setTo]=useState('');
  const rows=overview.activity.map(item=>{
    let detail='';try{const value=JSON.parse(item.detail??'{}');const ids=value.sourceIds??(value.sourceId?[value.sourceId]:[]);detail=Array.isArray(ids)?ids.map(id=>{const source=overview.snapshot.data.sources.find(s=>s.id===id);return source?`${source.code} · ${source.name}`:String(id);}).join(', '):'';}catch{detail=overview.users.find(u=>u.id===item.detail)?.name??'';}
    return {...item,detail};
  }).filter(item=>(!action||item.action===action)&&(!from||localDate(new Date(item.at))>=from)&&(!to||localDate(new Date(item.at))<=to)&&`${item.actorName} ${item.detail} ${item.action}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const actions:Record<string,string>={'sync':translate(hi?'hi':'en')('activitySync'),'assign-source':label('Assignment','आवंटन'),'create-account':label('Account created','खाता बनाया'),'reset-password':label('Password reset','पासवर्ड बदला'),'password-recovery':label('Email recovery','ईमेल पुनर्प्राप्ति'),'verified-signup':label('Signup','पंजीकरण'),'enable-account':label('Account enabled','खाता चालू'),'disable-account':label('Account disabled','खाता बंद')};
  return <section><h3>{label('Search team activity','टीम गतिविधि खोजें')}</h3><p>{label('Latest 200 events. Older sync events may not identify individual sources. Dates use this device’s timezone.','नवीनतम 200 घटनाएँ। पुरानी सिंक घटनाओं में अलग स्रोत नहीं दिख सकते। तारीखें इस डिवाइस के समय क्षेत्र में हैं।')}</p><div className="field-grid">
    <label>{label('Search source or person','स्रोत या व्यक्ति खोजें')}<input value={query} onChange={e=>setQuery(e.target.value)}/></label>
    <label>{label('Activity type','गतिविधि प्रकार')}<select value={action} onChange={e=>setAction(e.target.value)}><option value="">{label('All actions','सभी गतिविधियाँ')}</option>{[...new Set(overview.activity.map(i=>i.action))].map(key=><option key={key} value={key}>{actions[key]??key}</option>)}</select></label>
    <label>{label('From date','इस तारीख से')}<input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label>{label('Through date','इस तारीख तक')}<input type="date" value={to} min={from} onChange={e=>setTo(e.target.value)}/></label>
  </div><button type="button" onClick={()=>{setQuery('');setAction('');setFrom('');setTo('');}}>{label('Clear activity filters','गतिविधि फ़िल्टर हटाएँ')}</button>
  {!rows.length&&<p>{label('No matching activity.','कोई मिलती गतिविधि नहीं।')}</p>}<ol className="field-team-activity">{rows.map(item=><li key={item.id}><strong>{item.actorName}</strong> · {actions[item.action]??item.action}<p>{item.detail}</p><time dateTime={item.at}>{new Date(item.at).toLocaleString(hi?'hi-IN':'en-IN')}</time></li>)}</ol></section>;
}
