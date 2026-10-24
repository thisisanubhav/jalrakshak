import { useEffect, useRef, useState } from 'react';
import { fieldDatabase } from '@/field/workspace';
import { validatePhotos, type VisitPhoto } from '@/field/model';
import type { Translate } from '@/field/i18n';
export async function compressVisitPhoto(file: File): Promise<string> {
  if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size>10*1024*1024) throw new Error('photo');
  const bitmap=await createImageBitmap(file);
  try {
    const scale=Math.min(1,1280/Math.max(bitmap.width,bitmap.height));
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
    const ctx=canvas.getContext('2d');if(!ctx)throw new Error('canvas');
    ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
    // Canvas re-encoding discards original EXIF/location metadata.
    for(const quality of [.8,.6,.4,.25]){const data=canvas.toDataURL('image/jpeg',quality);if(data.length<=400_000)return data;}
    throw new Error('photo size');
  } finally {bitmap.close();}
}
export function useVisitPhotos(key:string) {
  const [database]=useState(()=>fieldDatabase());
  const [photos,setPhotos]=useState<VisitPhoto[]>([]),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[failed,setFailed]=useState(false);
  const lock=useRef(false);
  useEffect(()=>{let active=true;database.teamState.get(key).then(row=>{const value=(row?.value??[]) as VisitPhoto[];validatePhotos(value);if(active){setPhotos(value);setReady(true);}}).catch(()=>{if(active)setFailed(true);});return()=>{active=false;};},[database,key]);
  async function change(next:VisitPhoto[]){if(lock.current)throw new Error('busy');lock.current=true;setBusy(true);try{validatePhotos(next);await database.teamState.put({id:key,value:next});setPhotos(next);setFailed(false);}catch(error){setFailed(true);throw error;}finally{lock.current=false;setBusy(false);}}
  async function clear(){await database.teamState.delete(key);setPhotos([]);}
  return {photos,ready,busy,failed,change,clear};
}
export function VisitPhotos({photos,t,onChange,disabled,onProcessing}:{photos:VisitPhoto[];t:Translate;onChange:(photos:VisitPhoto[])=>Promise<void>;disabled:boolean;onProcessing:(value:boolean)=>void}){
  const [processing,setProcessing]=useState(false),[failed,setFailed]=useState(false);const lock=useRef(false);
  async function add(file?:File){if(!file||lock.current)return;lock.current=true;setProcessing(true);onProcessing(true);setFailed(false);try{if(photos.length>=3)throw new Error('limit');const data=await compressVisitPhoto(file);await onChange([...photos,{id:crypto.randomUUID(),data,caption:''}]);}catch{setFailed(true);}finally{lock.current=false;setProcessing(false);onProcessing(false);}}
  return <fieldset disabled={disabled||processing} className="visit-photos"><legend>{t('visitPhotos')}</legend><p>{t('photoHelp')}</p>
    <label className="field-label">{t('visitPhotos')}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={photos.length>=3||disabled||processing} onChange={e=>{void add(e.target.files?.[0]);e.target.value='';}} /></label>
    {processing&&<p role="status">{t('photoProcessing')}</p>}{failed&&<p role="alert">{t('photoFailed')}</p>}
    <div className="visit-photo-grid">{photos.map((photo,index)=><figure key={photo.id}><img src={photo.data} width={240} height={180} alt={photo.caption||`${t('visitPhotos')} ${index+1}`} /><label>{t('photoCaption')} {index+1}<input maxLength={500} defaultValue={photo.caption} onBlur={e=>{if(e.target.value!==photo.caption)void onChange(photos.map(p=>p.id===photo.id?{...p,caption:e.target.value}:p)).catch(()=>setFailed(true));}} /></label><button type="button" onClick={()=>void onChange(photos.filter(p=>p.id!==photo.id)).catch(()=>setFailed(true))}>{t('removePhoto')} {index+1}</button></figure>)}</div>
  </fieldset>;
}
