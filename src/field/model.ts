import { parseEsp32Sample, type SensorCapture } from "@/sensors/esp32";
import { evaluateECRepeatability } from "@/ec/measurement-quality";
import { median } from "@/ec/history";
import type { ECRepeatabilityResult } from "@/ec/types";

export type Scope = "MANUAL_FIELD" | "SYNTHETIC_DEMO";
export type Locale = "en" | "hi";
export const categories = ["HANDPUMP", "WELL", "TAP", "BOREWELL", "OTHER"] as const;
export interface FieldSource {
  id: string; scope: Scope; code: string; name: string; village: string; district: string;
  location: string; category: typeof categories[number]; latitude?: number; longitude?: number;
  photo?: string; operator: string; createdAt: string; updatedAt: string;
}
export interface Rule { minimumVisits: number; absolute: number; percentage: number; temperature: number }
export const defaultRule: Rule = { minimumVisits: 3, absolute: 100, percentage: 25, temperature: 2 };
export interface MeasurementInput {
  id: string; sourceId: string; scope: Scope; measuredAt: string; readings: number[];
  temperature?: number; instrument: string; device: string; probe: string;
  calibrationDate: string; calibrationReference: string; method: "DIRECT_SOURCE" | "SAMPLE_CONTAINER";
  operator: string; notes: string; investigationId?: string; sensorCaptures?: SensorCapture[];
}
export type Exclusion = "quality" | "calibration" | "temperature" | "instrument" | "method" | "chronology" | "scope";
export interface Comparison {
  status: "excluded" | "baseline" | "stable" | "anomaly";
  reason?: Exclusion; count: number; baseline?: number; previous?: number;
  difference?: number; percentage?: number; previousDifference?: number;
  includedIds: string[]; excluded: { id: string; reason: Exclusion }[];
}
export interface FieldMeasurement extends MeasurementInput {
  createdAt: string; quality: ECRepeatabilityResult; comparison: Comparison; rule: Rule;
}
export const states = ["NEEDS_REVIEW", "RETEST_REQUESTED", "RETEST_COMPLETED", "LAB_REFERRED", "RESOLVED", "CLOSED_UNCONFIRMED"] as const;
export type InvestigationState = typeof states[number];
export type Finding = "UNDETERMINED" | "MEASUREMENT_INCONSISTENCY" | "PERSISTENT_CHANGE" | "CHANGE_NOT_REPRODUCED";
export interface InvestigationEvent {
  id: string; at: string; state: InvestigationState; note: string; operator: string;
  measurementId?: string; finding: Finding;
}
export interface Investigation {
  id: string; scope: Scope; sourceId: string; measurementId: string;
  cause: "quality" | "anomaly" | "review"; state: InvestigationState; events: InvestigationEvent[];
}
export interface FieldData { sources: FieldSource[]; measurements: FieldMeasurement[]; investigations: Investigation[] }
export type ErrorCode = "required" | "invalidNumber" | "invalidTime" | "invalidCalibration" | "invalidPhoto" | "invalidRule" | "duplicate" | "conflict" | "invalidTransition" | "retestRequired" | "evidenceRequired" | "corrupt";
export class FieldError extends Error { constructor(public code: ErrorCode) { super(code); } }
export function requireText(value: unknown, max = 200) {
  if (typeof value !== "string" || !value.trim() || value.length > max) throw new FieldError("required");
}
export function validTime(value: unknown, now = Date.now()): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value && Date.parse(value) <= now + 60_000;
}
export function validateRule(rule: Rule) {
  if (!rule || !Number.isInteger(rule.minimumVisits) || rule.minimumVisits < 3 || rule.minimumVisits > 100 ||
    ![rule.absolute, rule.percentage, rule.temperature].every(v => Number.isFinite(v) && v > 0) || rule.percentage > 1000 || rule.temperature > 10) throw new FieldError("invalidRule");
}
export function validateSource(source: FieldSource) {
  [source.id, source.code, source.name, source.village, source.district, source.operator].forEach(v => requireText(v));
  if (!["MANUAL_FIELD", "SYNTHETIC_DEMO"].includes(source.scope) || !categories.includes(source.category) || typeof source.location !== "string" || source.location.length > 500) throw new FieldError("required");
  if (!validTime(source.createdAt) || !validTime(source.updatedAt) || source.updatedAt < source.createdAt) throw new FieldError("invalidTime");
  if ((source.latitude === undefined) !== (source.longitude === undefined) ||
    (source.latitude !== undefined && (!Number.isFinite(source.latitude) || Math.abs(source.latitude) > 90)) ||
    (source.longitude !== undefined && (!Number.isFinite(source.longitude) || Math.abs(source.longitude) > 180))) throw new FieldError("invalidNumber");
  if (source.photo && (source.photo.length > 1_500_000 || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(source.photo))) throw new FieldError("invalidPhoto");
}
export function validateMeasurement(input: MeasurementInput) {
  [input.id, input.sourceId, input.instrument, input.operator].forEach(v => requireText(v));
  if (!["MANUAL_FIELD", "SYNTHETIC_DEMO"].includes(input.scope) || !["DIRECT_SOURCE", "SAMPLE_CONTAINER"].includes(input.method)) throw new FieldError("required");
  if (!validTime(input.measuredAt)) throw new FieldError("invalidTime");
  if (!Array.isArray(input.readings) || input.readings.length < 2 || input.readings.length > 3 || input.readings.some(v => typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 200_000) ||
    (input.temperature !== undefined && (!Number.isFinite(input.temperature) || input.temperature < -20 || input.temperature > 80))) throw new FieldError("invalidNumber");
  for (const value of [input.device, input.probe, input.calibrationDate, input.calibrationReference, input.notes]) {
    if (typeof value !== "string" || value.length > 2000) throw new FieldError("required");
  }
  if (input.sensorCaptures !== undefined) {
    if (!Array.isArray(input.sensorCaptures) || input.sensorCaptures.length > 3 || new Set(input.sensorCaptures.map(c => c?.slot)).size !== input.sensorCaptures.length) throw new FieldError("invalidNumber");
    const samples = new Set<string>();
    for (const c of input.sensorCaptures) {
      try { parseEsp32Sample(JSON.stringify(c)); } catch { throw new FieldError("invalidNumber"); }
      const key = `${c.deviceId}/${c.sessionId}/${c.sequence}`;
      if (input.scope !== "MANUAL_FIELD" || !Number.isInteger(c.slot) || c.slot < 0 || c.slot >= input.readings.length || c.ecUsCm !== input.readings[c.slot] || c.transport !== "USB_SERIAL" || c.deviceId !== input.device || !c.stable || !validTime(c.receivedAt) || samples.has(key)) throw new FieldError("invalidNumber");
      samples.add(key);
    }
  }
  if (input.calibrationDate) {
    const date = new Date(`${input.calibrationDate}T00:00:00.000Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.calibrationDate) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== input.calibrationDate || input.calibrationDate > input.measuredAt.slice(0, 10)) throw new FieldError("invalidCalibration");
  }
}
export function exclusion(current: MeasurementInput, candidate: MeasurementInput, rule: Rule, historical = true): Exclusion | undefined {
  try { validateMeasurement(candidate); } catch { return "quality"; }
  if (evaluateECRepeatability(candidate.readings).status !== "REPEATABLE") return "quality";
  if (!candidate.calibrationDate || !candidate.calibrationReference.trim()) return "calibration";
  if (candidate.temperature === undefined || current.temperature === undefined || Math.abs(candidate.temperature - current.temperature) > rule.temperature) return "temperature";
  if (candidate.scope !== current.scope || candidate.sourceId !== current.sourceId) return "scope";
  if (candidate.instrument.trim().toLowerCase() !== current.instrument.trim().toLowerCase() || candidate.device !== current.device || candidate.probe !== current.probe) return "instrument";
  if (candidate.method !== current.method) return "method";
  if (historical && Date.parse(candidate.measuredAt) >= Date.parse(current.measuredAt)) return "chronology";
}
export function compareField(input: MeasurementInput, history: FieldMeasurement[], rule: Rule): Comparison {
  validateMeasurement(input); validateRule(rule);
  const reason = exclusion(input, input, rule, false);
  const result: Comparison = { status: reason ? "excluded" : "baseline", reason, count: 0, includedIds: [], excluded: [] };
  if (reason) return result;
  const eligible: FieldMeasurement[] = [];
  for (const item of history.filter(m => m.sourceId === input.sourceId && m.scope === input.scope && m.id !== input.id)) {
    const why = exclusion(input, item, rule);
    if (why) result.excluded.push({ id: item.id, reason: why }); else eligible.push(item);
  }
  eligible.sort((a, b) => a.measuredAt.localeCompare(b.measuredAt));
  result.count = eligible.length; result.includedIds = eligible.map(m => m.id);
  const value = evaluateECRepeatability(input.readings).representativeRawEcUsCm!;
  const values = eligible.map(m => evaluateECRepeatability(m.readings).representativeRawEcUsCm!);
  result.previous = values.at(-1);
  if (result.previous !== undefined) result.previousDifference = value - result.previous;
  if (values.length < rule.minimumVisits) return result;
  result.baseline = median(values)!;
  result.difference = value - result.baseline;
  result.percentage = result.baseline === 0 ? undefined : Math.abs(result.difference) / result.baseline * 100;
  result.status = Math.abs(result.difference) >= rule.absolute && (result.baseline === 0 || result.percentage! >= rule.percentage) ? "anomaly" : "stable";
  return result;
}
export const transitions: Record<InvestigationState, InvestigationState[]> = {
  NEEDS_REVIEW: ["RETEST_REQUESTED", "LAB_REFERRED", "CLOSED_UNCONFIRMED"],
  RETEST_REQUESTED: ["RETEST_COMPLETED", "LAB_REFERRED", "CLOSED_UNCONFIRMED"],
  RETEST_COMPLETED: ["RETEST_REQUESTED", "LAB_REFERRED", "RESOLVED", "CLOSED_UNCONFIRMED"],
  LAB_REFERRED: ["RETEST_REQUESTED", "RESOLVED", "CLOSED_UNCONFIRMED"],
  RESOLVED: [], CLOSED_UNCONFIRMED: [],
};
export function transitionInvestigation(investigation: Investigation, event: InvestigationEvent, measurements: FieldMeasurement[]): Investigation {
  if (!transitions[investigation.state]?.includes(event.state)) throw new FieldError("invalidTransition");
  requireText(event.id); requireText(event.note, 2000); requireText(event.operator);
  if (!validTime(event.at) || Date.parse(event.at) < Date.parse(investigation.events.at(-1)!.at)) throw new FieldError("invalidTime");
  if (!["UNDETERMINED", "MEASUREMENT_INCONSISTENCY", "PERSISTENT_CHANGE", "CHANGE_NOT_REPRODUCED"].includes(event.finding)) throw new FieldError("required");
  const linked = measurements.find(m => m.id === event.measurementId);
  if (event.measurementId && (!linked || linked.investigationId !== investigation.id || linked.sourceId !== investigation.sourceId || linked.scope !== investigation.scope || Date.parse(linked.measuredAt) < Date.parse(investigation.events[0].at))) throw new FieldError("retestRequired");
  if (linked && Date.parse(linked.measuredAt) > Date.parse(event.at)) throw new FieldError("invalidTime");
  if (event.state === "RETEST_COMPLETED") {
    const request = investigation.events.findLast(e => e.state === "RETEST_REQUESTED");
    if (!linked || !request || Date.parse(linked.measuredAt) < Date.parse(request.at)) throw new FieldError("retestRequired");
  }
  if (event.finding === "CHANGE_NOT_REPRODUCED" && (!linked || linked.comparison.status !== "stable")) throw new FieldError("evidenceRequired");
  if (event.finding === "PERSISTENT_CHANGE" && (!linked || linked.comparison.status !== "anomaly")) throw new FieldError("evidenceRequired");
  if (event.finding === "MEASUREMENT_INCONSISTENCY" && !measurements.some(m => m.id === investigation.measurementId && m.quality.status === "DISAGREEMENT") && !measurements.some(m => m.investigationId === investigation.id && m.quality.status === "DISAGREEMENT")) throw new FieldError("evidenceRequired");
  if (event.state === "RESOLVED") {
    const request = investigation.events.findLast(e => e.state === "RETEST_REQUESTED");
    const review = investigation.events.findLast(e => e.state === "RETEST_COMPLETED");
    if (!linked || linked.quality.status !== "REPEATABLE" || linked.comparison.status !== "stable" ||
      !request || Date.parse(linked.measuredAt) < Date.parse(request.at) || review?.measurementId !== linked.id ||
      event.finding === "UNDETERMINED") throw new FieldError("evidenceRequired");
  }
  return { ...investigation, state: event.state, events: [...investigation.events, event] };
}
