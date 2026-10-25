import type { Esp32Sample } from './esp32';
export const SAMPLE_TTL_MS=5000;
export const HISTORY_LIMIT=60;
export interface SensorPoint { value:Esp32Sample; at:number; receivedAt:string }
/** at/now use a monotonic clock so changing the computer clock cannot revive a reading. */
export function readingState(point:SensorPoint|undefined,now:number) {
  if(!point)return 'waiting' as const;
  const age=now-point.at;
  if(!Number.isFinite(age)||age<0||age>SAMPLE_TTL_MS)return 'stale' as const;
  return point.value.stable?'stable' as const:'unstable' as const;
}
export function captureAllowed(point:SensorPoint|undefined,now:number,connected:boolean,used:boolean,occupied:boolean,disabled:boolean) {
  return connected&&!used&&!occupied&&!disabled&&readingState(point,now)==='stable';
}
export function appendHistory(history:SensorPoint[],point:SensorPoint) {
  const last=history.at(-1);
  const sameSession=last&&last.value.deviceId===point.value.deviceId&&last.value.sessionId===point.value.sessionId;
  return [...(sameSession?history:[]),point].slice(-HISTORY_LIMIT);
}
export function chartSegments(history:SensorPoint[]) {
  const segments:SensorPoint[][]=[];
  for(const point of history){
    const current=segments.at(-1),previous=current?.at(-1);
    if(!previous||point.at-previous.at>SAMPLE_TTL_MS||point.at<previous.at)segments.push([point]);
    else current!.push(point);
  }
  return segments;
}
