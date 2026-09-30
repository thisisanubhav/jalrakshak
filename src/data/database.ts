import Dexie, { type EntityTable } from "dexie";
import type {
  AppData,
  LabReferral,
  MeasurementProvenanceMap,
  WaterSource,
  WaterTest,
} from "@/domain/types";

export class JalRakshakDatabase extends Dexie {
  sources!: EntityTable<WaterSource, "id">;
  tests!: EntityTable<WaterTest, "id">;
  referrals!: EntityTable<LabReferral, "id">;
  constructor(name = "jalrakshak") {
    super(name);
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
  await database.transaction(
    "rw",
    database.sources,
    database.tests,
    database.referrals,
    () =>
      Promise.all([
        database.sources.clear(),
        database.tests.clear(),
        database.referrals.clear(),
      ]),
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
