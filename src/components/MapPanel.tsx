"use client";
import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import type { Map as MapLibreMap } from "maplibre-gl";
import type { ScreeningStatus, WaterSource, WaterTest } from "@/domain/types";
import { formatReading } from "@/domain/screening";

const color: Record<ScreeningStatus, string> = {
  NORMAL_SCREENING: "#168a79",
  RETEST: "#d97706",
  LAB_REFERRAL: "#dc2626",
};
maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
export function MapPanel({
  sources,
  tests,
  onHistory,
  onMapError,
  labels,
}: {
  sources: WaterSource[];
  tests: WaterTest[];
  onHistory: (id: string) => void;
  onMapError: () => void;
  labels: {
    mapLabel: string;
    history: string;
    origin: string;
    ph: string;
    tds: string;
    turbidity: string;
    status: (status: ScreeningStatus) => string;
    originName: (origin: WaterTest["dataOrigin"]) => string;
  };
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: ref.current,
      center: [85.3, 23.6],
      zoom: 6.3,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors",
          },
        },
        layers: [{ id: "osm", type: "raster", source: "osm" }],
      },
    });
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "top-right",
    );
    const handleError = () => onMapError();
    map.on("error", handleError);
    mapRef.current = map;
    return () => {
      map.off("error", handleError);
      map.remove();
      mapRef.current = null;
    };
  }, [onMapError]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const markers: maplibregl.Marker[] = [];
    for (const source of sources) {
      const latest = tests
        .filter((t) => t.sourceId === source.id)
        .sort((a, b) => b.testedAt.localeCompare(a.testedAt))[0];
      if (!latest) continue;
      const node = document.createElement("button");
      node.className = "map-marker";
      node.style.background = color[latest.screeningStatus];
      node.type = "button";
      node.setAttribute(
        "aria-label",
        `${source.sourceCode}: ${labels.status(latest.screeningStatus)}`,
      );
      const content = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = source.name;
      const identity = document.createElement("p");
      identity.textContent = `${source.sourceCode} · ${source.village}`;
      const status = document.createElement("p");
      status.className = "font-bold";
      status.textContent = labels.status(latest.screeningStatus);
      const readings = document.createElement("small");
      readings.textContent = `${labels.ph} ${formatReading("ph", latest.ph)} · ${labels.tds} ${formatReading("tds", latest.tds)} mg/L · ${labels.turbidity} ${formatReading("turbidity", latest.turbidity)} NTU`;
      const origin = document.createElement("small");
      origin.className = "block mt-1 font-bold text-violet-700";
      origin.textContent = `${labels.origin}: ${labels.originName(latest.dataOrigin ?? "SIMULATED")}`;
      content.append(title, identity, status, readings, origin);
      const link = document.createElement("button");
      link.type = "button";
      link.textContent = `${labels.history} →`;
      link.className = "mt-3 min-h-11 font-bold text-teal-700";
      link.onclick = () => onHistory(source.id);
      content.appendChild(link);
      markers.push(
        new maplibregl.Marker({ element: node })
          .setLngLat([source.longitude, source.latitude])
          .setPopup(new maplibregl.Popup({ offset: 18 }).setDOMContent(content))
          .addTo(map),
      );
    }
    return () => markers.forEach((m) => m.remove());
  }, [sources, tests, onHistory, labels]);
  return (
    <div
      ref={ref}
      role="region"
      className="h-[55vh] min-h-[390px] w-full rounded-3xl border border-slate-200 bg-slate-100 shadow-card"
      aria-label={labels.mapLabel}
    />
  );
}
