import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import {
  createReferralOnce,
  JalRakshakDatabase,
  readAll,
  resetDemoData,
  saveTestOnce,
} from "./database";
import type { LabReferral, WaterTest } from "@/domain/types";
import { syncPending, type SyncTransport } from "./sync";

const source = {
  id: "s1",
  sourceCode: "JR-HP-0012",
  sourceType: "HANDPUMP" as const,
  village: "Khunti",
  name: "School",
  latitude: 23.34,
  longitude: 85.31,
  createdAt: new Date().toISOString(),
  syncStatus: "LOCAL_ONLY" as const,
};
const simulatedProvenance = {
  ph: {
    availability: "AVAILABLE" as const,
    dataOrigin: "SIMULATED" as const,
    providerName: "JalRakshak Simulator",
  },
  tds: {
    availability: "AVAILABLE" as const,
    dataOrigin: "SIMULATED" as const,
    providerName: "JalRakshak Simulator",
  },
  turbidity: {
    availability: "AVAILABLE" as const,
    dataOrigin: "SIMULATED" as const,
    providerName: "JalRakshak Simulator",
  },
  temperature: {
    availability: "AVAILABLE" as const,
    dataOrigin: "SIMULATED" as const,
    providerName: "JalRakshak Simulator",
  },
};
describe("offline storage and sync", () => {
  const databases: JalRakshakDatabase[] = [];
  afterEach(async () => {
    for (const d of databases) {
      d.close();
      await d.delete();
    }
    databases.length = 0;
  });
  it("persists a source", async () => {
    const d = new JalRakshakDatabase(`test-${crypto.randomUUID()}`);
    databases.push(d);
    await d.sources.add(source);
    expect((await readAll(d)).sources).toHaveLength(1);
  });
  it("deduplicates already synced records", async () => {
    const d = new JalRakshakDatabase(`test-${crypto.randomUUID()}`);
    databases.push(d);
    await d.sources.add(source);
    let calls = 0;
    const transport: SyncTransport = {
      push: async (data) => {
        calls++;
        return { acceptedIds: data.sources.map((x) => x.id) };
      },
    };
    expect(await syncPending(transport, d)).toBe(1);
    expect(await syncPending(transport, d)).toBe(0);
    expect(calls).toBe(1);
    expect((await d.sources.get("s1"))?.syncStatus).toBe("SYNCED");
  });
  it("deduplicates concurrent test saves and referral creation", async () => {
    const d = new JalRakshakDatabase(`test-${crypto.randomUUID()}`);
    databases.push(d);
    await d.sources.add(source);
    const test: WaterTest = {
      id: "t1",
      sourceId: source.id,
      ph: 7.2,
      tds: 284,
      turbidity: 1.8,
      temperature: 25.4,
      screeningStatus: "LAB_REFERRAL",
      reasonCodes: ["DEMO"],
      explanation: "Demo",
      dataOrigin: "SIMULATED",
      providerName: "JalRakshak Simulator",
      measurementProvenance: simulatedProvenance,
      testedAt: new Date().toISOString(),
      syncStatus: "LOCAL_ONLY",
    };
    await Promise.all([saveTestOnce(test, d), saveTestOnce(test, d)]);
    const referral: LabReferral = {
      id: "r1",
      testId: test.id,
      sourceId: source.id,
      referralStatus: "CREATED",
      notes: "Demo",
      createdAt: new Date().toISOString(),
      syncStatus: "LOCAL_ONLY",
    };
    await Promise.all([
      createReferralOnce(referral, d),
      createReferralOnce({ ...referral, id: "r2" }, d),
    ]);
    expect(await d.tests.count()).toBe(1);
    expect(await d.referrals.count()).toBe(1);
  });
  it("resets sources, tests, referrals, and pending sync state", async () => {
    const d = new JalRakshakDatabase(`test-${crypto.randomUUID()}`);
    databases.push(d);
    await d.sources.add(source);
    await d.tests.add({
      id: "t1",
      sourceId: source.id,
      ph: 7,
      tds: 100,
      turbidity: 1,
      temperature: 25,
      screeningStatus: "NORMAL_SCREENING",
      reasonCodes: [],
      explanation: "Demo",
      dataOrigin: "SIMULATED",
      providerName: "JalRakshak Simulator",
      measurementProvenance: simulatedProvenance,
      testedAt: new Date().toISOString(),
      syncStatus: "LOCAL_ONLY",
    });
    await d.referrals.add({
      id: "r1",
      testId: "t1",
      sourceId: source.id,
      referralStatus: "CREATED",
      notes: "",
      createdAt: new Date().toISOString(),
      syncStatus: "LOCAL_ONLY",
    });
    await resetDemoData(d);
    expect(await readAll(d)).toEqual({ sources: [], tests: [], referrals: [] });
  });
  it("marks unacknowledged records recoverable after partial sync", async () => {
    const d = new JalRakshakDatabase(`test-${crypto.randomUUID()}`);
    databases.push(d);
    await d.sources.bulkAdd([
      source,
      { ...source, id: "s2", sourceCode: "JR-HP-0013" },
    ]);
    const transport: SyncTransport = {
      push: async () => ({ acceptedIds: ["s1"] }),
    };
    expect(await syncPending(transport, d)).toBe(1);
    expect((await d.sources.get("s1"))?.syncStatus).toBe("SYNCED");
    expect((await d.sources.get("s2"))?.syncStatus).toBe("SYNC_FAILED");
  });
});
