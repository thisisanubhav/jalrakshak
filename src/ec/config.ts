// EXPERIMENTAL / PROVISIONAL software rules. These values are not regulatory
// limits, water-safety thresholds, or validated field-method acceptance criteria.
// They are isolated so bench testing can replace them without changing the UI.
export const EXPERIMENTAL_EC_VALIDITY = {
  rawEcUsCm: { min: 0, max: 200_000 },
  temperatureC: { min: -20, max: 80 },
} as const;

export const EXPERIMENTAL_REPEATABILITY_RULE = {
  absoluteToleranceUsCm: 20,
  relativeTolerancePercent: 5,
} as const;

// This comparison rule exists only to exercise transparent history UX. It must
// not be interpreted as evidence of contamination, danger, or regulatory failure.
export const EXPERIMENTAL_CHANGE_RULE = {
  minimumHistoricalVisits: 3,
  absoluteDifferenceUsCm: 100,
  percentageDifference: 25,
  // Raw EC is temperature-sensitive. This is only a provisional
  // comparability envelope until a validated compensation method is adopted.
  maxTemperatureDifferenceC: 2,
} as const;
