import type { AppData, SyncStatus } from "@/domain/types";
import { db, readAll, type JalRakshakDatabase } from "./database";

export interface SyncTransport {
  push(data: AppData): Promise<{ acceptedIds: string[] }>;
}
export class DemoSyncTransport implements SyncTransport {
  async push(data: AppData) {
    return {
      acceptedIds: [...data.sources, ...data.tests, ...data.referrals].map(
        (x) => x.id,
      ),
    };
  }
}

const activeSyncs = new WeakMap<JalRakshakDatabase, Promise<number>>();

async function performSync(
  transport: SyncTransport,
  database: JalRakshakDatabase,
) {
  const all = await readAll(database);
  const pending: AppData = {
    sources: all.sources.filter((x) => x.syncStatus !== "SYNCED"),
    tests: all.tests.filter((x) => x.syncStatus !== "SYNCED"),
    referrals: all.referrals.filter((x) => x.syncStatus !== "SYNCED"),
  };
  const items = [...pending.sources, ...pending.tests, ...pending.referrals];
  if (!items.length) return 0;
  const setStatus = async (
    status: SyncStatus,
    ids = items.map((x) => x.id),
  ) => {
    const idSet = new Set(ids);
    await database.transaction(
      "rw",
      database.sources,
      database.tests,
      database.referrals,
      async () => {
        await database.sources.toCollection().modify((item) => {
          if (idSet.has(item.id)) item.syncStatus = status;
        });
        await database.tests.toCollection().modify((item) => {
          if (idSet.has(item.id)) item.syncStatus = status;
        });
        await database.referrals.toCollection().modify((item) => {
          if (idSet.has(item.id)) item.syncStatus = status;
        });
      },
    );
  };
  await setStatus("SYNCING");
  try {
    const result = await transport.push(pending);
    const itemIds = new Set(items.map((item) => item.id));
    const acceptedIds = [...new Set(result.acceptedIds)].filter((id) =>
      itemIds.has(id),
    );
    const rejectedIds = items
      .map((item) => item.id)
      .filter((id) => !acceptedIds.includes(id));
    await setStatus("SYNCED", acceptedIds);
    if (rejectedIds.length) await setStatus("SYNC_FAILED", rejectedIds);
    return acceptedIds.length;
  } catch (error) {
    await setStatus("SYNC_FAILED");
    throw error;
  }
}

export function syncPending(
  transport: SyncTransport,
  database: JalRakshakDatabase = db,
) {
  const active = activeSyncs.get(database);
  if (active) return active;
  const operation = performSync(transport, database).finally(() => {
    activeSyncs.delete(database);
  });
  activeSyncs.set(database, operation);
  return operation;
}
