import { describe,it,expect } from 'vitest';
import { sourceMapLocation } from './map-location';
import type { FieldSource } from './model';
import areas from './india-map-areas.json';
import { states } from './locations';
const source:FieldSource={id:'pump',code:'HP',name:'Pump',scope:'MANUAL_FIELD',state:'Himachal Pradesh',district:'Kangra',village:'Village',category:'HANDPUMP',location:'',operator:'OP',createdAt:'2026-01-01',updatedAt:'2026-01-01'};
describe('display-only map area resolution',()=>{
  it('uses both state and district and leaves saved coordinates untouched',()=>{
    const before=JSON.stringify(source);
    const p=sourceMapLocation(source)!;
    expect(p.precision).toBe('district');expect(p.area).toBe('Kangra, Himachal Pradesh');
    expect(p.latitude).toBeGreaterThan(31);expect(p.latitude).toBeLessThan(33);
    expect(p.longitude).toBeGreaterThan(75);expect(p.longitude).toBeLessThan(78);
    expect(JSON.stringify(source)).toBe(before);
    expect(sourceMapLocation({...source,state:'Jharkhand'})).toMatchObject({precision:'state',area:'Jharkhand'});
  });
  it('preserves GPS precedence including zero coordinates and changes placement after edits',()=>{
    expect(sourceMapLocation({...source,latitude:0,longitude:0})).toMatchObject({precision:'coordinates',latitude:0,longitude:0});
    expect(sourceMapLocation({...source,state:'Jharkhand',district:'Dhanbad'})).toMatchObject({precision:'district',area:'Dhanbad, Jharkhand'});
    expect(sourceMapLocation({...source,latitude:91,longitude:77})?.precision).toBe('district');
  });
  it('does not guess ambiguous legacy districts without a state',()=>{
    expect(sourceMapLocation({...source,state:undefined})).toBeUndefined();
    expect(sourceMapLocation({...source,state:'Unknown'})).toBeUndefined();
    expect(sourceMapLocation({...source,state:undefined,latitude:32,longitude:76})?.precision).toBe('coordinates');
  });
  it('falls back honestly for unmatched districts and gives colocated area sources the same grouping key',()=>{
    expect(sourceMapLocation({...source,state:'Andhra Pradesh',district:'Markapuram'})?.precision).toBe('state');
    expect(sourceMapLocation({...source,id:'another'})?.key).toBe(sourceMapLocation(source)?.key);
    expect(sourceMapLocation({...source,state:' himachal pradesh ',district:' kangra '})?.key).toBe(sourceMapLocation(source)?.key);
  });
  it('has bounded area coordinates for every supported state and matched district',()=>{
    expect(areas.states.map(s=>s.name).sort()).toEqual(states.map(s=>s.name).sort());
    for(const state of areas.states){
      for(const [latitude,longitude] of [state.center,...Object.values(state.districts)]){
        expect(latitude).toBeGreaterThan(6);expect(latitude).toBeLessThan(38);
        expect(longitude).toBeGreaterThan(68);expect(longitude).toBeLessThan(98);
      }
    }
  });
});
