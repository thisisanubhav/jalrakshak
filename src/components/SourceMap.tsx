"use client";
import { useUiLanguage } from './UiLanguage';
import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { Map as MapLibreMap } from 'maplibre-gl';

export interface SourceMarker {
  id: string; latitude: number; longitude: number; title: string;
  description: string[]; colour: string; shortLabel?: string; approximate?: boolean; maxZoom?: number; symbol?: string; members?: {id:string; title:string; description?:string[]}[];
}
maplibregl.setWorkerUrl('/maplibre/maplibre-gl-worker.mjs');
/** Shared renderer only: callers retain ownership of identity, scope and status semantics. */
export function SourceMap({ markers, label, openLabel, onOpen, onError, onRecord, recordLabel, fitLabel = "Show all sources" }: {
  markers: SourceMarker[]; label: string; openLabel: string; fitLabel?: string;
  onOpen: (id: string) => void; onError: () => void; onRecord?: (id: string) => void; recordLabel?: string;
}) {
  const {locale}=useUiLanguage();
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const fitted=useRef('');
  const [selectedId,setSelectedId]=useState<string>();
  const selected=markers.find(m=>m.id===selectedId);
  const details=useRef<HTMLElement>(null);
  function fitSources() {
    const map=mapRef.current;if(!map||!markers.length)return;
    const valid=markers.filter(m=>Number.isFinite(m.latitude)&&Number.isFinite(m.longitude)&&Math.abs(m.latitude)<=90&&Math.abs(m.longitude)<=180);
    if(!valid.length)return;
    const bounds=new maplibregl.LngLatBounds();valid.forEach(m=>bounds.extend([m.longitude,m.latitude]));
    map.fitBounds(bounds,{padding:70,maxZoom:Math.min(14,...markers.map(m=>m.maxZoom??14)),duration:0});
  }
  useEffect(() => {
    if (!container.current) return;
    let map: MapLibreMap;
    try {
      map = new maplibregl.Map({ container: container.current, center: [85.3, 23.6], zoom: 6.3, cooperativeGestures: true,
        locale: locale==='hi' ? {
          'Map.Title':'मानचित्र','Marker.Title':'मानचित्र मार्कर','Popup.Close':'पॉपअप बंद करें',
          'NavigationControl.ZoomIn':'ज़ूम बढ़ाएँ','NavigationControl.ZoomOut':'ज़ूम घटाएँ',
          'FullscreenControl.Enter':'पूर्ण स्क्रीन खोलें','FullscreenControl.Exit':'पूर्ण स्क्रीन बंद करें',
          'AttributionControl.ToggleAttribution':'श्रेय दिखाएँ या छिपाएँ',
          'CooperativeGesturesHandler.WindowsHelpText':'मानचित्र ज़ूम करने के लिए Ctrl के साथ स्क्रॉल करें',
          'CooperativeGesturesHandler.MacHelpText':'मानचित्र ज़ूम करने के लिए ⌘ के साथ स्क्रॉल करें',
          'CooperativeGesturesHandler.MobileHelpText':'मानचित्र खिसकाने के लिए दो उँगलियाँ उपयोग करें',
          'ScaleControl.Meters':'मी','ScaleControl.Kilometers':'किमी',
        } : undefined,
        style: { version: 8, sources: { osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, attribution: '© OpenStreetMap contributors' } }, layers: [{ id: 'osm', type: 'raster', source: 'osm' }] } });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
      map.addControl(new maplibregl.ScaleControl({unit:'metric'}),'bottom-left');
      map.addControl(new maplibregl.FullscreenControl(),'top-right');
      map.on('error', onError);
      mapRef.current = map;fitted.current='';
    } catch { onError(); return; }
    return () => { map.off('error', onError); map.remove(); mapRef.current = null; };
  }, [onError,locale]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const rendered = markers.filter(m => Number.isFinite(m.latitude) && Number.isFinite(m.longitude) && Math.abs(m.latitude) <= 90 && Math.abs(m.longitude) <= 180).map(m => {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'map-marker'; button.style.background = m.colour;
      button.textContent=[m.symbol,m.shortLabel??'●'].filter(Boolean).join(' ');
      if(m.approximate){button.style.borderStyle='dashed';button.style.borderRadius='24px';}
      button.style.setProperty('--marker-colour',m.colour);
      button.setAttribute('aria-label', `${m.title}: ${m.description.join(' · ')}`);
      button.setAttribute('aria-pressed',String(m.id===selectedId));
      button.onclick=()=>{setSelectedId(m.id);requestAnimationFrame(()=>details.current?.scrollIntoView({block:'nearest',behavior:'instant'}));};
      const marker = new maplibregl.Marker({ element: button }).setLngLat([m.longitude, m.latitude]).addTo(map);
      return marker;
    });
    const coordinates=markers.map(m=>`${m.id}:${m.latitude},${m.longitude}`).sort().join('|');
    if(coordinates!==fitted.current&&rendered.length){
      const bounds=new maplibregl.LngLatBounds();rendered.forEach(marker=>bounds.extend(marker.getLngLat()));
      map.fitBounds(bounds,{padding:70,maxZoom:Math.min(14,...markers.map(m=>m.maxZoom??14)),duration:0});fitted.current=coordinates;
    }
    return () => rendered.forEach(marker => marker.remove());
  }, [markers,locale,selectedId]);
  return <div className="source-map-frame"><div className="source-map-toolbar"><button type="button" onClick={fitSources}>{fitLabel}</button></div><div ref={container} role="region" aria-label={label} className="source-map-canvas h-[65vh] min-h-[380px] w-full border border-slate-200 bg-slate-100" />
    {selected ? <section ref={details} className="source-map-details" aria-label={locale==='hi'?'चुना गया स्थान':'Selected location'}>
      <header><div><span className="source-map-detail-kicker">{locale==='hi'?'स्थान विवरण':'LOCATION DETAILS'}</span><h3>{selected.title}</h3></div><button type="button" onClick={()=>setSelectedId(undefined)} aria-label={locale==='hi'?'विवरण बंद करें':'Close details'}>×</button></header>
      {selected.description.map((text,i)=><p key={i}>{text}</p>)}
      <div className="source-map-detail-grid">{(selected.members??[{id:selected.id,title:selected.title}]).map(member=><section key={member.id} className="source-map-preview-source">
        {selected.members&&<><h4>{member.title}</h4>{member.description?.map((text,i)=><p key={i}>{text}</p>)}</>}
        <div className="source-map-preview-actions">
          {onRecord&&recordLabel&&<button type="button" className="source-map-record" onClick={()=>onRecord(member.id)}>{recordLabel}</button>}
          <button type="button" onClick={()=>onOpen(member.id)}>{openLabel}</button>
          {!selected.approximate&&<a target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${selected.latitude},${selected.longitude}`}>{locale==='hi'?'दिशाएँ · Google Maps':'Directions · Google Maps'} ↗</a>}
        </div>
      </section>)}</div>
    </section>:<p className="source-map-selection-hint">{locale==='hi'?'स्थान विवरण और दौरे के विकल्प देखने के लिए मार्कर चुनें।':'Choose a marker to see location details and visit actions.'}</p>}
  </div>;
}
