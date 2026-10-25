import { ReportAiDraft } from './ReportAiDraft';
import type { Translate } from '@/field/i18n';
import { useState } from 'react';
import type { FieldData, Scope } from '@/field/model';
import { monthlyCsv, monthlyReport } from '@/field/monthly-report';
import { localDate } from '@/field/operations';

export function MonthlyReport({data,scope,t,supervisor,onOpen}:{data:FieldData;scope:Scope;t:Translate;supervisor:boolean;onOpen:(id:string)=>void}){
  const [month,setMonth]=useState(()=>localDate().slice(0,7)),[village,setVillage]=useState(''),[sourceId,setSource]=useState(''),[operator,setOperator]=useState('');
  const sources=data.sources.filter(s=>s.scope===scope);
  const report=/^\d{4}-(0[1-9]|1[0-2])$/.test(month)&&!month.startsWith('0000')?monthlyReport(data,scope,{month,village,sourceId,operator}):undefined;
  function download(){if(!report)return;const url=URL.createObjectURL(new Blob([monthlyCsv(report)],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download=`jalrakshak-monthly-${month}.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  return <section className="field-card" aria-label="Monthly report / मासिक रिपोर्ट">
    <div className="no-print"><h2>Monthly report / मासिक रिपोर्ट</h2><div className="field-grid">
      <label>Report month / रिपोर्ट माह<input aria-label="Report month / रिपोर्ट माह" type="month" min="0001-01" max="9998-12" value={month} onChange={e=>setMonth(e.target.value)} /></label>
      <label>Village / गाँव<select aria-label="Report village" value={village} onChange={e=>setVillage(e.target.value)}><option value="">All / सभी</option>{[...new Set(sources.map(s=>s.village))].sort().map(v=><option key={v}>{v}</option>)}</select></label>
      <label>Source / स्रोत<select aria-label="Report source" value={sourceId} onChange={e=>setSource(e.target.value)}><option value="">All / सभी</option>{sources.map(s=><option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}</select></label>
      <label>Source operator reference / स्रोत ऑपरेटर संदर्भ<select aria-label="Report operator" value={operator} onChange={e=>setOperator(e.target.value)}><option value="">All / सभी</option>{[...new Set(sources.map(s=>s.operator))].sort().map(v=><option key={v}>{v}</option>)}</select></label>
    </div><div className="field-actions"><button type="button" disabled={!report} onClick={download}>Download monthly CSV / मासिक CSV डाउनलोड करें</button><button type="button" disabled={!report} onClick={()=>window.print()}>Print monthly report / मासिक रिपोर्ट प्रिंट करें</button></div></div>
    {report&&supervisor&&scope==='MANUAL_FIELD'&&<ReportAiDraft key={JSON.stringify([t('navHome'),month,village,sourceId,operator,data.sources.map(s=>s.updatedAt),data.measurements.map(m=>m.id),data.investigations])} kind="monthly" filters={{month,village,sourceId,operator}} t={t} onOpen={onOpen} />}
    {!report?<p role="alert">Select a valid month. / सही माह चुनें।</p>:<article className="judge-report field-report" data-testid="monthly-report">
      <h2>JalRakshak · {month} · Monthly report / मासिक रिपोर्ट</h2><p>Generated / बनाया गया: {new Date(report.generatedAt).toLocaleString()} · {scope==='SYNTHETIC_DEMO'?'TRAINING / अभ्यास':'FIELD RECORDS / फील्ड रिकॉर्ड'}</p>
      <p>Village / गाँव: {village||'All / सभी'} · Source / स्रोत: {sources.find(s=>s.id===sourceId)?.code||'All / सभी'} · Operator / ऑपरेटर: {operator||'All / सभी'}</p>
      <p>Uses records currently available on this device and its local calendar. Sync before preparing a team report. Operator references are self-reported. Schedule totals use current plans; replaced plans cannot be reconstructed. Reviews and pending retests are shown through month end, or today for the current month. / डिवाइस के रिकॉर्ड और स्थानीय तारीखें उपयोग होती हैं। टीम रिपोर्ट से पहले सिंक करें। ऑपरेटर संदर्भ स्वयं दर्ज हैं; कार्यक्रम के आँकड़े वर्तमान योजना पर आधारित हैं।</p>
      <div className="field-work-summary"><div><strong>{report.rows.length}</strong><span>Visits / दौरे</span></div><div><strong>{report.visited} / {report.sources.length}</strong><span>Sources visited / देखे गए स्रोत</span></div><div><strong>{report.schedules.length}</strong><span>Scheduled / निर्धारित</span></div><div><strong>{report.schedules.filter(s=>s.status==='overdue').length}</strong><span>Overdue / लंबित</span></div></div>
      <p>Scheduled completed / निर्धारित पूर्ण: {report.schedules.filter(s=>s.status==='completed').length} · Upcoming or due today / आगामी या आज: {report.schedules.filter(s=>s.status==='upcoming').length}</p>
      <p>Submitted / जमा: {report.submitted} · Reviewed / समीक्षित: {report.reviewed} · Corrections / सुधार: {report.corrections}</p><p>Unusual readings / असामान्य रीडिंग: {report.anomalies} · Quality flags / गुणवत्ता संकेत: {report.qualityFlags} · Pending retests / लंबित पुनर्परीक्षण: {report.pendingRetests}</p>
      <h3>Activity by recorded operator / दर्ज ऑपरेटर के अनुसार कार्य</h3><ul>{report.operators.map(item=><li key={item.operator}>{item.operator}: {item.visits}</li>)}</ul>
      <h3>Readings over the month / माह की रीडिंग</h3>{!report.rows.length&&<p>No visits in this selection. / इस चयन में कोई दौरा नहीं।</p>}
      <ul className="field-task-list">{report.rows.map(m=><li key={m.id}><div><strong>{m.source.code} · {new Date(m.measuredAt).toLocaleString()}</strong><p>{m.operator} · EC: {m.quality.representativeRawEcUsCm??'—'} µS/cm · Δ previous / पिछला अंतर: {m.comparison.previousDifference??'—'}</p><p>{m.review} · {m.quality.status} · {m.comparison.status}</p></div></li>)}</ul>
      <h3>Schedule outcomes / कार्यक्रम की स्थिति</h3><ul>{report.schedules.map(s=><li key={`${s.sourceId}/${s.id}`}>{s.code} · {s.date} · {s.status}</li>)}</ul>
      <h3>Sources not visited / बिना दौरे के स्रोत</h3><ul>{report.unvisited.map(s=><li key={s.id}>{s.code} · {s.name} · {s.village}</li>)}</ul>
      <p>EC readings do not certify drinking-water safety. / EC रीडिंग पेयजल सुरक्षा प्रमाणित नहीं करती।</p>
    </article>}
  </section>;
}
