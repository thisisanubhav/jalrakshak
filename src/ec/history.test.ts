import { describe, expect, it } from "vitest";
import {
  compareECWithHistory,
  getECComparisonEligibility,
  median,
} from "./history";
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
  deviceRecordId: "device-record-1",
  deviceId: "JR-EC-001",
  probeId: "EC-P01",
  measuredAt: `2026-09-${String(Number(id.replace(/\D/g, "")) || 1).padStart(2, "0")}T10:00:00.000Z`,
  reading1RawEcUsCm: value ?? 500,
  reading2RawEcUsCm: value,
  temperatureC: 25,
  representativeRawEcUsCm: value,
  agreementStatus: quality,
  measurementQuality: quality,
  calibrationRecorded: true,
  calibrationRecordId: "calibration-1",
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
    maxTemperatureDifferenceC: 2,
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
  it("does not compare uncalibrated or context-mismatched visits", () => {
    const uncalibrated = { ...record("4", 790), calibrationRecorded: false };
    expect(compareECWithHistory(uncalibrated, [], rule).status).toBe(
      "MEASUREMENT_QUALITY_FAILURE",
    );
    const history = [record("1", 310), record("2", 325), record("3", 318)].map(
      (item) => ({ ...item, samplingMethod: "SAMPLE_CONTAINER" as const }),
    );
    expect(compareECWithHistory(record("4", 790), history, rule).status).toBe(
      "INSUFFICIENT_HISTORY",
    );
  });
  it("uses the same eligibility rules for analysis and chart presentation", () => {
    const current = record("8", 790);
    expect(getECComparisonEligibility(current, record("1", 610))).toEqual({
      comparable: true,
    });
    expect(
      getECComparisonEligibility(current, {
        ...record("2", 615),
        deviceRecordId: "different-device",
      }).reason,
    ).toBe("DIFFERENT_DEVICE");
    expect(
      getECComparisonEligibility(current, {
        ...record("3", 620),
        samplingMethod: "SAMPLE_CONTAINER",
      }).reason,
    ).toBe("DIFFERENT_SAMPLING_METHOD");
    expect(
      getECComparisonEligibility(current, {
        ...record("4", 625),
        temperatureC: 28,
      }).reason,
    ).toBe("TEMPERATURE_OUTSIDE_ENVELOPE");
  });
  it("fails closed for non-manual current records and corrupt temperatures", () => {
    expect(
      compareECWithHistory(
        record("4", 610, "REPEATABLE", "REAL_SENSOR"),
        [record("1", 600), record("2", 605), record("3", 610)],
        rule,
      ).status,
    ).toBe("MEASUREMENT_QUALITY_FAILURE");
    expect(
      getECComparisonEligibility(record("4", 610), {
        ...record("1", 600),
        temperatureC: Number.NaN,
      }).reason,
    ).toBe("INVALID_MEASUREMENT");
  });
  it("compares synthetic demo records only with the same explicit provenance", () => {
    const syntheticCurrent = record("4", 900, "REPEATABLE", "SYNTHETIC_DEMO");
    const syntheticHistory = [record("1", 600), record("2", 605), record("3", 610)].map(
      (item) => ({ ...item, dataOrigin: "SYNTHETIC_DEMO" as const }),
    );
    expect(compareECWithHistory(syntheticCurrent, syntheticHistory, rule).status).toBe("CHANGE_OBSERVED");
    expect(getECComparisonEligibility(syntheticCurrent, record("5", 600)).reason).toBe("DIFFERENT_PROVENANCE");
  });
});


describe("history regression boundaries", () => {
  it("excludes later visits when reviewing an older measurement", () => {
    expect(compareECWithHistory(record("2", 600), [record("1", 600), record("3", 600), record("4", 600)]).historicalCount).toBe(1);
  });
  it("flags a large absolute change from a zero baseline", () => {
    expect(compareECWithHistory(record("4", 600), [record("1", 0), record("2", 0), record("3", 0)]).status).toBe("CHANGE_OBSERVED");
  });
});
