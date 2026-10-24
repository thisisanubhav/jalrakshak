"use client";
import { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { Map as MapLibreMap } from 'maplibre-gl';

export interface SourceMarker {
  id: string; latitude: number; longitude: number; title: string;
  description: string[]; colour: string; shortLabel?: string;
}
maplibregl.setWorkerUrl('/maplibre/maplibre-gl-worker.mjs');
/** Shared renderer only: callers retain ownership of identity, scope and status semantics. */
export function SourceMap({ markers, label, openLabel, onOpen, onError, fitLabel = "Show all sources" }: {
  markers: SourceMarker[]; label: string; openLabel: string; fitLabel?: string;
  onOpen: (id: string) => void; onError: () => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const fitted=useRef('');
  function fitSources() {
    const map=mapRef.current;if(!map||!markers.length)return;
    const valid=markers.filter(m=>Number.isFinite(m.latitude)&&Number.isFinite(m.longitude)&&Math.abs(m.latitude)<=90&&Math.abs(m.longitude)<=180);
    if(!valid.length)return;
    const bounds=new maplibregl.LngLatBounds();valid.forEach(m=>bounds.extend([m.longitude,m.latitude]));
    map.fitBounds(bounds,{padding:70,maxZoom:14,duration:0});
  }
  useEffect(() => {
    if (!container.current) return;
    let map: MapLibreMap;
    try {
      map = new maplibregl.Map({ container: container.current, center: [85.3, 23.6], zoom: 6.3, cooperativeGestures: true,
        style: { version: 8, sources: { osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, attribution: '© OpenStreetMap contributors' } }, layers: [{ id: 'osm', type: 'raster', source: 'osm' }] } });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
      map.addControl(new maplibregl.ScaleControl({unit:'metric'}),'bottom-left');
      map.addControl(new maplibregl.FullscreenControl(),'top-right');
      map.on('error', onError);
      mapRef.current = map;fitted.current='';
    } catch { onError(); return; }
    return () => { map.off('error', onError); map.remove(); mapRef.current = null; };
  }, [onError]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const rendered = markers.filter(m => Number.isFinite(m.latitude) && Number.isFinite(m.longitude) && Math.abs(m.latitude) <= 90 && Math.abs(m.longitude) <= 180).map(m => {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'map-marker'; button.style.background = m.colour;
      button.textContent=m.shortLabel??'●';
      button.style.setProperty('--marker-colour',m.colour);
      button.setAttribute('aria-label', `${m.title}: ${m.description.join(' · ')}`);
      const content = document.createElement('div');
      const title = document.createElement('strong'); title.textContent = m.title; content.append(title);
      m.description.forEach(text => { const p = document.createElement('p'); p.textContent = text; content.append(p); });
      const link = document.createElement('button'); link.type = 'button'; link.textContent = `${openLabel} →`;
      link.className = 'mt-3 min-h-11 font-bold text-teal-700'; link.onclick = () => onOpen(m.id); content.append(link);
      const marker = new maplibregl.Marker({ element: button }).setLngLat([m.longitude, m.latitude])
        .setPopup(new maplibregl.Popup({ offset: 18 }).setDOMContent(content)).addTo(map);
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
      map.fitBounds(bounds,{padding:70,maxZoom:14,duration:0});fitted.current=coordinates;
    }
    return () => rendered.forEach(marker => marker.remove());
  }, [markers, onOpen, openLabel, onError]);
  return <div className="source-map-frame"><div className="source-map-toolbar"><button type="button" onClick={fitSources}>{fitLabel}</button></div><div ref={container} role="region" aria-label={label} className="source-map-canvas h-[65vh] min-h-[380px] w-full border border-slate-200 bg-slate-100" /></div>;
}
