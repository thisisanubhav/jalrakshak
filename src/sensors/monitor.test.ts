import {describe,it,expect} from 'vitest';
import {appendHistory,captureAllowed,chartSegments,readingState,type SensorPoint} from './monitor';
const point:SensorPoint={at:1000,receivedAt:'2026-01-01T00:00:00.000Z',value:{protocol:'jalrakshak.ec.v1',deviceId:'USB',sessionId:'boot',sequence:1,ecUsCm:500,temperatureC:25,stable:true}};
describe('sensor monitoring',()=>{
  it('expires samples after five seconds and rejects invalid or reversed clocks',()=>{
    expect(readingState(undefined,1000)).toBe('waiting');
    expect(readingState(point,6000)).toBe('stable');
    for(const now of [6001,999,NaN,Infinity])expect(readingState(point,now)).toBe('stale');
    expect(readingState({...point,value:{...point.value,stable:false}},1000)).toBe('unstable');
  });
  it('requires a fresh stable connected unconsumed sample and an empty enabled slot',()=>{
    expect(captureAllowed(point,1000,true,false,false,false)).toBe(true);
    expect(captureAllowed(point,1000,false,false,false,false)).toBe(false);
    expect(captureAllowed(point,1000,true,true,false,false)).toBe(false);
    expect(captureAllowed(point,1000,true,false,true,false)).toBe(false);
    expect(captureAllowed(point,1000,true,false,false,true)).toBe(false);
    expect(captureAllowed(point,6001,true,false,false,false)).toBe(false);
    expect(captureAllowed(undefined,1000,true,false,false,false)).toBe(false);
  });
  it('bounds memory and resets history across device sessions',()=>{
    let history:SensorPoint[]=[];
    for(let n=0;n<1000;n++)history=appendHistory(history,{...point,at:n*1000,value:{...point.value,sequence:n}});
    expect(history).toHaveLength(60);expect(history[0].value.sequence).toBe(940);
    expect(appendHistory(history,{...point,value:{...point.value,sessionId:'new'}})).toHaveLength(1);
    expect(appendHistory(history,{...point,value:{...point.value,deviceId:'other'}})).toHaveLength(1);
  });
  it('does not connect chart lines across stale intervals',()=>{
    const history=[point,{...point,at:2000},{...point,at:8000},{...point,at:9000}];
    expect(chartSegments(history).map(s=>s.length)).toEqual([2,2]);
    expect(chartSegments([])).toEqual([]);
  });
});
