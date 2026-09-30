import {
  MEASUREMENT_VALIDITY_RANGES as V,
  SCREENING_THRESHOLDS as T,
} from "./screening-config";
import type { ScreeningResult, SensorReadings } from "./types";

export class InvalidMeasurementError extends Error {
  constructor(public readonly invalidFields: (keyof SensorReadings)[]) {
    super(`Invalid or missing measurement: ${invalidFields.join(", ")}`);
    this.name = "InvalidMeasurementError";
  }
}

export function validateReadings(
  readings: Partial<SensorReadings> | null | undefined,
): readings is SensorReadings {
  if (!readings) return false;
  return (Object.keys(V) as (keyof SensorReadings)[]).every((key) => {
    const value = readings[key];
    const range = V[key];
    return (
      typeof value === "number" &&
      Number.isFinite(value) &&
      value >= range.min &&
      value <= range.max
    );
  });
}

export function evaluateScreening(r: SensorReadings): ScreeningResult {
  if (!validateReadings(r)) {
    const invalidFields = (Object.keys(V) as (keyof SensorReadings)[]).filter(
      (key) => {
        const value = (r as Partial<SensorReadings> | null | undefined)?.[key];
        const range = V[key];
        return (
          typeof value !== "number" ||
          !Number.isFinite(value) ||
          value < range.min ||
          value > range.max
        );
      },
    );
    throw new InvalidMeasurementError(invalidFields);
  }
  const referral: string[] = [];
  const retest: string[] = [];
  const attention = new Set<keyof SensorReadings>();
  const mark = (list: string[], code: string, key: keyof SensorReadings) => {
    list.push(code);
    attention.add(key);
  };

  if (r.ph < T.ph.referralMin || r.ph > T.ph.referralMax)
    mark(referral, "PH_REFERRAL_RANGE", "ph");
  else if (r.ph < T.ph.retestMin || r.ph > T.ph.retestMax)
    mark(retest, "PH_RETEST_RANGE", "ph");
  if (r.tds > T.tds.referralMax) mark(referral, "TDS_REFERRAL_RANGE", "tds");
  else if (r.tds > T.tds.retestMax) mark(retest, "TDS_RETEST_RANGE", "tds");
  if (r.turbidity > T.turbidity.referralMax)
    mark(referral, "TURBIDITY_REFERRAL_RANGE", "turbidity");
  else if (r.turbidity > T.turbidity.retestMax)
    mark(retest, "TURBIDITY_RETEST_RANGE", "turbidity");
  if (
    r.temperature < T.temperature.referralMin ||
    r.temperature > T.temperature.referralMax
  )
    mark(referral, "TEMPERATURE_REFERRAL_RANGE", "temperature");
  else if (
    r.temperature < T.temperature.retestMin ||
    r.temperature > T.temperature.retestMax
  )
    mark(retest, "TEMPERATURE_RETEST_RANGE", "temperature");

  if (referral.length)
    return {
      status: "LAB_REFERRAL",
      reasonCodes: [...referral, ...retest],
      attentionMeasurements: [...attention],
      explanation:
        "One or more screening measurements require confirmation through an accredited laboratory.",
    };
  if (retest.length)
    return {
      status: "RETEST",
      reasonCodes: retest,
      attentionMeasurements: [...attention],
      explanation:
        "One or more readings need a repeat measurement. Clean the probe and screen this source again.",
    };
  return {
    status: "NORMAL_SCREENING",
    reasonCodes: [],
    attentionMeasurements: [],
    explanation:
      "No readings triggered the provisional screening rules. Continue routine monitoring.",
  };
}

export function formatReading(
  key: keyof SensorReadings,
  value: number,
): string {
  if (!Number.isFinite(value)) return "—";
  return key === "tds" ? Math.round(value).toString() : value.toFixed(1);
}
