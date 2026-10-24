import { type JalRakshakDatabase } from "@/data/database";
import { evaluateECRepeatability } from "@/ec/measurement-quality";
import { compareField, FieldError, transitionInvestigation, validateMeasurement, validateRule, validateSource, type FieldData, type FieldMeasurement, type FieldSource, type Investigation, type InvestigationEvent, type MeasurementInput, type Rule, type Scope } from "./model";

import { validateFieldData } from "./validation";
export { validateFieldData } from "./validation";
import { fieldDatabase, announceFieldChange } from "./workspace";

export async function readField(scope: Scope, database = fieldDatabase()): Promise<FieldData> {
  const [sources, measurements, investigations] = await Promise.all([
    database.fieldSources.where("scope").equals(scope).toArray(),
    database.fieldMeasurements.where("scope").equals(scope).toArray(),
    database.fieldInvestigations.where("scope").equals(scope).toArray(),
  ]);
  validateFieldData({ sources, measurements, investigations }, scope);
  return { sources, measurements, investigations };
}

export async function saveFieldSource(source: FieldSource, expectedUpdatedAt?: string, database = fieldDatabase()) {
  validateSource(source);
  const result = await database.transaction("rw", database.fieldSources, async () => {
    const old = await database.fieldSources.get(source.id);
    if (old && (old.updatedAt !== expectedUpdatedAt || old.scope !== source.scope || old.createdAt !== source.createdAt)) throw new FieldError("conflict");
    const duplicate = await database.fieldSources.where("[scope+code]").equals([source.scope, source.code]).first();
    if (duplicate && duplicate.id !== source.id) throw new FieldError("duplicate");
    await database.fieldSources.put(source);
    return source;
  });
  announceFieldChange(database, result.scope);
  return result;
}
export function newInvestigation(record: FieldMeasurement, at: string, cause: Investigation["cause"]): Investigation {
  return {
    id: `investigation-${record.id}`, scope: record.scope, sourceId: record.sourceId, measurementId: record.id, cause, state: "NEEDS_REVIEW",
    events: [{ id: `opened-${record.id}`, at, state: "NEEDS_REVIEW", note: cause, operator: record.operator, finding: "UNDETERMINED", measurementId: record.id }],
  };
}
export async function saveFieldMeasurement(input: MeasurementInput, rule: Rule, database = fieldDatabase()) {
  validateMeasurement(input); validateRule(rule);
  const result = await database.transaction("rw", database.fieldSources, database.fieldMeasurements, database.fieldInvestigations, async () => {
    const existing = await database.fieldMeasurements.get(input.id);
    if (existing) {
      // Retry is idempotent only for the same submission.
      for (const key of Object.keys(input) as (keyof MeasurementInput)[]) if (JSON.stringify(existing[key]) !== JSON.stringify(input[key])) throw new FieldError("conflict");
      return existing;
    }
    const source = await database.fieldSources.get(input.sourceId);
    if (!source || source.scope !== input.scope) throw new FieldError("required");
    if (input.scheduleId && input.scheduleId !== source.schedule?.id) throw new FieldError("conflict");
    if (input.correctsMeasurementId) {
      const prior=await database.fieldMeasurements.get(input.correctsMeasurementId);
      if (!prior || prior.sourceId!==source.id || prior.scope!==input.scope) throw new FieldError("required");
    }
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
  announceFieldChange(database, result.scope);
  return result;
}
export async function openFieldInvestigation(measurementId: string, database = fieldDatabase()) {
  const result = await database.transaction("rw", database.fieldMeasurements, database.fieldInvestigations, async () => {
    const record = await database.fieldMeasurements.get(measurementId);
    if (!record) throw new FieldError("required");
    const existing = await database.fieldInvestigations.where("measurementId").equals(measurementId).first();
    if (existing) return existing;
    const investigation = newInvestigation(record, new Date().toISOString(), "review");
    await database.fieldInvestigations.add(investigation);
    return investigation;
  });
  announceFieldChange(database, result.scope);
  return result;
}
export async function appendInvestigationEvent(id: string, expectedEventId: string, event: InvestigationEvent, database: JalRakshakDatabase = fieldDatabase()) {
  const result = await database.transaction("rw", database.fieldInvestigations, database.fieldMeasurements, async () => {
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
  announceFieldChange(database, result.scope);
  return result;
}
