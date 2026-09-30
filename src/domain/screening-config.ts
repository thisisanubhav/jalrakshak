// DEMO / PROVISIONAL SCREENING RULES — NOT REGULATORY OR LABORATORY STANDARDS.
// These values exist only to exercise the software workflow. A qualified review
// can replace this one object without changing the engine or UI. They must never
// be interpreted as proof that water is potable, safe, unsafe, or contaminated.
export const SCREENING_THRESHOLDS = {
  ph: { retestMin: 6.5, retestMax: 8.5, referralMin: 5.5, referralMax: 9.5 },
  tds: { retestMax: 500, referralMax: 1200 },
  turbidity: { retestMax: 5, referralMax: 10 },
  temperature: {
    retestMin: 10,
    retestMax: 35,
    referralMin: 5,
    referralMax: 42,
  },
} as const;

// Broad input-validity envelopes catch sensor/transport failures. They are not
// water-quality thresholds and carry no regulatory meaning.
export const MEASUREMENT_VALIDITY_RANGES = {
  ph: { min: 0, max: 14 },
  tds: { min: 0, max: 100_000 },
  turbidity: { min: 0, max: 100_000 },
  temperature: { min: -20, max: 80 },
} as const;
