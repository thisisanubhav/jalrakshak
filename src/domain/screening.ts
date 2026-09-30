import { SCREENING_THRESHOLDS as T } from "./screening-config";
import type { ScreeningResult, SensorReadings } from "./types";

export function evaluateScreening(r: SensorReadings): ScreeningResult {
  const referral: string[] = [];
  const retest: string[] = [];
  const attention = new Set<keyof SensorReadings>();
  const mark = (list: string[], code: string, key: keyof SensorReadings) => { list.push(code); attention.add(key); };

  if (r.ph < T.ph.referralMin || r.ph > T.ph.referralMax) mark(referral, "PH_REFERRAL_RANGE", "ph");
  else if (r.ph < T.ph.retestMin || r.ph > T.ph.retestMax) mark(retest, "PH_RETEST_RANGE", "ph");
  if (r.tds > T.tds.referralMax) mark(referral, "TDS_REFERRAL_RANGE", "tds");
  else if (r.tds > T.tds.retestMax) mark(retest, "TDS_RETEST_RANGE", "tds");
  if (r.turbidity > T.turbidity.referralMax) mark(referral, "TURBIDITY_REFERRAL_RANGE", "turbidity");
  else if (r.turbidity > T.turbidity.retestMax) mark(retest, "TURBIDITY_RETEST_RANGE", "turbidity");
  if (r.temperature < T.temperature.referralMin || r.temperature > T.temperature.referralMax) mark(referral, "TEMPERATURE_REFERRAL_RANGE", "temperature");
  else if (r.temperature < T.temperature.retestMin || r.temperature > T.temperature.retestMax) mark(retest, "TEMPERATURE_RETEST_RANGE", "temperature");

  if (referral.length) return { status: "LAB_REFERRAL", reasonCodes: [...referral, ...retest], attentionMeasurements: [...attention], explanation: "One or more screening measurements require confirmation through an accredited laboratory." };
  if (retest.length) return { status: "RETEST", reasonCodes: retest, attentionMeasurements: [...attention], explanation: "One or more readings need a repeat measurement. Clean the probe and screen this source again." };
  return { status: "NORMAL_SCREENING", reasonCodes: [], attentionMeasurements: [], explanation: "No readings triggered the provisional screening rules. Continue routine monitoring." };
}

