import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { JalRakshakDatabase, readAll } from "./database";
import { syncPending, type SyncTransport } from "./sync";

const source = { id: "s1", sourceCode: "JR-HP-0012", sourceType: "HANDPUMP" as const, village: "Khunti", name: "School", latitude: 23.34, longitude: 85.31, createdAt: new Date().toISOString(), syncStatus: "LOCAL_ONLY" as const };
describe("offline storage and sync", () => {
  const databases: JalRakshakDatabase[] = [];
  afterEach(async () => { for (const d of databases) { d.close(); await d.delete(); } databases.length = 0; });
  it("persists a source", async () => { const d = new JalRakshakDatabase(`test-${crypto.randomUUID()}`); databases.push(d); await d.sources.add(source); expect((await readAll(d)).sources).toHaveLength(1); });
  it("deduplicates already synced records", async () => {
    const d = new JalRakshakDatabase(`test-${crypto.randomUUID()}`); databases.push(d); await d.sources.add(source);
    let calls = 0; const transport: SyncTransport = { push: async data => { calls++; return { acceptedIds: data.sources.map(x => x.id) }; } };
    expect(await syncPending(transport, d)).toBe(1); expect(await syncPending(transport, d)).toBe(0); expect(calls).toBe(1);
    expect((await d.sources.get("s1"))?.syncStatus).toBe("SYNCED");
  });
});
