"use client";
import { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { Map as MapLibreMap } from 'maplibre-gl';

export interface SourceMarker {
  id: string; latitude: number; longitude: number; title: string;
  description: string[]; colour: string;
}
maplibregl.setWorkerUrl('/maplibre/maplibre-gl-worker.mjs');
/** Shared renderer only: callers retain ownership of identity, scope and status semantics. */
export function SourceMap({ markers, label, openLabel, onOpen, onError }: {
  markers: SourceMarker[]; label: string; openLabel: string;
  onOpen: (id: string) => void; onError: () => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  useEffect(() => {
    if (!container.current) return;
    let map: MapLibreMap;
    try {
      map = new maplibregl.Map({ container: container.current, center: [85.3, 23.6], zoom: 6.3,
        style: { version: 8, sources: { osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, attribution: '© OpenStreetMap contributors' } }, layers: [{ id: 'osm', type: 'raster', source: 'osm' }] } });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
      map.on('error', onError);
      mapRef.current = map;
    } catch { onError(); return; }
    return () => { map.off('error', onError); map.remove(); mapRef.current = null; };
  }, [onError]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const rendered = markers.filter(m => Number.isFinite(m.latitude) && Number.isFinite(m.longitude) && Math.abs(m.latitude) <= 90 && Math.abs(m.longitude) <= 180).map(m => {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'map-marker'; button.style.background = m.colour;
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
    return () => rendered.forEach(marker => marker.remove());
  }, [markers, onOpen, openLabel, onError]);
  return <div ref={container} role="region" aria-label={label} className="h-[55vh] min-h-[300px] w-full rounded-3xl border border-slate-200 bg-slate-100 shadow-card" />;
}
