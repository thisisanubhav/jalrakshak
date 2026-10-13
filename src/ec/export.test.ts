import { describe, expect, it } from "vitest";
import { createECCsv } from "./export";
import type { WaterSource } from "@/domain/types";
import type { ECMeasurementRecord } from "./types";

describe("EC CSV export", () => {
  it("exports provenance, raw readings, temperature, and escaped notes", () => {
    const source = {
      id: "s1",
      sourceCode: "JR-HP-0012",
      sourceType: "HANDPUMP",
      village: "Khunti",
      name: "School handpump",
      latitude: 23.3,
      longitude: 85.3,
      createdAt: "2026-09-30T00:00:00.000Z",
      syncStatus: "LOCAL_ONLY",
    } satisfies WaterSource;
    const measurement = {
      id: "m1",
      visitId: "v1",
      sourceId: "s1",
      deviceId: "JR-EC-001",
      probeId: "EC-P01",
      measuredAt: "2026-09-30T10:00:00.000Z",
      reading1RawEcUsCm: 612,
      reading2RawEcUsCm: 618,
      temperatureC: 25.2,
      agreementStatus: "REPEATABLE",
      measurementQuality: "REPEATABLE",
      calibrationRecorded: false,
      dataOrigin: "MANUAL_EXPERIMENT",
      providerName: "Manual experimental entry",
      samplingMethod: "DIRECT_SOURCE",
      notes: 'After rain, "fresh" sample',
      syncStatus: "LOCAL_ONLY",
    } satisfies ECMeasurementRecord;
    const csv = createECCsv([measurement], [source]);
    expect(csv).toContain('"JR-HP-0012"');
    expect(csv).toContain('"MANUAL_EXPERIMENT"');
    expect(csv).toContain('"After rain, ""fresh"" sample"');
  });
  it("neutralizes spreadsheet formulas in user-controlled fields", () => {
    const source = {
      id: "s1",
      sourceCode: "JR-HP-0012",
      sourceType: "HANDPUMP",
      village: "=HYPERLINK(\"https://example.test\")",
      name: "+cmd",
      latitude: 23.3,
      longitude: 85.3,
      createdAt: "2026-09-30T00:00:00.000Z",
      syncStatus: "LOCAL_ONLY",
    } satisfies WaterSource;
    const measurement = {
      id: "m1",
      visitId: "v1",
      sourceId: "s1",
      deviceId: "JR-EC-001",
      probeId: "EC-P01",
      measuredAt: "2026-09-30T10:00:00.000Z",
      reading1RawEcUsCm: 612,
      reading2RawEcUsCm: 618,
      temperatureC: 25.2,
      agreementStatus: "REPEATABLE",
      measurementQuality: "REPEATABLE",
      calibrationRecorded: false,
      dataOrigin: "MANUAL_EXPERIMENT",
      providerName: "Manual experimental entry",
      samplingMethod: "DIRECT_SOURCE",
      notes: "@SUM(1,1)",
      syncStatus: "LOCAL_ONLY",
    } satisfies ECMeasurementRecord;
    const csv = createECCsv([measurement], [source]);
    expect(csv).toContain('"\'=HYPERLINK(""https://example.test"")"');
    expect(csv).toContain('"\'+cmd"');
    expect(csv).toContain('"\'@SUM(1,1)"');
  });
});
