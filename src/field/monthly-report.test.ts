import { expect,it } from 'vitest';
import { monthlyReport,monthlyCsv } from './monthly-report';
import { defaultRule,type FieldData,type FieldSource,type FieldMeasurement } from './model';
import { evaluateECRepeatability } from '@/ec/measurement-quality';
const at='2026-01-01T12:00:00.000Z',now=new Date('2026-04-01T12:00:00Z');
const source:FieldSource={id:'s',code:'S',name:'Pump',village:'Village',district:'D',category:'WELL',location:'',operator:'OP',scope:'MANUAL_FIELD',createdAt:at,updatedAt:at,schedule:{id:'plan',date:'2026-01-31',note:'',createdAt:at,recurrence:'MONTHLY'}};
const visit:FieldMeasurement={id:'v',sourceId:'s',scope:'MANUAL_FIELD',measuredAt:'2026-02-28T12:00:00.000Z',createdAt:'2026-02-28T12:00:00.000Z',readings:[600,602],instrument:'Meter',device:'',probe:'',calibrationDate:'',calibrationReference:'',method:'DIRECT_SOURCE',operator:'OP',notes:'',quality:evaluateECRepeatability([600,602]),comparison:{status:'anomaly',count:3,includedIds:[],excluded:[],previousDifference:100},rule:defaultRule,scheduleId:'plan@2026-02-28'};
const data=():FieldData=>({sources:[source],measurements:[visit],investigations:[]});
it('counts monthly anchored occurrences, completed visits, quality and coverage',()=>{
  const result=monthlyReport(data(),'MANUAL_FIELD',{month:'2026-02'},now);
  expect(result.schedules).toEqual([{id:'plan@2026-02-28',date:'2026-02-28',sourceId:'s',code:'S',status:'completed'}]);
  expect(result.visited).toBe(1);expect(result.anomalies).toBe(1);expect(result.operators).toEqual([{operator:'OP',visits:1}]);
  expect(monthlyReport(data(),'MANUAL_FIELD',{month:'2026-03'},now).schedules[0].date).toBe('2026-03-31');
});
it('does not skip missed weekly visits and respects inclusive end date',()=>{
  const input=data();input.sources=[{...source,schedule:{...source.schedule!,date:'2026-02-01',recurrence:'WEEKLY',endDate:'2026-02-15'}}];
  const result=monthlyReport(input,'MANUAL_FIELD',{month:'2026-02'},now);expect(result.schedules.map(s=>s.date)).toEqual(['2026-02-01','2026-02-08','2026-02-15']);expect(result.schedules.every(s=>s.status==='overdue')).toBe(true);
});
it('isolates scope and filters and includes empty-month coverage',()=>{
  const input=data();input.sources.push({...source,id:'demo',scope:'SYNTHETIC_DEMO'});
  expect(monthlyReport(input,'MANUAL_FIELD',{month:'2026-01'},now).unvisited).toHaveLength(1);
  for(const filters of [{village:'Other'},{operator:'OTHER'},{sourceId:'missing'}])expect(monthlyReport(input,'MANUAL_FIELD',{month:'2026-02',...filters},now).rows).toHaveLength(0);
  expect(()=>monthlyReport(input,'MANUAL_FIELD',{month:'2026-13'},now)).toThrow();
});
it('uses review and retest state through month end rather than later changes',()=>{
  const input=data();input.sources=[{...source,visitReviews:[{id:'r',measurementId:'v',at:'2026-03-01T12:00:00.000Z',state:'REVIEWED',note:'OK',reviewerId:'u',reviewerName:'U'}]}];
  input.investigations=[{id:'i',sourceId:'s',measurementId:'v',scope:'MANUAL_FIELD',cause:'anomaly',state:'CLOSED_UNCONFIRMED',events:[{id:'a',at:'2026-02-28T12:00:00.000Z',state:'RETEST_REQUESTED',operator:'OP',note:'Retest',finding:'UNDETERMINED'},{id:'b',at:'2026-03-01T12:00:00.000Z',state:'CLOSED_UNCONFIRMED',operator:'OP',note:'Closed',finding:'UNDETERMINED'}]}];
  const result=monthlyReport(input,'MANUAL_FIELD',{month:'2026-02'},now);expect(result.submitted).toBe(1);expect(result.reviewed).toBe(0);expect(result.pendingRetests).toBe(1);
});
it('exports summary, evidence and filters with spreadsheet formula protection',()=>{
  const input=data();input.sources=[{...source,code:'=SUM(1,1)'}];input.measurements=[{...visit,operator:'@bad'}];
  const csv=monthlyCsv(monthlyReport(input,'MANUAL_FIELD',{month:'2026-02'},now));expect(csv).toContain('"\'=SUM(1,1)"');expect(csv).toContain('"\'@bad"');expect(csv).toContain('"pending_retests","0"');expect(csv).toContain('"REPEATABLE","anomaly","100"');
});
