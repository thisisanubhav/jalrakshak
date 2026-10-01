import { EXPERIMENTAL_REPEATABILITY_RULE } from "./config";
import type { ECRepeatabilityResult } from "./types";

export interface RepeatabilityRule {
  absoluteToleranceUsCm: number;
  relativeTolerancePercent: number;
}

function allowedDifference(
  a: number,
  b: number,
  rule: RepeatabilityRule,
) {
  const mean = (a + b) / 2;
  return Math.max(
    rule.absoluteToleranceUsCm,
    mean * (rule.relativeTolerancePercent / 100),
  );
}

function pairResult(a: number, b: number, rule: RepeatabilityRule) {
  const difference = Math.abs(a - b);
  const allowed = allowedDifference(a, b, rule);
  return { agrees: difference <= allowed, difference, allowed };
}

export function evaluateECRepeatability(
  readings: Array<number | undefined>,
  rule: RepeatabilityRule = EXPERIMENTAL_REPEATABILITY_RULE,
): ECRepeatabilityResult {
  const supplied = readings.filter((value): value is number => value !== undefined);
  if (supplied.some((value) => !Number.isFinite(value) || value < 0)) {
    return {
      status: "INVALID",
      requiresThirdReading: false,
      reason: "A reading is invalid; no repeatability result was produced.",
    };
  }
  if (supplied.length < 2) {
    return {
      status: "INSUFFICIENT_DATA",
      requiresThirdReading: false,
      reason: "Two valid readings are required.",
    };
  }

  const first = pairResult(supplied[0], supplied[1], rule);
  if (first.agrees) {
    return {
      status: "REPEATABLE",
      differenceUsCm: first.difference,
      allowedDifferenceUsCm: first.allowed,
      representativeRawEcUsCm: (supplied[0] + supplied[1]) / 2,
      agreeingReadings: [supplied[0], supplied[1]],
      requiresThirdReading: false,
      reason: "The first two readings agree under the experimental rule.",
    };
  }
  if (supplied.length < 3) {
    return {
      status: "DISAGREEMENT",
      differenceUsCm: first.difference,
      allowedDifferenceUsCm: first.allowed,
      requiresThirdReading: true,
      reason: "The first two readings disagree; take a third reading.",
    };
  }

  const pairs = [
    { values: [supplied[0], supplied[1]] as [number, number], ...first },
    {
      values: [supplied[0], supplied[2]] as [number, number],
      ...pairResult(supplied[0], supplied[2], rule),
    },
    {
      values: [supplied[1], supplied[2]] as [number, number],
      ...pairResult(supplied[1], supplied[2], rule),
    },
  ]
    .filter((pair) => pair.agrees)
    .sort((a, b) => a.difference - b.difference);
  const best = pairs[0];
  if (!best) {
    return {
      status: "DISAGREEMENT",
      requiresThirdReading: false,
      reason: "No two readings agree under the experimental rule.",
    };
  }
  return {
    status: "REPEATABLE",
    differenceUsCm: best.difference,
    allowedDifferenceUsCm: best.allowed,
    representativeRawEcUsCm: (best.values[0] + best.values[1]) / 2,
    agreeingReadings: best.values,
    requiresThirdReading: false,
    reason: "Two of three readings agree under the experimental rule.",
  };
}
