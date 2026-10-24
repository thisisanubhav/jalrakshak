import { evaluateECRepeatability } from "@/ec/measurement-quality";
import { compareField, FieldError, transitionInvestigation, validateMeasurement, validateRule, validateSource, validTime, states, type FieldData, type Investigation, type Scope } from "./model";

export function validateFieldData({ sources, measurements, investigations }: FieldData, scope: Scope) {
  try {
    for (const rows of [sources, measurements, investigations]) {
      if (!Array.isArray(rows) || new Set(rows.map(r => r.id)).size !== rows.length) throw new Error("duplicate ids");
      for (const row of rows) if (!row || typeof row.id !== "string" || !row.id.trim() || row.scope !== scope) throw new Error("invalid scope");
    }
    if (new Set(sources.map(s => s.code)).size !== sources.length) throw new Error("duplicate source codes");
    sources.forEach(validateSource);
    for (const m of measurements) {
      validateMeasurement(m); validateRule(m.rule);
      if (!validTime(m.createdAt) || !sources.some(s => s.id === m.sourceId) || JSON.stringify(m.quality) !== JSON.stringify(evaluateECRepeatability(m.readings)) || !m.comparison || !["excluded", "baseline", "stable", "anomaly"].includes(m.comparison.status) || !Array.isArray(m.comparison.includedIds) || !Array.isArray(m.comparison.excluded)) throw new Error("invalid");
    }
    // Rebuild each comparison from its original snapshot membership. Later or
    // backdated additions must not silently rewrite an earlier saved conclusion.
    for (const m of measurements) {
      const ids = [...m.comparison.includedIds, ...m.comparison.excluded.map(e => e.id)];
      if (new Set(ids).size !== ids.length || ids.some(id => !measurements.some(candidate => candidate.id === id))) throw new Error("invalid comparison membership");
      const snapshot = ids.map(id => measurements.find(candidate => candidate.id === id)!);
      const rebuilt = compareField(m, snapshot, m.rule);
      const normalized = (value: typeof rebuilt) => JSON.stringify({ ...value, excluded: [...value.excluded].sort((a,b) => a.id.localeCompare(b.id)) });
      if (normalized(rebuilt) !== normalized(m.comparison)) throw new Error("invalid comparison");
    }
    for (const investigation of investigations) {
      if (!states.includes(investigation.state) || !["quality", "anomaly", "review"].includes(investigation.cause) || !Array.isArray(investigation.events) || !investigation.events.length || investigation.events[0].state !== "NEEDS_REVIEW" || investigation.events.at(-1)?.state !== investigation.state || !measurements.some(m => m.id === investigation.measurementId && m.sourceId === investigation.sourceId)) throw new Error("invalid");
      if (new Set(investigation.events.map(e => e.id)).size !== investigation.events.length) throw new Error("duplicate events");
      for (const event of investigation.events) {
        if (!event.id || !["UNDETERMINED", "MEASUREMENT_INCONSISTENCY", "PERSISTENT_CHANGE", "CHANGE_NOT_REPRODUCED"].includes(event.finding)) throw new Error("invalid event");
        if (event.measurementId && !measurements.some(m => m.id === event.measurementId && m.sourceId === investigation.sourceId)) throw new Error("invalid evidence link");
      }
      const first = investigation.events[0];
      if (!validTime(first.at) || !first.note || !first.operator) throw new Error("invalid");
      let replay = { ...investigation, state: "NEEDS_REVIEW" as const, events: [first] } as Investigation;
      for (const event of investigation.events.slice(1)) replay = transitionInvestigation(replay, event, measurements);
    }
  } catch { throw new FieldError("corrupt"); }
}
