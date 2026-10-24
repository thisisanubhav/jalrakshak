import { expect, it } from 'vitest';
import { mergeRecords } from './merge';
import { TeamStore } from './server';
import type { FieldData, FieldSource, Investigation } from '@/field/model';
const source:FieldSource={id:'s1',code:'S1',name:'Pump',scope:'MANUAL_FIELD',village:'Village',district:'Khunti',location:'',category:'HANDPUMP',operator:'OP',createdAt:'2026-01-01T00:00:00.000Z',updatedAt:'2026-01-01T00:00:00.000Z'};
const data=(s:Partial<FieldSource>={}):FieldData=>({sources:[{...source,...s}],measurements:[],investigations:[]});
const snapshot=(d:FieldData)=>({data:d,assignments:{s1:'worker'},revision:'v2'});
it('combines edits to different fields without losing remote changes',()=>{const plan=mergeRecords(data(),data({name:'Local pump'}),snapshot(data({village:'Remote village'})));expect(plan.conflicts).toEqual([]);expect(plan.data.sources[0]).toMatchObject({name:'Local pump',village:'Remote village'});});
it('requires an explicit choice for overlapping edits',()=>{const local=data({name:'Local'}),remote=snapshot(data({name:'Remote'}));const plan=mergeRecords(data(),local,remote);expect(plan.conflicts).toHaveLength(1);expect(mergeRecords(data(),local,remote,{[plan.conflicts[0].key]:'local'}).data.sources[0].name).toBe('Local');expect(mergeRecords(data(),local,remote,{[plan.conflicts[0].key]:'remote'}).data.sources[0].name).toBe('Remote');});
it('preserves independently added sources from both devices',()=>{const local=data();local.sources.push({...source,id:'s2',code:'S2'});const remote=data();remote.sources.push({...source,id:'s3',code:'S3'});expect(mergeRecords(data(),local,snapshot(remote)).data.sources).toHaveLength(3);});
it('requires acknowledgement for reassigned work and never restores unauthorized records',()=>{const remote=snapshot({sources:[],measurements:[],investigations:[]});const local=data({name:'Pending'});const plan=mergeRecords(data(),local,remote);expect(plan.conflicts[0].localAllowed).toBe(false);expect(mergeRecords(data(),local,remote,{'access:s1':'local'}).conflicts).toHaveLength(1);expect(mergeRecords(data(),local,remote,{'access:s1':'remote'}).data.sources).toHaveLength(0);});
it('detects duplicate new source codes instead of silently replacing a source',()=>{const local=data({id:'other'});const plan=mergeRecords({sources:[],measurements:[],investigations:[]},local,snapshot(data()));expect(plan.conflicts[0].key).toBe('duplicate:other');expect(plan.data.sources).toEqual(data().sources);});
it('merges removal of optional coordinates as a pair',()=>{const base=data({latitude:23,longitude:85});expect(mergeRecords(base,data(),snapshot(base)).data.sources[0].latitude).toBeUndefined();});
it('resolved source changes pass server checks and stale resolutions still fail',()=>{const store=new TeamStore(':memory:');try{const user=store.createUser(null,'supervisor','Supervisor','test-private-password','supervisor');store.sync(user,store.snapshot(user).revision,data());const base=store.snapshot(user);store.sync(user,base.revision,data({name:'Remote'}));const remote=store.snapshot(user);const merged=mergeRecords(base.data,data({name:'Local'}),remote,{'source:s1:name':'local'});expect(store.sync(user,remote.revision,merged.data).data.sources[0].name).toBe('Local');expect(()=>store.sync(user,remote.revision,data({name:'Other'}))).toThrow('changed');}finally{store.sql.close();}});

const event={id:'e1',at:'2026-01-01T00:00:00.000Z',state:'NEEDS_REVIEW' as const,note:'Initial',operator:'OP',finding:'UNDETERMINED' as const};
const investigation:Investigation={id:'i1',sourceId:'s1',scope:'MANUAL_FIELD',measurementId:'m1',cause:'review',state:'NEEDS_REVIEW',events:[event]};
it('retains appended investigation evidence when histories share a prefix',()=>{
  const base=data();base.investigations=[investigation];const local=structuredClone(base);local.investigations[0].events.push({...event,id:'e2',note:'Follow-up'});
  const merged=mergeRecords(base,local,snapshot(base));expect(merged.conflicts).toHaveLength(0);expect(merged.data.investigations[0].events).toHaveLength(2);
});
it('requires acknowledgement for divergent evidence and never overwrites shared events',()=>{
  const base=data();base.investigations=[investigation];const local=structuredClone(base),remote=structuredClone(base);
  local.investigations[0].events.push({...event,id:'local',note:'Local branch'});remote.investigations[0].events.push({...event,id:'remote',note:'Shared branch'});
  const plan=mergeRecords(base,local,snapshot(remote));expect(plan.conflicts[0].localAllowed).toBe(false);
  expect(mergeRecords(base,local,snapshot(remote),{'investigations:i1':'remote'}).data.investigations[0].events).toEqual(remote.investigations[0].events);
});
