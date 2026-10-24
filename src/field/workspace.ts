import { db, JalRakshakDatabase } from '@/data/database';
let active = db;
export function fieldDatabase() { return active; }
export function activateWorkspace(userId: string) {
  if (!/^[a-zA-Z0-9-]+$/.test(userId)) throw new Error('Invalid account');
  if (active !== db) active.close();
  active = new JalRakshakDatabase(`jalrakshak-worker-${userId}`);
  return active;
}
export function closeWorkspace() { if (active !== db) active.close(); active = db; }

export function workspaceKey(key: string) { return active === db ? key : `${active.name}:${key}`; }
