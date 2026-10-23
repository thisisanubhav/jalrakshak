import { db } from "@/data/database";
import { defaultRule, type FieldSource, type MeasurementInput } from "./model";
import { appendInvestigationEvent, saveFieldMeasurement, saveFieldSource } from "./store";

// Fixed identities and dates make this fixture reproducible and idempotent.
export async function loadFieldDemo(database = db) {
  return database.transaction("rw", database.fieldSources, database.fieldMeasurements, database.fieldInvestigations, async () => {
    for (let scenario = 1; scenario <= 4; scenario++) {
      const id = `field-demo-${scenario}`;
      if (await database.fieldSources.get(id)) continue;
      const source: FieldSource = { id, scope: "SYNTHETIC_DEMO", code: `DEMO-0${scenario}`, name: `Demo ${scenario} / डेमो ${scenario}`, village: "Fictional village / काल्पनिक गाँव", district: "Khunti / खूंटी", location: "Synthetic example / कृत्रिम उदाहरण", category: "HANDPUMP", operator: "DEMO", createdAt: "2026-01-01T06:00:00.000Z", updatedAt: "2026-01-01T06:00:00.000Z" };
      await saveFieldSource(source, undefined, database);
      const input = (index: number, readings: number[]): MeasurementInput => ({ id: `${id}-visit-${index}`, sourceId: id, scope: "SYNTHETIC_DEMO", measuredAt: `2026-01-0${index}T07:00:00.000Z`, readings, temperature: 25, instrument: "Demo EC meter", device: "DEMO", probe: "P1", calibrationDate: "2026-01-01", calibrationReference: "Synthetic 1413 µS/cm reference", method: "DIRECT_SOURCE", operator: "DEMO", notes: "Synthetic evidence / कृत्रिम साक्ष्य" });
      if (scenario === 1) await saveFieldMeasurement(input(1, [610, 614]), defaultRule, database);
      if (scenario === 2) await saveFieldMeasurement(input(1, [610, 830]), defaultRule, database);
      if (scenario >= 3) {
        for (let index = 1; index <= 3; index++) await saveFieldMeasurement(input(index, [608 + index, 612 + index]), defaultRule, database);
        const anomaly = await saveFieldMeasurement(input(4, [1018, 1022]), defaultRule, database);
        const investigation = (await database.fieldInvestigations.get(`investigation-${anomaly.id}`))!;
        // Fixture chronology uses the same transition validator as real records.
        investigation.events[0].at = "2026-01-04T08:00:00.000Z";
        await database.fieldInvestigations.put(investigation);
        if (scenario === 4) {
          const request = { id: `${id}-request`, at: "2026-01-04T09:00:00.000Z", state: "RETEST_REQUESTED" as const, note: "Repeat visit requested / पुनः दौरे का अनुरोध", operator: "DEMO", finding: "UNDETERMINED" as const };
          await appendInvestigationEvent(investigation.id, investigation.events[0].id, request, database);
          const retest = await saveFieldMeasurement({ ...input(5, [1020, 1024]), investigationId: investigation.id }, defaultRule, database);
          const complete = { id: `${id}-completed`, at: "2026-01-05T08:00:00.000Z", state: "RETEST_COMPLETED" as const, note: "Repeat visit supports persistent change / पुनः दौरे में बदलाव बना रहा", operator: "DEMO", finding: "PERSISTENT_CHANGE" as const, measurementId: retest.id };
          await appendInvestigationEvent(investigation.id, request.id, complete, database);
          const referred = { ...complete, id: `${id}-referred`, at: "2026-01-05T09:00:00.000Z", state: "LAB_REFERRED" as const, note: "Operator plans laboratory testing; no sample sent by app / ऑपरेटर की परीक्षण योजना; ऐप ने नमूना नहीं भेजा" };
          await appendInvestigationEvent(investigation.id, complete.id, referred, database);
          await appendInvestigationEvent(investigation.id, referred.id, { ...complete, id: `${id}-closed`, at: "2026-01-06T09:00:00.000Z", state: "CLOSED_UNCONFIRMED", note: "Demo ended without laboratory confirmation; safety unknown / प्रयोगशाला पुष्टि के बिना डेमो समाप्त; सुरक्षा अज्ञात" }, database);
        }
      }
    }
  });
}

/** Atomic scope deletion: never touch manual, legacy EC, or screening records. */
export async function resetFieldDemo(database = db) {
  await database.transaction('rw', database.fieldSources, database.fieldMeasurements, database.fieldInvestigations, async () => {
    await database.fieldInvestigations.where('scope').equals('SYNTHETIC_DEMO').delete();
    await database.fieldMeasurements.where('scope').equals('SYNTHETIC_DEMO').delete();
    await database.fieldSources.where('scope').equals('SYNTHETIC_DEMO').delete();
  });
}
