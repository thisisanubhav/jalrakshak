import { EXPERIMENTAL_CHANGE_RULE } from "./config";
import type { ECChangeResult, ECMeasurementRecord } from "./types";

export interface ChangeRule {
  minimumHistoricalVisits: number;
  absoluteDifferenceUsCm: number;
  percentageDifference: number;
  maxTemperatureDifferenceC: number;
}

export type ECComparisonExclusionReason =
  | "INVALID_MEASUREMENT"
  | "MEASUREMENT_DISAGREEMENT"
  | "MISSING_CALIBRATION"
  | "DIFFERENT_SOURCE"
  | "DIFFERENT_PROVENANCE"
  | "DIFFERENT_DEVICE"
  | "DIFFERENT_SAMPLING_METHOD"
  | "TEMPERATURE_OUTSIDE_ENVELOPE";

export interface ECComparisonEligibility {
  comparable: boolean;
  reason?: ECComparisonExclusionReason;
}

export function getECAnalysisFailureReason(
  record: ECMeasurementRecord,
): ECComparisonExclusionReason | undefined {
  if (
    !Number.isFinite(record.representativeRawEcUsCm) ||
    !Number.isFinite(record.temperatureC)
  ) {
    return "INVALID_MEASUREMENT";
  }
  if (record.measurementQuality !== "REPEATABLE") {
    return "MEASUREMENT_DISAGREEMENT";
  }
  if (!record.calibrationRecorded || !record.calibrationRecordId) {
    return "MISSING_CALIBRATION";
  }
  return undefined;
}

export function getECComparisonEligibility(
  current: ECMeasurementRecord,
  candidate: ECMeasurementRecord,
  rule: ChangeRule = EXPERIMENTAL_CHANGE_RULE,
): ECComparisonEligibility {
  const candidateFailure = getECAnalysisFailureReason(candidate);
  if (candidateFailure) return { comparable: false, reason: candidateFailure };
  if (candidate.sourceId !== current.sourceId) {
    return { comparable: false, reason: "DIFFERENT_SOURCE" };
  }
  if (
    current.dataOrigin !== "MANUAL_EXPERIMENT" ||
    candidate.dataOrigin !== current.dataOrigin
  ) {
    return { comparable: false, reason: "DIFFERENT_PROVENANCE" };
  }
  const sameDevice =
    current.deviceRecordId && candidate.deviceRecordId
      ? current.deviceRecordId === candidate.deviceRecordId
      : current.deviceId === candidate.deviceId &&
        current.probeId === candidate.probeId;
  if (!sameDevice) {
    return { comparable: false, reason: "DIFFERENT_DEVICE" };
  }
  if (candidate.samplingMethod !== current.samplingMethod) {
    return { comparable: false, reason: "DIFFERENT_SAMPLING_METHOD" };
  }
  if (
    Math.abs(candidate.temperatureC - current.temperatureC) >
    rule.maxTemperatureDifferenceC
  ) {
    return { comparable: false, reason: "TEMPERATURE_OUTSIDE_ENVELOPE" };
  }
  return { comparable: true };
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
  if (getECAnalysisFailureReason(current) || current.dataOrigin !== "MANUAL_EXPERIMENT") {
    return { status: "MEASUREMENT_QUALITY_FAILURE", historicalCount: 0 };
  }
  // The fail-closed guard above guarantees a finite representative value.
  const validCurrentValue = currentValue as number;
  const values = history
    .filter(
      (item) =>
        item.id !== current.id &&
        getECComparisonEligibility(current, item, rule).comparable,
    )
    .map((item) => item.representativeRawEcUsCm as number);
  if (values.length < rule.minimumHistoricalVisits) {
    return {
      status: "INSUFFICIENT_HISTORY",
      historicalCount: values.length,
      currentUsCm: validCurrentValue,
    };
  }
  const baseline = median(values) as number;
  const absolute = Math.abs(validCurrentValue - baseline);
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
    currentUsCm: validCurrentValue,
    absoluteDifferenceUsCm: absolute,
    percentageDifference: percentage,
  };
}
