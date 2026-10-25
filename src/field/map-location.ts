import areas from './india-map-areas.json';
import type { FieldSource } from './model';
import { hasCoordinates } from './overview';
import { stateByName } from './locations';
export type MapLocation = { latitude:number; longitude:number; precision:'coordinates'|'district'|'state'; area:string; key:string };
/** Display-only fallback. Never write an area center into the source's GPS fields. */
export function sourceMapLocation(source:FieldSource):MapLocation|undefined {
  if(hasCoordinates(source))return {latitude:source.latitude!,longitude:source.longitude!,precision:'coordinates',area:'',key:source.id};
  const state=stateByName(source.state??'');
  if(!state)return;
  const entry=areas.states.find(s=>s.name===state.name);
  if(!entry)return;
  const districts=entry.districts as Record<string,number[]>;
  const district=Object.keys(districts).find(d=>d.toLowerCase()===source.district.trim().toLowerCase());
  const center=district?districts[district]:entry.center;
  return {latitude:center[0],longitude:center[1],precision:district?'district':'state',area:district?`${district}, ${state.name}`:state.name,key:JSON.stringify([state.name,district??null])};
}
