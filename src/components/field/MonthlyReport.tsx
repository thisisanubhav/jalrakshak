
import { UiText, pickLanguage, useUiLanguage } from '@/components/UiLanguage';
import { ReportAiDraft } from './ReportAiDraft';
import type { Translate } from '@/field/i18n';
import { useState } from 'react';
import type { FieldData, Scope } from '@/field/model';
import { monthlyCsv, monthlyReport } from '@/field/monthly-report';
import { localDate } from '@/field/operations';

export function MonthlyReport({data,scope,t,supervisor,onOpen}:{data:FieldData;scope:Scope;t:Translate;supervisor:boolean;onOpen:(id:string)=>void}){
  const {locale:uiLocale}=useUiLanguage();
  const [month,setMonth]=useState(()=>localDate().slice(0,7)),[state,setState]=useState(''),[district,setDistrict]=useState(''),[village,setVillage]=useState(''),[sourceId,setSource]=useState(''),[operator,setOperator]=useState('');
  const sources=data.sources.filter(s=>s.scope===scope);
  const report=/^\d{4}-(0[1-9]|1[0-2])$/.test(month)&&!month.startsWith('0000')?monthlyReport(data,scope,{month,state,district,village,sourceId,operator}):undefined;
  function download(){if(!report)return;const url=URL.createObjectURL(new Blob([monthlyCsv(report)],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download=`jalrakshak-monthly-${month}.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  return <section className="field-card" aria-label={pickLanguage("Monthly report / मासिक रिपोर्ट",uiLocale)}>
    <div className="no-print"><h2><UiText text={"Monthly report / मासिक रिपोर्ट"}/></h2><div className="field-grid">
      <label><UiText text={"Report month / रिपोर्ट माह"}/><input aria-label={pickLanguage("Report month / रिपोर्ट माह",uiLocale)} type="month" min="0001-01" max="9998-12" value={month} onChange={e=>setMonth(e.target.value)} /></label>
      <label>{t('state')}<select aria-label="Report state" value={state} onChange={e=>{setState(e.target.value);setDistrict('');setVillage('');setSource('');}}><option value="">{t('allStates')}</option><option value="__unspecified__">{t('locationUnspecified')}</option>{[...new Set(sources.map(s=>s.state).filter(Boolean))].sort().map(v=><option key={v}>{v}</option>)}</select></label>
      <label>{t('district')}<select aria-label="Report district" value={district} onChange={e=>{setDistrict(e.target.value);setVillage('');setSource('');}}><option value="">{t('allDistricts')}</option>{[...new Set(sources.filter(s=>!state||(state==='__unspecified__'?!s.state:s.state===state)).map(s=>s.district))].sort().map(v=><option key={v}>{v}</option>)}</select></label>
      <label><UiText text={"Village / गाँव"}/><select aria-label="Report village" value={village} onChange={e=>setVillage(e.target.value)}><option value=""><UiText text={"All / सभी"}/></option>{[...new Set(sources.map(s=>s.village))].sort().map(v=><option key={v}>{v}</option>)}</select></label>
      <label><UiText text={"Source / स्रोत"}/><select aria-label="Report source" value={sourceId} onChange={e=>setSource(e.target.value)}><option value=""><UiText text={"All / सभी"}/></option>{sources.map(s=><option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}</select></label>
      <label><UiText text={"Source operator reference / स्रोत ऑपरेटर संदर्भ"}/><select aria-label="Report operator" value={operator} onChange={e=>setOperator(e.target.value)}><option value=""><UiText text={"All / सभी"}/></option>{[...new Set(sources.map(s=>s.operator))].sort().map(v=><option key={v}>{v}</option>)}</select></label>
    </div><div className="field-actions"><button type="button" disabled={!report} onClick={download}><UiText text={"Download monthly CSV / मासिक CSV डाउनलोड करें"}/></button><button type="button" disabled={!report} onClick={()=>window.print()}><UiText text={"Print monthly report / मासिक रिपोर्ट प्रिंट करें"}/></button></div></div>
    {report&&supervisor&&scope==='MANUAL_FIELD'&&<ReportAiDraft key={JSON.stringify([t('navHome'),month,state,district,village,sourceId,operator,data.sources.map(s=>s.updatedAt),data.measurements.map(m=>m.id),data.investigations])} kind="monthly" filters={{month,state,district,village,sourceId,operator}} t={t} onOpen={onOpen} />}
    {!report?<p role="alert"><UiText text={"Select a valid month. / सही माह चुनें।"}/></p>:<article className="judge-report field-report" data-testid="monthly-report">
      <h2>JalRakshak · {month} <UiText text={"· Monthly report / मासिक रिपोर्ट"}/></h2><p><UiText text={"Generated / बनाया गया:"}/>{new Date(report.generatedAt).toLocaleString()} · {scope==='SYNTHETIC_DEMO'?<UiText text={"TRAINING / अभ्यास"}/>:<UiText text={"FIELD RECORDS / फील्ड रिकॉर्ड"}/>}</p>
      <p>{t('state')}: {state==='__unspecified__'?t('locationUnspecified'):state||t('allStates')} · {t('district')}: {district||t('allDistricts')}</p>
      <p><UiText text={"Village / गाँव:"}/>{village||<UiText text={"All / सभी"}/>} <UiText text={"· Source / स्रोत:"}/>{sources.find(s=>s.id===sourceId)?.code||<UiText text={"All / सभी"}/>} <UiText text={"· Operator / ऑपरेटर:"}/>{operator||<UiText text={"All / सभी"}/>}</p>
      <p><UiText text={"Uses records currently available on this device and its local calendar. Sync before preparing a team report. Operator references are self-reported. Schedule totals use current plans; replaced plans cannot be reconstructed. Reviews and pending retests are shown through month end, or today for the current month. / डिवाइस के रिकॉर्ड और स्थानीय तारीखें उपयोग होती हैं। टीम रिपोर्ट से पहले सिंक करें। ऑपरेटर संदर्भ स्वयं दर्ज हैं; कार्यक्रम के आँकड़े वर्तमान योजना पर आधारित हैं।"}/></p>
      <div className="field-work-summary"><div><strong>{report.rows.length}</strong><span><UiText text={"Visits / दौरे"}/></span></div><div><strong>{report.visited} / {report.sources.length}</strong><span><UiText text={"Sources visited / देखे गए स्रोत"}/></span></div><div><strong>{report.schedules.length}</strong><span><UiText text={"Scheduled / निर्धारित"}/></span></div><div><strong>{report.schedules.filter(s=>s.status==='overdue').length}</strong><span><UiText text={"Overdue / लंबित"}/></span></div></div>
      <p><UiText text={"Scheduled completed / निर्धारित पूर्ण:"}/>{report.schedules.filter(s=>s.status==='completed').length} <UiText text={"· Upcoming or due today / आगामी या आज:"}/>{report.schedules.filter(s=>s.status==='upcoming').length}</p>
      <p><UiText text={"Submitted / जमा:"}/>{report.submitted} <UiText text={"· Reviewed / समीक्षित:"}/>{report.reviewed} <UiText text={"· Corrections / सुधार:"}/>{report.corrections}</p><p><UiText text={"Unusual readings / असामान्य रीडिंग:"}/>{report.anomalies} <UiText text={"· Quality flags / गुणवत्ता संकेत:"}/>{report.qualityFlags} <UiText text={"· Pending retests / लंबित पुनर्परीक्षण:"}/>{report.pendingRetests}</p>
      <h3><UiText text={"Activity by recorded operator / दर्ज ऑपरेटर के अनुसार कार्य"}/></h3><ul>{report.operators.map(item=><li key={item.operator}>{item.operator}: {item.visits}</li>)}</ul>
      <h3><UiText text={"Readings over the month / माह की रीडिंग"}/></h3>{!report.rows.length&&<p><UiText text={"No visits in this selection. / इस चयन में कोई दौरा नहीं।"}/></p>}
      <ul className="field-task-list">{report.rows.map(m=><li key={m.id}><div><strong>{m.source.code} · {new Date(m.measuredAt).toLocaleString()}</strong><p>{m.operator} · EC: {m.quality.representativeRawEcUsCm??'—'} <UiText text={"µS/cm · Δ previous / पिछला अंतर:"}/>{m.comparison.previousDifference??'—'}</p><p>{m.review} · {m.quality.status} · {m.comparison.status}</p></div></li>)}</ul>
      <h3><UiText text={"Schedule outcomes / कार्यक्रम की स्थिति"}/></h3><ul>{report.schedules.map(s=><li key={`${s.sourceId}/${s.id}`}>{s.code} · {s.date} · {s.status}</li>)}</ul>
      <h3><UiText text={"Sources not visited / बिना दौरे के स्रोत"}/></h3><ul>{report.unvisited.map(s=><li key={s.id}>{s.code} · {s.name} · {s.village}</li>)}</ul>
      <p><UiText text={"EC readings do not certify drinking-water safety. / EC रीडिंग पेयजल सुरक्षा प्रमाणित नहीं करती।"}/></p>
    </article>}
  </section>;
}
