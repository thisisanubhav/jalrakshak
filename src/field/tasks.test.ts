import { describe, it, expect } from 'vitest';
import { fieldTasks, filterSources, emptySourceFilters } from './tasks';
import type { FieldData, FieldSource, FieldMeasurement, Investigation } from './model';
const source = (id:string, patch:Partial<FieldSource>={}):FieldSource => ({id,code:id,name:`Pump ${id}`,village:'Village A',district:'Khunti',scope:'MANUAL_FIELD',category:'HANDPUMP',location:'',operator:'OP',createdAt:'2026-01-01T00:00:00.000Z',updatedAt:'2026-01-01T00:00:00.000Z',...patch});
const investigation=(id:string,sourceId:string,state:Investigation['state']):Investigation=>({id,sourceId,scope:'MANUAL_FIELD',measurementId:`m-${sourceId}`,cause:'review',state,events:[{id:`e-${id}`,state,at:'2026-01-02T00:00:00.000Z',note:'Evidence',operator:'OP',finding:'UNDETERMINED'}]});
const data:FieldData={sources:[source('A'),source('B',{village:'Village B',category:'WELL'}),source('C'),source('demo',{scope:'SYNTHETIC_DEMO'})],measurements:[{id:'m-B',sourceId:'B',scope:'MANUAL_FIELD'},{id:'m-C',sourceId:'C',scope:'MANUAL_FIELD'}] as FieldMeasurement[],investigations:[investigation('review','B','NEEDS_REVIEW'),investigation('retest','C','RETEST_REQUESTED'),investigation('closed','A','CLOSED_UNCONFIRMED'),{...investigation('training','demo','RETEST_REQUESTED'),scope:'SYNTHETIC_DEMO'}]};
describe('field work queue and search',()=>{
  it('prioritizes retests, then reviews, then first visits without mixing training or closed work',()=>{
    expect(fieldTasks(data,'MANUAL_FIELD').map(t=>[t.source.id,t.kind,t.investigationId])).toEqual([['C','retest','retest'],['B','followup','review'],['A','first',undefined]]);
  });
  it('removes finished work and first visits after a saved measurement',()=>{
    expect(fieldTasks({...data,measurements:[...data.measurements,{sourceId:'A',scope:'MANUAL_FIELD'} as FieldMeasurement],investigations:[]},'MANUAL_FIELD')).toEqual([]);
  });
  it('searches normalized identifiers, names, villages and districts and combines filters',()=>{
    expect(filterSources(data,'MANUAL_FIELD',{...emptySourceFilters,query:'  pump b ',village:'Village B',category:'WELL',status:'followup'}).map(s=>s.id)).toEqual(['B']);
    expect(filterSources(data,'MANUAL_FIELD',{...emptySourceFilters,query:'KHUNTI',status:'retests'}).map(s=>s.id)).toEqual(['C']);
    expect(filterSources(data,'MANUAL_FIELD',{...emptySourceFilters,village:'Village A',category:'WELL'})).toEqual([]);
  });
  it('distinguishes no first reading from no open investigation and hides foreign scopes',()=>{
    expect(filterSources(data,'MANUAL_FIELD',{...emptySourceFilters,status:'unmeasured'}).map(s=>s.id)).toEqual(['A']);
    expect(filterSources(data,'MANUAL_FIELD',{...emptySourceFilters,status:'clear'}).map(s=>s.id)).toEqual(['A']);
    expect(filterSources(data,'MANUAL_FIELD',emptySourceFilters).map(s=>s.id)).toEqual(['A','B','C']);
  });
  it('routes a recorded retest to review instead of asking for another visit',()=>{
    const updated={...data,measurements:[...data.measurements,{id:'ret',sourceId:'C',scope:'MANUAL_FIELD',investigationId:'retest',measuredAt:'2026-01-03T00:00:00.000Z'} as FieldMeasurement]};
    expect(fieldTasks(updated,'MANUAL_FIELD').find(t=>t.id==='retest')?.kind).toBe('followup');
  });
  it('does not generate tasks from records for inaccessible sources',()=>{
    expect(fieldTasks({...data,sources:[source('A')]},'MANUAL_FIELD').map(t=>t.source.id)).toEqual(['A']);
  });
});
