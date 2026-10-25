import 'fake-indexeddb/auto';
import { afterEach, expect, it, vi } from 'vitest';
import { JalRakshakDatabase } from '@/data/database';
import { removeAccountDeviceData, removalKey } from './device-cleanup';
const ids:string[]=[];
function storageMock() {
  const data=new Map<string,string>();
  return {get length(){return data.size;},key:(n:number)=>[...data.keys()][n]??null,getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);},removeItem:(k:string)=>{data.delete(k);},clear:()=>data.clear()} as Storage;
}
afterEach(async()=>{vi.unstubAllGlobals();for(const id of ids.splice(0))await new JalRakshakDatabase(`jalrakshak-worker-${id}`).delete();});
it('removes only the selected account and blocks stale reopening until online sign-in',async()=>{
  const storage=storageMock();vi.stubGlobal('localStorage',storage);
  const a=crypto.randomUUID(),b=crypto.randomUUID();ids.push(a,b);
  const first=new JalRakshakDatabase(`jalrakshak-worker-${a}`),second=new JalRakshakDatabase(`jalrakshak-worker-${b}`);
  await first.teamState.put({id:'voice',value:'private audio'});await second.teamState.put({id:'keep',value:'other account'});
  storage.setItem(`jalrakshak-worker-${a}:draft`,'private draft');storage.setItem(`jalrakshak-worker-${b}:draft`,'keep');storage.setItem('team-offline-user',JSON.stringify({user:{id:a}}));
  first.close();await removeAccountDeviceData(a,storage);
  expect(storage.getItem(`jalrakshak-worker-${a}:draft`)).toBeNull();expect(storage.getItem('team-offline-user')).toBeNull();
  expect(storage.getItem(`jalrakshak-worker-${b}:draft`)).toBe('keep');expect(await second.teamState.get('keep')).toBeDefined();
  const stale=new JalRakshakDatabase(`jalrakshak-worker-${a}`);
  await expect(stale.open()).rejects.toThrow('Device copy removed');stale.close();
  storage.removeItem(removalKey(a));
  const fresh=new JalRakshakDatabase(`jalrakshak-worker-${a}`);expect(await fresh.teamState.count()).toBe(0);fresh.close();second.close();
});
it('rejects arbitrary storage names before writing a removal marker',async()=>{
  const storage=storageMock();await expect(removeAccountDeviceData('../other',storage)).rejects.toThrow('Invalid');expect(storage.length).toBe(0);
});
