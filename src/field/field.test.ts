import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";
import { JalRakshakDatabase, resetDemoData } from "@/data/database";
import { compareField, defaultRule, FieldError, validateMeasurement, validateSource, validTime, type FieldMeasurement, type FieldSource, type MeasurementInput } from "./model";
import { appendInvestigationEvent, openFieldInvestigation, readField, saveFieldMeasurement, saveFieldSource } from "./store";
import { loadFieldDemo } from "./demo";
import { csvCell, fieldCsv } from "./report";
import { labels } from "./i18n";
const databases: JalRakshakDatabase[] = [];
const database = () => { const d = new JalRakshakDatabase(`field-test-${crypto.randomUUID()}`); databases.push(d); return d; };
afterEach(async () => { for (const d of databases.splice(0)) await d.delete(); });
const source = (id = "source"): FieldSource => ({ id, code: id, scope: "MANUAL_FIELD", name: "Handpump", village: "Village", district: "Khunti", location: "", category: "HANDPUMP", operator: "OP-1", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" });
const input = (index = 1, value = 600): MeasurementInput => ({ id: `visit-${index}`, scope: "MANUAL_FIELD", sourceId: "source", measuredAt: `2026-01-${String(index).padStart(2, "0")}T10:00:00.000Z`, readings: [value, value + 2], temperature: 25, instrument: "Meter A", device: "", probe: "", calibrationDate: "2026-01-01", calibrationReference: "1413 µS/cm", method: "DIRECT_SOURCE", operator: "OP-1", notes: "" });
async function history(d: JalRakshakDatabase) { await saveFieldSource(source(), undefined, d); for (let i = 1; i <= 3; i++) await saveFieldMeasurement(input(i), defaultRule, d); }

describe("field input and analysis", () => {
  it.each([NaN, Infinity, -1, 200001])("rejects invalid EC %s", value => expect(() => validateMeasurement({ ...input(), readings: [value, 600] })).toThrow(FieldError));
  it("rejects missing readings and impossible/future timestamps", () => {
    expect(() => validateMeasurement({ ...input(), readings: [600] })).toThrow();
    for (const time of ["invalid", "2026-02-30T10:00:00.000Z", "2099-01-01T00:00:00.000Z"]) expect(validTime(time)).toBe(false);
  });
  it("allows absent temperature, identifiers and calibration without invalidating numerical readings", async () => {
    const d = database(); await saveFieldSource(source(), undefined, d);
    const m = await saveFieldMeasurement({ ...input(), temperature: undefined, calibrationDate: "", calibrationReference: "" }, defaultRule, d);
    expect(m.quality.status).toBe("REPEATABLE"); expect(m.comparison).toMatchObject({ status: "excluded", reason: "calibration" });
  });
  it("rejects calibration after measurement and malformed dates", () => {
    for (const date of ["2026-02-30", "2026-02-01", "bad"]) expect(() => validateMeasurement({ ...input(), calibrationDate: date })).toThrow();
  });
  it("allows optional GPS but rejects partial pairs, invalid photos and invalid coordinates", () => {
    expect(() => validateSource(source())).not.toThrow();
    expect(() => validateSource({ ...source(), latitude: 23 })).toThrow();
    expect(() => validateSource({ ...source(), latitude: 91, longitude: 85 })).toThrow();
    expect(() => validateSource({ ...source(), photo: "javascript:alert(1)" })).toThrow();
  });
  it("compares only older compatible records and snapshots thresholds", async () => {
    const d = database(); await history(d);
    const m = await saveFieldMeasurement(input(4, 1000), defaultRule, d);
    expect(m.comparison).toMatchObject({ status: "anomaly", count: 3, baseline: 601, previous: 601, previousDifference: 400 });
    expect((await d.fieldInvestigations.count())).toBe(1);
    const all = await d.fieldMeasurements.toArray();
    expect(compareField(input(2), all, defaultRule).count).toBe(1);
    expect(compareField({ ...input(5), temperature: undefined }, all, defaultRule).reason).toBe("temperature");
    expect(compareField({ ...input(5), instrument: "Meter B" }, all, defaultRule).count).toBe(0);
    expect(compareField({ ...input(5), scope: "SYNTHETIC_DEMO" }, all, defaultRule).count).toBe(0);
    expect(compareField(input(5, 1000), all.slice(0, 3), { ...defaultRule, absolute: 500 }).status).toBe("stable");
  });
  it("handles a zero baseline without dividing by zero or hiding change", async () => {
    const d = database(); await saveFieldSource(source(), undefined, d);
    for (let i = 1; i <= 3; i++) await saveFieldMeasurement({ ...input(i), readings: [0, 0] }, defaultRule, d);
    const m = await saveFieldMeasurement(input(4, 500), defaultRule, d);
    expect(m.comparison.status).toBe("anomaly"); expect(m.comparison.percentage).toBeUndefined();
  });
  it("retains disagreement and supports third-reading recovery only in a new record", async () => {
    const d = database(); await saveFieldSource(source(), undefined, d);
    const m = await saveFieldMeasurement({ ...input(), readings: [600, 900] }, defaultRule, d);
    expect(m.quality).toMatchObject({ status: "DISAGREEMENT", requiresThirdReading: true });
    expect(m.comparison.reason).toBe("quality");
    const next = await saveFieldMeasurement({ ...input(2), readings: [600, 900, 602] }, defaultRule, d);
    expect(next.quality.representativeRawEcUsCm).toBe(601);
    expect((await d.fieldMeasurements.get(m.id))?.quality.status).toBe("DISAGREEMENT");
  });
});

describe("atomic persistence, migration and evidence", () => {
  it("deduplicates concurrent saves and auto investigations", async () => {
    const d = database(); await saveFieldSource(source(), undefined, d);
    const m = { ...input(), readings: [500, 900] };
    await Promise.all([saveFieldMeasurement(m, defaultRule, d), saveFieldMeasurement(m, defaultRule, d)]);
    expect(await d.fieldMeasurements.count()).toBe(1); expect(await d.fieldInvestigations.count()).toBe(1);
    await expect(saveFieldMeasurement({ ...m, notes: "changed" }, defaultRule, d)).rejects.toMatchObject({ code: "conflict" });
  });
  it("preserves source creation date, prevents stale editing and duplicate codes", async () => {
    const d = database(); const s = source(); await saveFieldSource(s, undefined, d);
    await saveFieldSource({ ...s, name: "Edited", updatedAt: "2026-01-02T00:00:00.000Z" }, s.updatedAt, d);
    await expect(saveFieldSource({ ...s, name: "Stale" }, s.updatedAt, d)).rejects.toMatchObject({ code: "conflict" });
    await expect(saveFieldSource({ ...s, id: "another" }, undefined, d)).rejects.toMatchObject({ code: "duplicate" });
    expect((await d.fieldSources.get(s.id))?.createdAt).toBe(s.createdAt);
  });
  it("rolls back measurements if investigation persistence fails", async () => {
    const d = database(); await saveFieldSource(source(), undefined, d);
    d.fieldInvestigations.hook("creating", () => { throw new Error("quota"); });
    await expect(saveFieldMeasurement({ ...input(), readings: [500, 900] }, defaultRule, d)).rejects.toThrow("quota");
    expect(await d.fieldMeasurements.count()).toBe(0);
  });
  it("does not overwrite or erase corrupted persisted evidence", async () => {
    const d = database(); await history(d); const m = (await d.fieldMeasurements.toArray())[0];
    await d.fieldMeasurements.put({ ...m, readings: [NaN, 500] });
    await expect(readField("MANUAL_FIELD", d)).rejects.toMatchObject({ code: "corrupt" });
    expect(await d.fieldMeasurements.count()).toBe(3);
  });
  it("requires actual linked retest evidence and preserves event chronology", async () => {
    const d = database(); await history(d); const m = await saveFieldMeasurement(input(4, 1000), defaultRule, d);
    const investigation = (await d.fieldInvestigations.toArray())[0];
    const base = { id: "event-1", at: new Date().toISOString(), note: "Check repeat visit", operator: "OP-2", finding: "UNDETERMINED" as const };
    await expect(appendInvestigationEvent(investigation.id, investigation.events[0].id, { ...base, state: "RESOLVED" }, d)).rejects.toMatchObject({ code: "invalidTransition" });
    const requested = await appendInvestigationEvent(investigation.id, investigation.events[0].id, { ...base, state: "RETEST_REQUESTED" }, d);
    await expect(appendInvestigationEvent(investigation.id, base.id, { ...base, id: "event-2", state: "RETEST_COMPLETED", measurementId: m.id }, d)).rejects.toMatchObject({ code: "retestRequired" });
    await expect(appendInvestigationEvent(investigation.id, "stale", { ...base, id: "event-2", state: "LAB_REFERRED" }, d)).rejects.toMatchObject({ code: "conflict" });
    const retest = await saveFieldMeasurement({ ...input(6, 1000), measuredAt: new Date().toISOString(), investigationId: investigation.id }, defaultRule, d);
    const completed = await appendInvestigationEvent(investigation.id, requested.events.at(-1)!.id, { ...base, id: "event-2", at: new Date().toISOString(), state: "RETEST_COMPLETED", measurementId: retest.id, finding: "PERSISTENT_CHANGE" }, d);
    await expect(appendInvestigationEvent(investigation.id, "event-2", { ...base, id: "event-3", at: new Date().toISOString(), state: "RESOLVED", measurementId: retest.id, finding: "PERSISTENT_CHANGE" }, d)).rejects.toMatchObject({ code: "evidenceRequired" });
    const closed = await appendInvestigationEvent(investigation.id, completed.events.at(-1)!.id, { ...base, id: "event-3", at: new Date().toISOString(), state: "CLOSED_UNCONFIRMED" }, d);
    expect(closed.events).toHaveLength(4); expect((await readField("MANUAL_FIELD", d)).investigations[0].state).toBe("CLOSED_UNCONFIRMED");
  });
  it("resolves a reviewed repeatable stable retest after measurement inconsistency", async () => {
    const d = database(); await history(d); await saveFieldMeasurement({ ...input(4), readings: [500, 900] }, defaultRule, d);
    const i = (await d.fieldInvestigations.toArray())[0]; const at = () => new Date().toISOString();
    await appendInvestigationEvent(i.id, i.events[0].id, { id: "request", at: at(), state: "RETEST_REQUESTED", note: "Clean probe", operator: "OP-2", finding: "MEASUREMENT_INCONSISTENCY" }, d);
    const retest = await saveFieldMeasurement({ ...input(5), measuredAt: at(), investigationId: i.id }, defaultRule, d);
    const evidence = { at: at(), note: "Repeat readings stable; no safety conclusion", operator: "OP-2", finding: "MEASUREMENT_INCONSISTENCY" as const, measurementId: retest.id };
    await appendInvestigationEvent(i.id, "request", { ...evidence, id: "completed", state: "RETEST_COMPLETED" }, d);
    await appendInvestigationEvent(i.id, "completed", { ...evidence, at: at(), id: "resolved", state: "RESOLVED" }, d);
    expect((await readField("MANUAL_FIELD", d)).investigations[0].state).toBe("RESOLVED");
  });
  it("rejects empty notes and invalid event timestamps", async () => {
    const d = database(); await history(d); const i = await openFieldInvestigation("visit-1", d);
    const event = { id: "event", at: new Date().toISOString(), state: "RETEST_REQUESTED" as const, note: "", operator: "OP", finding: "UNDETERMINED" as const };
    await expect(appendInvestigationEvent(i.id, i.events[0].id, event, d)).rejects.toThrow();
    await expect(appendInvestigationEvent(i.id, i.events[0].id, { ...event, note: "ok", at: "bad" }, d)).rejects.toMatchObject({ code: "invalidTime" });
  });
  it("upgrades a v5 database without deleting legacy records", async () => {
    const name = `migration-${crypto.randomUUID()}`; const old = new Dexie(name);
    old.version(5).stores({ sources: "id, sourceCode, syncStatus, createdAt", tests: "id, sourceId, screeningStatus, syncStatus, testedAt", referrals: "id, testId, sourceId, referralStatus, syncStatus", ecDevices: "id, deviceId, probeId, createdAt", ecMeasurements: "id, visitId, sourceId, deviceId, measuredAt, measurementQuality, dataOrigin, syncStatus", judgeDemoScenarios: "id, sequence, loadedAt" });
    await old.table("sources").add({ id: "legacy", sourceCode: "LEGACY" }); old.close();
    const upgraded = new JalRakshakDatabase(name); databases.push(upgraded); await upgraded.open();
    expect(await upgraded.sources.get("legacy")).toMatchObject({ sourceCode: "LEGACY" }); expect(upgraded.verno).toBe(6);
    await saveFieldSource(source(), undefined, upgraded); expect(await upgraded.fieldSources.count()).toBe(1);
  });
  it("screening reset retains an EC source without visits", async () => {
    const d = database(); await d.sources.add({ id: "ec", recordScope: "EXPERIMENTAL_EC" } as never);
    await resetDemoData(d); expect(await d.sources.count()).toBe(1);
  });
});

describe("demo, reports and translations", () => {
  it("loads four idempotent isolated scenarios and a complete follow-up", async () => {
    const d = database(); await history(d); await loadFieldDemo(d); await loadFieldDemo(d);
    const demo = await readField("SYNTHETIC_DEMO", d);
    expect(demo.sources).toHaveLength(4); expect((await readField("MANUAL_FIELD", d)).measurements).toHaveLength(3);
    expect(demo.measurements.find(m => m.id === "field-demo-2-visit-1")?.quality.requiresThirdReading).toBe(true);
    expect(demo.investigations.find(i => i.sourceId === "field-demo-3")?.state).toBe("NEEDS_REVIEW");
    expect(demo.investigations.find(i => i.sourceId === "field-demo-4")?.events.map(e => e.state)).toEqual(["NEEDS_REVIEW", "RETEST_REQUESTED", "RETEST_COMPLETED", "LAB_REFERRED", "CLOSED_UNCONFIRMED"]);
  });
  it("exports only selected source with follow-up, calibration, rules and Hindi labels", async () => {
    const d = database(); await loadFieldDemo(d); const demo = await readField("SYNTHETIC_DEMO", d);
    const csv = fieldCsv(demo, "field-demo-4", "SYNTHETIC_DEMO", "en");
    expect(csv).toContain("Closed without confirmation"); expect(csv).toContain("1413"); expect(csv).toContain("SYNTHETIC_DEMO"); expect(csv).not.toContain("field-demo-3");
    expect(fieldCsv(demo, "field-demo-4", "SYNTHETIC_DEMO", "hi")).toContain("पुष्टि के बिना बंद");
    expect(() => fieldCsv(demo, "field-demo-4", "MANUAL_FIELD", "en")).toThrow();
  });
  it.each(["=1+1", " +SUM(A1)", "\t@SUM(A1)", "\r-1", "\u0000=1"])('neutralizes formula %s', value => expect(csvCell(value)).toContain("'"));
  it("escapes quotes and keeps negative numeric values numeric", () => { expect(csvCell('a"b')).toBe('"a""b"'); expect(csvCell(-5)).toBe('"-5"'); });
  it("provides non-empty English and Hindi for every field label", () => { for (const pair of Object.values(labels)) { expect(pair).toHaveLength(2); expect(pair[0].trim()).not.toBe(""); expect(pair[1]).toMatch(/[\u0900-\u097f]/); } });
  it("rejects corrupt quality flags rather than trusting them", async () => {
    const d = database(); await history(d); const m = (await d.fieldMeasurements.toArray())[0];
    await d.fieldMeasurements.put({ ...m, quality: { ...m.quality, status: "DISAGREEMENT" } } as FieldMeasurement);
    await expect(readField("MANUAL_FIELD", d)).rejects.toMatchObject({ code: "corrupt" });
  });
});


it("rejects corrupted comparison snapshots while preserving stored records", async () => {
  const d = database(); await history(d); const m = (await d.fieldMeasurements.toArray())[0];
  await d.fieldMeasurements.put({ ...m, comparison: { ...m.comparison, status: "stable", baseline: 1 } });
  await expect(readField("MANUAL_FIELD", d)).rejects.toMatchObject({ code: "corrupt" });
  expect(await d.fieldMeasurements.count()).toBe(3);
});
it("allows a non-reproduced anomaly to close only after reviewed stable retest evidence", async () => {
  const d = database(); await history(d); await saveFieldMeasurement(input(4, 1000), defaultRule, d);
  const i = (await d.fieldInvestigations.toArray())[0]; const at = () => new Date().toISOString();
  await appendInvestigationEvent(i.id, i.events[0].id, { id: "request", at: at(), state: "RETEST_REQUESTED", note: "Check change", operator: "OP-2", finding: "UNDETERMINED" }, d);
  const retest = await saveFieldMeasurement({ ...input(5), measuredAt: at(), investigationId: i.id }, defaultRule, d);
  const evidence = { at: at(), note: "Change not reproduced, safety not established", operator: "OP-2", finding: "CHANGE_NOT_REPRODUCED" as const, measurementId: retest.id };
  await appendInvestigationEvent(i.id, "request", { ...evidence, id: "completed", state: "RETEST_COMPLETED" }, d);
  await appendInvestigationEvent(i.id, "completed", { ...evidence, at: at(), id: "resolved", state: "RESOLVED" }, d);
  expect((await readField("MANUAL_FIELD", d)).investigations[0].state).toBe("RESOLVED");
});
