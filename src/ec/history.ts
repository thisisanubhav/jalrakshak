import { EXPERIMENTAL_CHANGE_RULE } from "./config";
import type { ECChangeResult, ECMeasurementRecord } from "./types";

export interface ChangeRule {
  minimumHistoricalVisits: number;
  absoluteDifferenceUsCm: number;
  percentageDifference: number;
  maxTemperatureDifferenceC: number;
}

export function median(values: number[]) {
  if (!values.length) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function compareECWithHistory(
  current: ECMeasurementRecord,
  history: ECMeasurementRecord[],
  rule: ChangeRule = EXPERIMENTAL_CHANGE_RULE,
): ECChangeResult {
  const currentValue = current.representativeRawEcUsCm;
  if (
    current.measurementQuality !== "REPEATABLE" ||
    currentValue === undefined ||
    !Number.isFinite(currentValue) ||
    !current.calibrationRecorded
  ) {
    return { status: "MEASUREMENT_QUALITY_FAILURE", historicalCount: 0 };
  }
  const values = history
    .filter(
      (item) =>
        item.id !== current.id &&
        item.sourceId === current.sourceId &&
        item.measurementQuality === "REPEATABLE" &&
        Number.isFinite(item.representativeRawEcUsCm) &&
        item.dataOrigin === "MANUAL_EXPERIMENT" &&
        item.calibrationRecorded &&
        item.samplingMethod === current.samplingMethod &&
        Math.abs(item.temperatureC - current.temperatureC) <=
          rule.maxTemperatureDifferenceC &&
        (current.deviceRecordId && item.deviceRecordId
          ? item.deviceRecordId === current.deviceRecordId
          : item.deviceId === current.deviceId && item.probeId === current.probeId),
    )
    .map((item) => item.representativeRawEcUsCm as number);
  if (values.length < rule.minimumHistoricalVisits) {
    return {
      status: "INSUFFICIENT_HISTORY",
      historicalCount: values.length,
      currentUsCm: currentValue,
    };
  }
  const baseline = median(values) as number;
  const absolute = Math.abs(currentValue - baseline);
  const percentage = baseline === 0 ? undefined : (absolute / baseline) * 100;
  const changed =
    absolute >= rule.absoluteDifferenceUsCm &&
    percentage !== undefined &&
    percentage >= rule.percentageDifference;
  return {
    status: changed
      ? "CHANGE_OBSERVED"
      : "NO_UNUSUAL_EC_CHANGE_OBSERVED",
    historicalCount: values.length,
    historicalMedianUsCm: baseline,
    currentUsCm: currentValue,
    absoluteDifferenceUsCm: absolute,
    percentageDifference: percentage,
  };
}
