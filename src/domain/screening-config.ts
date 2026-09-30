// PROVISIONAL DEMO VALUES ONLY. These are intentionally isolated so a future
// clinical/scientific review can replace them with validated BIS/JJM guidance.
// They must never be interpreted as proof that water is potable or contaminated.
export const SCREENING_THRESHOLDS = {
  ph: { retestMin: 6.5, retestMax: 8.5, referralMin: 5.5, referralMax: 9.5 },
  tds: { retestMax: 500, referralMax: 1200 },
  turbidity: { retestMax: 5, referralMax: 10 },
  temperature: { retestMin: 10, retestMax: 35, referralMin: 5, referralMax: 42 },
} as const;

