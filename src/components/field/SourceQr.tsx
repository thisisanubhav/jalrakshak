import { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import type { FieldSource } from '@/field/model';
import type { Translate } from '@/field/i18n';
import { sourceQrValue, parseSourceQr } from '@/field/operations';
const xml=(value:string)=>value.replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]!));
export function sourceQrSvg(source:FieldSource){
  const qr=QRCode.create(sourceQrValue(source.id),{errorCorrectionLevel:'M'});const size=qr.modules.size;const unit=6,edge=(size+8)*unit;
  const cells=Array.from(qr.modules.data).flatMap((value,index)=>value?[`M${(index%size+4)*unit},${(Math.floor(index/size)+4)*unit}h${unit}v${unit}h-${unit}z`]:[]).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${edge} ${edge+50}" width="${edge}" height="${edge+50}"><rect width="100%" height="100%" fill="white"/><path d="${cells}" fill="black"/><text x="${edge/2}" y="${edge+14}" text-anchor="middle" font-family="sans-serif" font-size="12">JalRakshak</text><text x="${edge/2}" y="${edge+34}" text-anchor="middle" font-family="sans-serif" font-size="11">${xml(source.code.slice(0,30))}</text></svg>`;
}
export function SourceQr({source,t}:{source:FieldSource;t:Translate}){
  const svg=useMemo(()=>sourceQrSvg(source),[source]);const uri='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
  return <details className="source-qr no-print"><summary>{t('qrLabel')}</summary><p>{t('qrHelp')}</p><img src={uri} alt={`${t('qrLabel')} ${source.code}`} width={240} height={280} /><p>{source.code} · {source.name}</p><a className="field-button" download={`jalrakshak-source-${source.id}.svg`} href={uri}>{t('downloadQr')}</a></details>;
}
export function SourceScanner({sources,t,onOpen}:{sources:FieldSource[];t:Translate;onOpen:(id:string)=>void}){
  const [text,setText]=useState(''),[error,setError]=useState(''),[running,setRunning]=useState(false),[loading,setLoading]=useState(false);
  const video=useRef<HTMLVideoElement>(null),stream=useRef<MediaStream|null>(null),timer=useRef<ReturnType<typeof setInterval>|null>(null),generation=useRef(0);
  function stop(){generation.current++;if(timer.current)clearInterval(timer.current);timer.current=null;stream.current?.getTracks().forEach(track=>track.stop());stream.current=null;if(video.current)video.current.srcObject=null;setRunning(false);}
  useEffect(()=>()=>{generation.current++;if(timer.current)clearInterval(timer.current);stream.current?.getTracks().forEach(track=>track.stop());},[]);
  function open(value:string){let id:string|undefined;try{id=parseSourceQr(value.trim());}catch{/* Manual identifier fallback. */}const source=sources.find(s=>id?s.id===id:s.code===value.trim());if(!source){setError(t('qrUnavailable'));return false;}stop();setError('');onOpen(source.id);return true;}
  function decode(canvas:HTMLCanvasElement){const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)return null;const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);return jsQR(pixels.data,pixels.width,pixels.height)?.data;}
  async function start(){if(running)return;setError('');setRunning(true);const token=++generation.current;try{const media=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:false});if(token!==generation.current){media.getTracks().forEach(track=>track.stop());return;}stream.current=media;const element=video.current;if(!element)throw new Error('video');element.srcObject=media;await element.play();if(token!==generation.current)return;const canvas=document.createElement('canvas');timer.current=setInterval(()=>{if(!element.videoWidth)return;const scale=Math.min(1,800/element.videoWidth);canvas.width=Math.round(element.videoWidth*scale);canvas.height=Math.round(element.videoHeight*scale);canvas.getContext('2d')?.drawImage(element,0,0,canvas.width,canvas.height);const value=decode(canvas);if(value){stop();open(value);}},300);}catch{if(token===generation.current){stop();setError(t('qrCameraError'));}}}
  async function scanImage(file?:File){if(!file||loading)return;setLoading(true);setError('');try{if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>10*1024*1024)throw new Error('image');const bitmap=await createImageBitmap(file);try{const canvas=document.createElement('canvas');const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d')?.drawImage(bitmap,0,0,canvas.width,canvas.height);const value=decode(canvas);if(!value)throw new Error('QR');open(value);}finally{bitmap.close();}}catch{setError(t('qrNotFound'));}finally{setLoading(false);}}
  return <details className="field-card no-print" onToggle={e=>{if(!e.currentTarget.open)stop();}}><summary>{t('scanSource')}</summary><p>{t('qrHelp')}</p><div className="field-actions"><button type="button" disabled={running} onClick={()=>void start()}>{t('startCamera')}</button>{running&&<button type="button" onClick={stop}>{t('stopCamera')}</button>}</div><video ref={video} muted playsInline hidden={!running} className="qr-camera" aria-label={t('scanSource')} />
    <label className="field-label">{t('qrImage')}<input disabled={loading} type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>{void scanImage(e.target.files?.[0]);e.target.value='';}} /></label><form className="field-actions" onSubmit={e=>{e.preventDefault();open(text);}}><label>{t('qrText')}<input required maxLength={1000} value={text} onChange={e=>setText(e.target.value)} /></label><button>{t('openScannedSource')}</button></form>{error&&<p role="alert">{error}</p>}
  </details>;
}
