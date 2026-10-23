import { db, type JalRakshakDatabase } from "@/data/database";
import { evaluateECRepeatability } from "@/ec/measurement-quality";
import { compareField, FieldError, transitionInvestigation, validateMeasurement, validateRule, validateSource, validTime, states, type FieldData, type FieldMeasurement, type FieldSource, type Investigation, type InvestigationEvent, type MeasurementInput, type Rule, type Scope } from "./model";

export async function readField(scope: Scope, database = db): Promise<FieldData> {
  const [sources, measurements, investigations] = await Promise.all([
    database.fieldSources.where("scope").equals(scope).toArray(),
    database.fieldMeasurements.where("scope").equals(scope).toArray(),
    database.fieldInvestigations.where("scope").equals(scope).toArray(),
  ]);
  try {
    sources.forEach(validateSource);
    for (const m of measurements) {
      validateMeasurement(m); validateRule(m.rule);
      if (!validTime(m.createdAt) || !sources.some(s => s.id === m.sourceId) || JSON.stringify(m.quality) !== JSON.stringify(evaluateECRepeatability(m.readings)) || !m.comparison || !["excluded", "baseline", "stable", "anomaly"].includes(m.comparison.status) || !Array.isArray(m.comparison.includedIds) || !Array.isArray(m.comparison.excluded)) throw new Error("invalid");
    }
    for (const investigation of investigations) {
      if (!states.includes(investigation.state) || !["quality", "anomaly", "review"].includes(investigation.cause) || !Array.isArray(investigation.events) || !investigation.events.length || investigation.events[0].state !== "NEEDS_REVIEW" || investigation.events.at(-1)?.state !== investigation.state || !measurements.some(m => m.id === investigation.measurementId && m.sourceId === investigation.sourceId)) throw new Error("invalid");
      const first = investigation.events[0];
      if (!validTime(first.at) || !first.note || !first.operator) throw new Error("invalid");
      let replay = { ...investigation, state: "NEEDS_REVIEW" as const, events: [first] } as Investigation;
      for (const event of investigation.events.slice(1)) replay = transitionInvestigation(replay, event, measurements);
    }
  } catch { throw new FieldError("corrupt"); }
  return { sources, measurements, investigations };
}
export async function saveFieldSource(source: FieldSource, expectedUpdatedAt?: string, database = db) {
  validateSource(source);
  return database.transaction("rw", database.fieldSources, async () => {
    const old = await database.fieldSources.get(source.id);
    if (old && (old.updatedAt !== expectedUpdatedAt || old.scope !== source.scope || old.createdAt !== source.createdAt)) throw new FieldError("conflict");
    const duplicate = await database.fieldSources.where("[scope+code]").equals([source.scope, source.code]).first();
    if (duplicate && duplicate.id !== source.id) throw new FieldError("duplicate");
    await database.fieldSources.put(source);
    return source;
  });
}
export function newInvestigation(record: FieldMeasurement, at: string, cause: Investigation["cause"]): Investigation {
  return {
    id: `investigation-${record.id}`, scope: record.scope, sourceId: record.sourceId, measurementId: record.id, cause, state: "NEEDS_REVIEW",
    events: [{ id: `opened-${record.id}`, at, state: "NEEDS_REVIEW", note: cause, operator: record.operator, finding: "UNDETERMINED", measurementId: record.id }],
  };
}
export async function saveFieldMeasurement(input: MeasurementInput, rule: Rule, database = db) {
  validateMeasurement(input); validateRule(rule);
  return database.transaction("rw", database.fieldSources, database.fieldMeasurements, database.fieldInvestigations, async () => {
    const existing = await database.fieldMeasurements.get(input.id);
    if (existing) {
      // Retry is idempotent only for the same submission.
      for (const key of Object.keys(input) as (keyof MeasurementInput)[]) if (JSON.stringify(existing[key]) !== JSON.stringify(input[key])) throw new FieldError("conflict");
      return existing;
    }
    const source = await database.fieldSources.get(input.sourceId);
    if (!source || source.scope !== input.scope) throw new FieldError("required");
    if (input.investigationId) {
      const investigation = await database.fieldInvestigations.get(input.investigationId);
      if (!investigation || investigation.sourceId !== source.id || investigation.scope !== input.scope || investigation.state !== "RETEST_REQUESTED" || Date.parse(input.measuredAt) < Date.parse(investigation.events.at(-1)!.at)) throw new FieldError("retestRequired");
    }
    const history = await database.fieldMeasurements.where("sourceId").equals(input.sourceId).toArray();
    const record: FieldMeasurement = { ...input, quality: evaluateECRepeatability(input.readings), rule: { ...rule }, comparison: compareField(input, history, rule), createdAt: new Date().toISOString() };
    await database.fieldMeasurements.add(record);
    if (!input.investigationId && (record.quality.status === "DISAGREEMENT" || record.comparison.status === "anomaly")) {
      await database.fieldInvestigations.add(newInvestigation(record, record.createdAt, record.quality.status === "DISAGREEMENT" ? "quality" : "anomaly"));
    }
    return record;
  });
}
export async function openFieldInvestigation(measurementId: string, database = db) {
  return database.transaction("rw", database.fieldMeasurements, database.fieldInvestigations, async () => {
    const record = await database.fieldMeasurements.get(measurementId);
    if (!record) throw new FieldError("required");
    const existing = await database.fieldInvestigations.where("measurementId").equals(measurementId).first();
    if (existing) return existing;
    const investigation = newInvestigation(record, new Date().toISOString(), "review");
    await database.fieldInvestigations.add(investigation);
    return investigation;
  });
}
export async function appendInvestigationEvent(id: string, expectedEventId: string, event: InvestigationEvent, database: JalRakshakDatabase = db) {
  return database.transaction("rw", database.fieldInvestigations, database.fieldMeasurements, async () => {
    const current = await database.fieldInvestigations.get(id);
    if (!current) throw new FieldError("required");
    const previous = current.events.find(e => e.id === event.id);
    if (previous) {
      if (JSON.stringify(previous) !== JSON.stringify(event)) throw new FieldError("conflict");
      return current;
    }
    if (current.events.at(-1)?.id !== expectedEventId) throw new FieldError("conflict");
    const measurements = await database.fieldMeasurements.where("sourceId").equals(current.sourceId).toArray();
    const updated = transitionInvestigation(current, event, measurements);
    await database.fieldInvestigations.put(updated);
    return updated;
  });
}
