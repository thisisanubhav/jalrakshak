import { describe, expect, it } from "vitest";
import { compareECWithHistory, median } from "./history";
import type { ECMeasurementRecord } from "./types";

const record = (
  id: string,
  value: number | undefined,
  quality: ECMeasurementRecord["measurementQuality"] = "REPEATABLE",
  origin: ECMeasurementRecord["dataOrigin"] = "MANUAL_EXPERIMENT",
): ECMeasurementRecord => ({
  id,
  visitId: `visit-${id}`,
  sourceId: "source-1",
  deviceId: "JR-EC-001",
  probeId: "EC-P01",
  measuredAt: `2026-09-${String(Number(id.replace(/\D/g, "")) || 1).padStart(2, "0")}T10:00:00.000Z`,
  reading1RawEcUsCm: value ?? 500,
  reading2RawEcUsCm: value,
  temperatureC: 25,
  representativeRawEcUsCm: value,
  agreementStatus: quality,
  measurementQuality: quality,
  calibrationRecorded: false,
  dataOrigin: origin,
  providerName: "Manual experimental entry",
  samplingMethod: "DIRECT_SOURCE",
  syncStatus: "LOCAL_ONLY",
});

describe("EC history comparison", () => {
  const rule = {
    minimumHistoricalVisits: 3,
    absoluteDifferenceUsCm: 100,
    percentageDifference: 20,
  };
  it("calculates a median without mutating the original values", () => {
    const values = [619, 605, 612, 610];
    expect(median(values)).toBe(611);
    expect(values).toEqual([619, 605, 612, 610]);
  });
  it("does not claim no change before a baseline exists", () => {
    const result = compareECWithHistory(
      record("4", 610),
      [record("1", 612), record("2", 605)],
      rule,
    );
    expect(result.status).toBe("INSUFFICIENT_HISTORY");
  });
  it("reports a transparent change with a caller-supplied experimental rule", () => {
    const result = compareECWithHistory(
      record("4", 790),
      [record("1", 310), record("2", 325), record("3", 318)],
      rule,
    );
    expect(result.status).toBe("CHANGE_OBSERVED");
    expect(result.historicalMedianUsCm).toBe(318);
  });
  it("excludes invalid and non-manual records from the manual baseline", () => {
    const result = compareECWithHistory(
      record("5", 610),
      [
        record("1", 600),
        record("2", 605),
        record("3", 900, "DISAGREEMENT"),
        record("4", 610, "REPEATABLE", "SIMULATED"),
      ],
      rule,
    );
    expect(result.status).toBe("INSUFFICIENT_HISTORY");
    expect(result.historicalCount).toBe(2);
  });
  it("fails closed for a corrupt current value", () => {
    const current = record("4", Number.NaN);
    expect(
      compareECWithHistory(
        current,
        [record("1", 600), record("2", 605), record("3", 610)],
        rule,
      ).status,
    ).toBe("MEASUREMENT_QUALITY_FAILURE");
  });
});
