import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { states, districtByName, locationDirectory } from './locations';
import { validateSource, type FieldSource } from './model';
import { previewSourceImport } from './source-import';
import { monthlyReport, monthlyCsv } from './monthly-report';
import { filterSources, emptySourceFilters } from './tasks';
import { JalRakshakDatabase } from '@/data/database';
import { createBackup, parseBackup, restoreBackup } from './backup';
import { fieldCsv } from './report';
const source:FieldSource={id:'hp',code:'HP',name:'Pump',scope:'MANUAL_FIELD',state:'Himachal Pradesh',district:'Kangra',village:'Village',category:'HANDPUMP',location:'',operator:'OP',createdAt:'2026-01-01T00:00:00.000Z',updatedAt:'2026-01-01T00:00:00.000Z'};
describe('India source locations',()=>{
  it('bundles the complete retrieved snapshot without duplicate entries',()=>{
    expect(states).toHaveLength(36);expect(states.reduce((n,s)=>n+s.districts.length,0)).toBe(784);
    expect(new Set(states.map(s=>s.code)).size).toBe(36);
    for(const state of states)expect(new Set(state.districts).size).toBe(state.districts.length);
    expect(locationDirectory.retrievedAt).toBe('2026-10-25');
    expect(districtByName('himachal pradesh','kangra')).toBe('Kangra');
  });
  it('rejects mismatched locations without changing legacy district names',()=>{
    expect(()=>validateSource(source)).not.toThrow();
    expect(()=>validateSource({...source,state:'Jharkhand'})).toThrow();
    expect(()=>validateSource({...source,state:'Unknown'})).toThrow();
    expect(()=>validateSource({...source,state:undefined,district:'Old district spelling'})).not.toThrow();
  });
  it('normalizes listed CSV names, rejects wrong states and accepts old CSVs',()=>{
    const csv='code,name,state,village,district,category,operator\nS,Pump,himachal pradesh,V,kangra,WELL,OP\n';
    expect(previewSourceImport(csv,[]).rows[0].source).toMatchObject({state:'Himachal Pradesh',district:'Kangra'});
    expect(previewSourceImport(csv.replace('himachal pradesh','Jharkhand'),[]).rows[0].issues).toContain('invalidLocation');
    expect(previewSourceImport('code,name,village,district,category,operator\nS,Pump,V,Old district,WELL,OP\n',[]).rows[0].source).toMatchObject({district:'Old district'});
  });
  it('filters source and monthly reports by state and district including legacy records',()=>{
    const legacy={...source,id:'old',code:'OLD',state:undefined};
    const data={sources:[source,legacy],measurements:[],investigations:[]};
    expect(filterSources(data,'MANUAL_FIELD',{...emptySourceFilters,state:'Himachal Pradesh',district:'Kangra'})).toEqual([source]);
    expect(filterSources(data,'MANUAL_FIELD',{...emptySourceFilters,state:'__unspecified__'})).toEqual([legacy]);
    const report=monthlyReport(data,'MANUAL_FIELD',{month:'2026-01',state:'Himachal Pradesh',district:'Kangra'});
    expect(report.sources).toEqual([source]);expect(monthlyCsv(report)).toContain('Himachal Pradesh');
    expect(fieldCsv(data,source.id,'MANUAL_FIELD','en')).toContain('Himachal Pradesh');
  });
  it('round-trips state and legacy district text through JSON backup restore',async()=>{
    const from=new JalRakshakDatabase('location-from-'+crypto.randomUUID()),to=new JalRakshakDatabase('location-to-'+crypto.randomUUID());
    try{
      await from.fieldSources.bulkAdd([source,{...source,id:'old',code:'OLD',state:undefined,district:'Old district'}]);
      await restoreBackup(parseBackup(JSON.stringify(await createBackup(from))),to);
      expect(await to.fieldSources.get('hp')).toEqual(source);
      expect(await to.fieldSources.get('old')).toMatchObject({district:'Old district'});
    }finally{await from.delete();await to.delete();}
  });
});
