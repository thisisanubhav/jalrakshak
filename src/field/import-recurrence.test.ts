import { readFileSync } from 'node:fs';
import 'fake-indexeddb/auto';
import { afterEach, expect, it } from 'vitest';
import { JalRakshakDatabase } from '@/data/database';
import { previewSourceImport, sourceCsvTemplate } from './source-import';
import { defaultRule, validateSource, type FieldSource, type FieldMeasurement, type MeasurementInput } from './model';
import { nextScheduledVisit, scheduleStatus } from './operations';
import { importFieldSources, readField, saveFieldMeasurement, saveFieldSource } from './store';
import { createBackup, parseBackup, restoreBackup } from './backup';
const databases:JalRakshakDatabase[]=[];
const database=()=>{const db=new JalRakshakDatabase('import-recurrence-'+crypto.randomUUID());databases.push(db);return db;};
afterEach(async()=>{for(const db of databases.splice(0))await db.delete();});
const base=()=>previewSourceImport(sourceCsvTemplate,[]).rows[0].source!;
const visit=(source:FieldSource,scheduleId:string)=>({sourceId:source.id,scope:source.scope,scheduleId}) as FieldMeasurement;
it('parses BOM, CRLF, quoted commas, escaped quotes and multiline locations',()=>{
  const csv='\uFEFFcode,name,village,district,category,operator,location\r\nA,"School, east",V,D,well,OP,"Near ""school""\nGate"\r\n';
  const result=previewSourceImport(csv,[]);expect(result.issues).toEqual([]);expect(result.rows[0].issues).toEqual([]);
  expect(result.rows[0].source).toMatchObject({code:'A',name:'School, east',category:'WELL',location:'Near "school"\nGate'});
});
it('flags all duplicate rows and existing codes without allowing overwrite',()=>{
  const header='code,name,village,district,category,operator\n';
  const result=previewSourceImport(header+'a,P,V,D,WELL,OP\n A ,Q,V,D,WELL,OP',[]);
  expect(result.rows.every(row=>row.issues.includes('csvDuplicate'))).toBe(true);
  expect(previewSourceImport(sourceCsvTemplate,[base()]).rows[0].issues).toContain('csvDuplicate');
});
it('rejects malformed headers, quotes, missing cells, categories and coordinates',()=>{
  expect(previewSourceImport('code,name\nA,B',[]).issues).toContain('csvHeaders');
  expect(previewSourceImport(sourceCsvTemplate+'"unfinished',[]).issues).toContain('csvSyntax');
  expect(previewSourceImport(sourceCsvTemplate.replace('23.61','91'),[]).rows[0].issues).toContain('csvCoordinates');
  expect(previewSourceImport(sourceCsvTemplate.replace('85.52',''),[]).rows[0].issues).toContain('csvCoordinates');
  expect(previewSourceImport(sourceCsvTemplate.replace('HANDPUMP','UNKNOWN'),[]).rows[0].issues).toContain('csvCategory');
  expect(previewSourceImport(sourceCsvTemplate.replace('School handpump',''),[]).rows[0].issues).toContain('csvRequired');
  expect(previewSourceImport('x'.repeat(1_000_001),[]).issues).toContain('csvLimit');
});
it('bounds imports to 500 records',()=>{
  const header='code,name,village,district,category,operator\n';
  const rows=Array.from({length:501},(_,i)=>`${i},P,V,D,WELL,OP`);
  expect(previewSourceImport(header+rows.join('\n'),[]).issues).toContain('csvLimit');
  expect(previewSourceImport(header+rows.slice(0,500).join('\n'),[]).rows).toHaveLength(500);
});
it('commits all sources together and rechecks duplicates after a stale preview',async()=>{
  const db=database();const first=base();await importFieldSources([first],db);
  const newSource={...base(),code:'NEW'},duplicate={...base(),code:first.code.toLowerCase()};
  await expect(importFieldSources([newSource,duplicate],db)).rejects.toThrow('duplicate');
  expect(await db.fieldSources.count()).toBe(1);
  await expect(importFieldSources([first],db)).rejects.toThrow('duplicate');
  await importFieldSources([newSource],db);expect(await db.fieldSources.count()).toBe(2);
});
it('keeps missed weekly occurrences overdue until each is explicitly completed',()=>{
  const source={...base(),schedule:{id:'p',date:'2026-01-01',createdAt:new Date().toISOString(),note:'',recurrence:'WEEKLY' as const}};
  expect(nextScheduledVisit(source,[])).toEqual({id:'p',date:'2026-01-01'});
  const visits=[visit(source,'p')];expect(nextScheduledVisit(source,visits)).toEqual({id:'p@2026-01-08',date:'2026-01-08'});
  expect(scheduleStatus(source,visits,'2026-02-01')).toBe('overdue');
  expect(nextScheduledVisit(source,[...visits,visit({...source,id:'other'},'p@2026-01-08')])?.date).toBe('2026-01-08');
});
it('anchors monthly schedules across short months, leap years and year rollover',()=>{
  for(const [start,second,third] of [['2024-01-31','2024-02-29','2024-03-31'],['2025-01-31','2025-02-28','2025-03-31'],['2025-12-31','2026-01-31','2026-02-28']]){
    const source={...base(),schedule:{id:'p',date:start,createdAt:new Date().toISOString(),note:'',recurrence:'MONTHLY' as const}};
    expect(nextScheduledVisit(source,[visit(source,'p')])?.date).toBe(second);
    expect(nextScheduledVisit(source,[visit(source,'p'),visit(source,`p@${second}`)])?.date).toBe(third);
  }
});
it('ends a recurring series inclusively and rejects invalid recurrence definitions',()=>{
  const source={...base(),schedule:{id:'p',date:'2026-01-01',createdAt:new Date().toISOString(),note:'',recurrence:'WEEKLY' as const,endDate:'2026-01-08'}};
  expect(nextScheduledVisit(source,[visit(source,'p')])?.date).toBe('2026-01-08');
  expect(scheduleStatus(source,[visit(source,'p'),visit(source,'p@2026-01-08')])).toBe('completed');
  expect(()=>validateSource({...source,schedule:{...source.schedule,endDate:'2025-12-31'}})).toThrow();
  expect(()=>validateSource({...source,schedule:{...source.schedule,recurrence:undefined}})).toThrow();
});
it('saves each occurrence once and restores the next due date from backup',async()=>{
  const db=database();const source={...base(),schedule:{id:'p',date:'2026-01-01',createdAt:new Date().toISOString(),note:'',recurrence:'MONTHLY' as const}};
  await saveFieldSource(source,undefined,db);
  const input:MeasurementInput={id:'v1',scope:source.scope,sourceId:source.id,scheduleId:'p',measuredAt:'2026-01-01T12:00:00.000Z',readings:[600,602],instrument:'Meter',device:'',probe:'',method:'DIRECT_SOURCE',operator:'OP',notes:'',calibrationDate:'',calibrationReference:''};
  await saveFieldMeasurement(input,defaultRule,db);
  await expect(saveFieldMeasurement({...input,id:'duplicate'},defaultRule,db)).rejects.toThrow('conflict');
  const copy=database();await restoreBackup(parseBackup(JSON.stringify(await createBackup(db))),copy);
  const restored=await readField(source.scope,copy);expect(nextScheduledVisit(restored.sources[0],restored.measurements)).toEqual({id:'p@2026-02-01',date:'2026-02-01'});
});

it('accepts the documented fictional source CSV without invented GPS coordinates',()=>{
  const csv=readFileSync(new URL('../../docs/samples/sources.csv',import.meta.url),'utf8');
  const result=previewSourceImport(csv,[]);
  expect(result.issues).toEqual([]);
  expect(result.rows).toHaveLength(3);
  for(const row of result.rows){
    expect(row.issues).toEqual([]);
    expect(row.source?.code).toMatch(/^SAMPLE-/);
    expect(row.source?.latitude).toBeUndefined();
    expect(row.source?.longitude).toBeUndefined();
  }
});
