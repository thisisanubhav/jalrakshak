import Dexie, { type EntityTable } from "dexie";
import type { AppData, LabReferral, WaterSource, WaterTest } from "@/domain/types";

export class JalRakshakDatabase extends Dexie {
  sources!: EntityTable<WaterSource, "id">;
  tests!: EntityTable<WaterTest, "id">;
  referrals!: EntityTable<LabReferral, "id">;
  constructor(name = "jalrakshak") {
    super(name);
    this.version(1).stores({ sources: "id, sourceCode, syncStatus, createdAt", tests: "id, sourceId, screeningStatus, syncStatus, testedAt", referrals: "id, testId, sourceId, referralStatus, syncStatus" });
  }
}

export const db = new JalRakshakDatabase();
export async function readAll(database = db): Promise<AppData> {
  const [sources, tests, referrals] = await Promise.all([database.sources.toArray(), database.tests.toArray(), database.referrals.toArray()]);
  return { sources, tests, referrals };
}
export async function resetDemoData(database = db) { await database.transaction("rw", database.sources, database.tests, database.referrals, () => Promise.all([database.sources.clear(), database.tests.clear(), database.referrals.clear()])); }

