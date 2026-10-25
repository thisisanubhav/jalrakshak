"use client";
import { useUiLanguage } from './UiLanguage';
import { useEffect, useRef } from 'react';
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
      const content = document.createElement('div');
      const title = document.createElement('strong'); title.textContent = m.title; content.append(title);
      m.description.forEach(text => { const p = document.createElement('p'); p.textContent = text; content.append(p); });
      content.className = 'source-map-preview';
      for(const member of m.members??[{id:m.id,title:m.title}]) {
        const section=document.createElement('section');
        section.className='source-map-preview-source';
        if(m.members){
          const heading=document.createElement('h3');heading.textContent=member.title;section.append(heading);
          for(const text of member.description??[]){const p=document.createElement('p');p.textContent=text;section.append(p);}
        }
        const actions=document.createElement('div');actions.className='source-map-preview-actions';
        if(onRecord && recordLabel){
          const record=document.createElement('button');record.type='button';record.textContent=recordLabel;
          record.className='source-map-record';record.onclick=()=>onRecord(member.id);actions.append(record);
        }
        const link = document.createElement('button'); link.type = 'button'; link.textContent = openLabel;
        link.onclick = () => onOpen(member.id); actions.append(link);section.append(actions);content.append(section);
      }
      const marker = new maplibregl.Marker({ element: button }).setLngLat([m.longitude, m.latitude])
        .setPopup(new maplibregl.Popup({ offset: 18, maxWidth: '320px' }).setDOMContent(content)).addTo(map);
      // Suppress the native synthetic click/keypress so MapLibre does not toggle twice.
      button.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault(); event.stopPropagation(); marker.togglePopup();
        }
      });
      return marker;
    });
    const coordinates=markers.map(m=>`${m.id}:${m.latitude},${m.longitude}`).sort().join('|');
    if(coordinates!==fitted.current&&rendered.length){
      const bounds=new maplibregl.LngLatBounds();rendered.forEach(marker=>bounds.extend(marker.getLngLat()));
      map.fitBounds(bounds,{padding:70,maxZoom:Math.min(14,...markers.map(m=>m.maxZoom??14)),duration:0});fitted.current=coordinates;
    }
    return () => rendered.forEach(marker => marker.remove());
  }, [markers, onOpen, openLabel, onError,locale,onRecord,recordLabel]);
  return <div className="source-map-frame"><div className="source-map-toolbar"><button type="button" onClick={fitSources}>{fitLabel}</button></div><div ref={container} role="region" aria-label={label} className="source-map-canvas h-[65vh] min-h-[380px] w-full border border-slate-200 bg-slate-100" /></div>;
}
