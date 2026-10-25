import type { FieldSource, FieldMeasurement, Investigation } from "@/field/model";
import Dexie, { type EntityTable } from "dexie";
import type {
  AppData,
  LabReferral,
  MeasurementProvenanceMap,
  WaterSource,
  WaterTest,
} from "@/domain/types";
import type { ECData, ECDevice, ECMeasurementRecord } from "@/ec/types";
import type { JudgeDemoScenario } from "@/demo/types";

export class JalRakshakDatabase extends Dexie {
  sources!: EntityTable<WaterSource, "id">;
  tests!: EntityTable<WaterTest, "id">;
  referrals!: EntityTable<LabReferral, "id">;
  ecDevices!: EntityTable<ECDevice, "id">;
  ecMeasurements!: EntityTable<ECMeasurementRecord, "id">;
  judgeDemoScenarios!: EntityTable<JudgeDemoScenario, "id">;
  fieldSources!: EntityTable<FieldSource, "id">;
  fieldMeasurements!: EntityTable<FieldMeasurement, "id">;
  fieldInvestigations!: EntityTable<Investigation, "id">;
  teamState!: EntityTable<{ id: string; value: unknown }, "id">;
  constructor(name = "jalrakshak") {
    super(name);
    this.on('ready', () => {
      if (name.startsWith('jalrakshak-worker-') && typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function' && localStorage.getItem(`jalrakshak-device-removed:${name.slice('jalrakshak-worker-'.length)}`)) {
        this.close();
        throw new Error('Device copy removed. Sign in online to reopen this account.');
      }
    }, true);
    const schema = {
      sources: "id, sourceCode, syncStatus, createdAt",
      tests: "id, sourceId, screeningStatus, syncStatus, testedAt",
      referrals: "id, testId, sourceId, referralStatus, syncStatus",
    };
    this.version(1).stores(schema);
    this.version(2)
      .stores(schema)
      .upgrade(async (transaction) => {
        await transaction
          .table<WaterTest, string>("tests")
          .toCollection()
          .modify((test) => {
            test.dataOrigin ??= "SIMULATED";
            test.providerName ??= "JalRakshak Simulator";
          });
      });
    this.version(3)
      .stores(schema)
      .upgrade(async (transaction) => {
        await transaction
          .table<WaterTest, string>("tests")
          .toCollection()
          .modify((test) => {
            if (test.measurementProvenance) return;
            const keys = ["ph", "tds", "turbidity", "temperature"] as const;
            test.measurementProvenance = Object.fromEntries(
              keys.map((key) => [
                key,
                {
                  availability: "AVAILABLE",
                  dataOrigin: test.dataOrigin ?? "SIMULATED",
                  providerName: test.providerName ?? "JalRakshak Simulator",
                },
              ]),
            ) as MeasurementProvenanceMap;
          });
      });
    this.version(4).stores({
      ...schema,
      ecDevices: "id, deviceId, probeId, createdAt",
      ecMeasurements:
        "id, visitId, sourceId, deviceId, measuredAt, measurementQuality, dataOrigin, syncStatus",
    });
    this.version(5).stores({
      ...schema,
      ecDevices: "id, deviceId, probeId, createdAt",
      ecMeasurements:
        "id, visitId, sourceId, deviceId, measuredAt, measurementQuality, dataOrigin, syncStatus",
      judgeDemoScenarios: "id, sequence, loadedAt",
    });
    // Additive migration: legacy and synthetic stores remain untouched.
    this.version(6).stores({
      fieldSources: "id, [scope+code], scope, updatedAt",
      fieldMeasurements: "id, sourceId, scope, measuredAt, investigationId",
      fieldInvestigations: "id, sourceId, scope, state, measurementId",
    });
    this.version(7).stores({ teamState: "id" });
  }
}

export const db = new JalRakshakDatabase();
export async function readAll(database = db): Promise<AppData> {
  const [sources, tests, referrals] = await Promise.all([
    database.sources.toArray(),
    database.tests.toArray(),
    database.referrals.toArray(),
  ]);
  return { sources, tests, referrals };
}
export async function resetDemoData(database = db) {
  const ecSourceIds = new Set(
    (await database.ecMeasurements.toArray()).map((item) => item.sourceId),
  );
  await database.transaction(
    "rw",
    database.sources,
    database.tests,
    database.referrals,
    async () => {
      const removableSources = (await database.sources.toArray())
        .filter((source) => source.recordScope !== "EXPERIMENTAL_EC" && !ecSourceIds.has(source.id))
        .map((source) => source.id);
      await Promise.all([
        database.sources.bulkDelete(removableSources),
        database.tests.clear(),
        database.referrals.clear(),
      ]);
    },
  );
}

export async function saveTestOnce(test: WaterTest, database = db) {
  return database.transaction("rw", database.tests, async () => {
    const existing = await database.tests.get(test.id);
    if (existing) return { record: existing, created: false };
    await database.tests.add(test);
    return { record: test, created: true };
  });
}

export async function createReferralOnce(referral: LabReferral, database = db) {
  return database.transaction("rw", database.referrals, async () => {
    const existing = await database.referrals
      .where("testId")
      .equals(referral.testId)
      .first();
    if (existing) return { record: existing, created: false };
    await database.referrals.add(referral);
    return { record: referral, created: true };
  });
}

export async function readECData(database = db): Promise<ECData> {
  const [devices, measurements] = await Promise.all([
    database.ecDevices.toArray(),
    database.ecMeasurements.toArray(),
  ]);
  return { devices, measurements };
}

export async function saveECDevice(device: ECDevice, database = db) {
  await database.ecDevices.put(device);
  return device;
}

export async function saveECMeasurementOnce(
  measurement: ECMeasurementRecord,
  database = db,
) {
  return database.transaction("rw", database.ecMeasurements, async () => {
    const existing = await database.ecMeasurements.get(measurement.id);
    if (existing) return { record: existing, created: false };
    await database.ecMeasurements.add(measurement);
    return { record: measurement, created: true };
  });
}

export async function resetExperimentalECData(database = db) {
  const screeningSourceIds = new Set(
    (await database.tests.toArray()).map((item) => item.sourceId),
  );
  await database.transaction(
    "rw",
    database.sources,
    database.ecDevices,
    database.ecMeasurements,
    async () => {
      const removableSources = (await database.sources.toArray())
        .filter(
          (source) =>
            source.recordScope === "EXPERIMENTAL_EC" &&
            !screeningSourceIds.has(source.id),
        )
        .map((source) => source.id);
      await Promise.all([
        database.ecMeasurements.clear(),
        database.ecDevices.clear(),
        database.sources.bulkDelete(removableSources),
      ]);
    },
  );
}

export async function readJudgeDemoScenarios(database = db) {
  return database.judgeDemoScenarios.orderBy("sequence").toArray();
}

export async function loadJudgeDemoScenario(
  scenario: JudgeDemoScenario,
  database = db,
) {
  const stored = {
    ...structuredClone(scenario),
    loadedAt: new Date().toISOString(),
  };
  await database.judgeDemoScenarios.put(stored);
  return stored;
}

export async function resetJudgeDemoScenarios(database = db) {
  await database.judgeDemoScenarios.clear();
}
