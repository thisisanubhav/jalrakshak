"use client";
import type { ScreeningStatus, WaterSource, WaterTest } from "@/domain/types";
import { formatReading } from "@/domain/screening";
import { SourceMap, type SourceMarker } from "./SourceMap";
const color: Record<ScreeningStatus, string> = { NORMAL_SCREENING: "#168a79", RETEST: "#d97706", LAB_REFERRAL: "#dc2626" };
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
  const markers: SourceMarker[] = sources.flatMap(source => {
    const latest = tests.filter(t => t.sourceId === source.id).sort((a,b) => b.testedAt.localeCompare(a.testedAt))[0];
    if (!latest) return [];
    return [{ id: source.id, latitude: source.latitude, longitude: source.longitude, title: source.name,
      colour: color[latest.screeningStatus], description: [
        `${source.sourceCode} · ${source.village}`, labels.status(latest.screeningStatus),
        `${labels.ph} ${formatReading("ph", latest.ph)} · ${labels.tds} ${formatReading("tds", latest.tds)} mg/L · ${labels.turbidity} ${formatReading("turbidity", latest.turbidity)} NTU`,
        `${labels.origin}: ${labels.originName(latest.dataOrigin ?? "SIMULATED")}`,
      ] }];
  });
  return <SourceMap markers={markers} label={labels.mapLabel} openLabel={labels.history} onOpen={onHistory} onError={onMapError} />;
}
