import type { FieldData, FieldSource, Scope } from './model';
import { localDate } from './operations';
import { csvCell } from './report';

export interface MonthlyFilters { month:string; state?:string; district?:string; village?:string; sourceId?:string; operator?:string }
export function monthlyReport(data:FieldData,scope:Scope,filters:MonthlyFilters,now=new Date()){
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(filters.month)||filters.month.startsWith('0000'))throw new Error('Invalid month');
  const start=filters.month+'-01', endDate=new Date(start+'T00:00:00Z');endDate.setUTCMonth(endDate.getUTCMonth()+1);endDate.setUTCDate(0);
  const end=endDate.toISOString().slice(0,10),today=localDate(now),cutoff=today<end?today:end;
  const sources=data.sources.filter(s=>s.scope===scope&&(!filters.state||(filters.state==='__unspecified__'?!s.state:s.state===filters.state))&&(!filters.district||s.district===filters.district)&&(!filters.village||s.village===filters.village)&&(!filters.sourceId||s.id===filters.sourceId)&&(!filters.operator||s.operator===filters.operator));
  const ids=new Set(sources.map(s=>s.id));
  const eligible=data.measurements.filter(m=>m.scope===scope&&ids.has(m.sourceId)&&Date.parse(m.createdAt)<=now.getTime());
  const visits=eligible.filter(m=>{const date=localDate(new Date(m.measuredAt));return date>=start&&date<=cutoff;}).sort((a,b)=>a.measuredAt.localeCompare(b.measuredAt)||a.id.localeCompare(b.id));
  const schedules=sources.flatMap(source=>monthOccurrences(source,start,end).map(occurrence=>{
    const completed=eligible.some(m=>m.sourceId===source.id&&m.scheduleId===occurrence.id&&localDate(new Date(m.measuredAt))<=cutoff);
    return {...occurrence,sourceId:source.id,code:source.code,status:completed?'completed':occurrence.date<today?'overdue':'upcoming'};
  }));
  const review=(id:string,source:FieldSource)=>source.visitReviews?.filter(r=>r.measurementId===id&&localDate(new Date(r.at))<=cutoff).at(-1)?.state??'SUBMITTED';
  const rows=visits.map(m=>({...m,source:sources.find(s=>s.id===m.sourceId)!,review:review(m.id,sources.find(s=>s.id===m.sourceId)!)}));
  const operators=[...new Set(visits.map(m=>m.operator))].sort().map(operator=>({operator,visits:visits.filter(m=>m.operator===operator).length}));
  const pendingRetests=data.investigations.filter(i=>i.scope===scope&&ids.has(i.sourceId)&&i.events.filter(e=>localDate(new Date(e.at))<=cutoff).at(-1)?.state==='RETEST_REQUESTED').length;
  return {filters,scope,start,end,cutoff,generatedAt:now.toISOString(),sources,rows,schedules,operators,pendingRetests,
    visited:new Set(visits.map(m=>m.sourceId)).size,unvisited:sources.filter(s=>!visits.some(m=>m.sourceId===s.id)),
    reviewed:rows.filter(m=>m.review==='REVIEWED').length,corrections:rows.filter(m=>m.review==='CORRECTIONS').length,submitted:rows.filter(m=>m.review==='SUBMITTED').length,
    anomalies:visits.filter(m=>m.comparison.status==='anomaly').length,qualityFlags:visits.filter(m=>m.quality.status!=='REPEATABLE').length};
}
function monthOccurrences(source:FieldSource,start:string,end:string){
  const plan=source.schedule;if(!plan||plan.date>end||plan.endDate&&plan.endDate<start)return [];
  const initial=new Date(plan.date+'T00:00:00Z'),first=new Date(start+'T00:00:00Z');
  let index=plan.recurrence==='WEEKLY'?Math.max(0,Math.ceil((first.getTime()-initial.getTime())/(7*86400000))):plan.recurrence==='MONTHLY'?Math.max(0,(first.getUTCFullYear()-initial.getUTCFullYear())*12+first.getUTCMonth()-initial.getUTCMonth()):0;
  const rows:{id:string;date:string}[]=[];
  for(let count=0;count<7;count++,index++){
    if(index&&!plan.recurrence)break;
    const date=new Date(initial);
    if(plan.recurrence==='WEEKLY')date.setUTCDate(date.getUTCDate()+7*index);
    if(plan.recurrence==='MONTHLY'){
      date.setUTCDate(1);date.setUTCMonth(date.getUTCMonth()+index);
      const last=new Date(date);last.setUTCMonth(last.getUTCMonth()+1);last.setUTCDate(0);
      date.setUTCDate(Math.min(initial.getUTCDate(),last.getUTCDate()));
    }
    const value=date.toISOString().slice(0,10);if(value>end||plan.endDate&&value>plan.endDate)break;
    if(value>=start)rows.push({id:index?`${plan.id}@${value}`:plan.id,date:value});
  }
  return rows;
}
export type MonthlyReport=ReturnType<typeof monthlyReport>;
export function monthlyCsv(report:MonthlyReport){
  const rows:unknown[][]=[['section','source','date','operator','metric','value','review','quality','comparison','previous_difference_us_cm']];
  rows.push(['report','',report.generatedAt,'','month',report.filters.month],['report','','','','scope',report.scope],['report','','','','filters',JSON.stringify(report.filters)],['report','','','','calendar',Intl.DateTimeFormat().resolvedOptions().timeZone],['report','','','','basis','Device records; current source plans; reviews through month end/today. Operator references are self-reported.'],['summary','','','','visits',report.rows.length],['summary','','','','sources_visited',report.visited],['summary','','','','sources_unvisited',report.unvisited.length],['summary','','','','pending_retests',report.pendingRetests]);
  for(const key of ['reviewed','corrections','submitted','anomalies','qualityFlags'] as const)rows.push(['summary','','','',key,report[key]]);
  for(const s of report.sources) rows.push(['source',s.code,'',s.operator,'location',[s.state||'Not specified',s.district,s.village].join(' / ')]);
  for(const s of report.schedules)rows.push(['schedule',s.code,s.date,'',s.id,s.status]);
  for(const m of report.rows)rows.push(['visit',m.source.code,m.measuredAt,m.operator,'ec_us_cm',m.quality.representativeRawEcUsCm,m.review,m.quality.status,m.comparison.status,m.comparison.previousDifference]);
  for(const item of report.operators)rows.push(['operator','','',item.operator,'visits',item.visits]);
  for(const s of report.unvisited)rows.push(['unvisited',s.code,'',s.operator,'village',s.village]);
  return '\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n');
}
