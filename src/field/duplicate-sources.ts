import type {FieldSource} from './model';
const normalize=(value:string)=>value.trim().toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
export function possibleDuplicateSources(candidate:Pick<FieldSource,'id'|'scope'|'name'|'village'|'district'|'state'|'latitude'|'longitude'>,sources:FieldSource[]){
  return sources.filter(source=>{
    if(source.id===candidate.id||source.scope!==candidate.scope)return false;
    const sameArea=normalize(source.village)===normalize(candidate.village)&&normalize(source.district)===normalize(candidate.district)&&normalize(source.state??'')===normalize(candidate.state??'');
    if(sameArea&&normalize(candidate.name).length>=3&&normalize(source.name)===normalize(candidate.name))return true;
    if(![source.latitude,source.longitude,candidate.latitude,candidate.longitude].every(n=>typeof n==='number'&&Number.isFinite(n)))return false;
    const rad=(n:number)=>n*Math.PI/180,lat=rad(candidate.latitude!-source.latitude!),lon=rad(candidate.longitude!-source.longitude!);
    const a=Math.sin(lat/2)**2+Math.cos(rad(source.latitude!))*Math.cos(rad(candidate.latitude!))*Math.sin(lon/2)**2;
    return 6371000*2*Math.atan2(Math.sqrt(Math.max(0,a)),Math.sqrt(Math.max(0,1-a)))<=30;
  });
}
