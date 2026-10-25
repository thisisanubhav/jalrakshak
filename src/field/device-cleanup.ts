import { JalRakshakDatabase } from '@/data/database';
export const removalKey = (id: string) => `jalrakshak-device-removed:${id}`;
export async function removeAccountDeviceData(id: string, storage: Storage = localStorage) {
  if (!/^[a-zA-Z0-9-]+$/.test(id)) throw new Error('Invalid account.');
  const name=`jalrakshak-worker-${id}`;
  // Persist the lock before deletion so other tabs cannot reopen this workspace.
  storage.setItem(removalKey(id),String(Date.now()));
  const offline=storage.getItem('team-offline-user');
  if(offline) {
    try {if(JSON.parse(offline)?.user?.id===id)storage.removeItem('team-offline-user');}
    catch {storage.removeItem('team-offline-user');}
  }
  const keys=Array.from({length:storage.length},(_,i)=>storage.key(i)).filter((key):key is string=>!!key&&key.startsWith(name+':'));
  for(const key of keys)storage.removeItem(key);
  const database=new JalRakshakDatabase(name);
  try {await database.delete();} finally {database.close();}
  // The marker remains until the next server-authenticated sign-in.
}
