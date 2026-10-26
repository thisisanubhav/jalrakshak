import { mergeRecords } from './merge';
import type { FieldData } from "@/field/model";
import { fieldDatabase, fieldAccountId } from '@/field/workspace';
import { readField } from '@/field/store';
import { validateFieldData } from '@/field/validation';
import { canonical, type TeamSnapshot, type TeamUser } from './shared';
export class ApiError extends Error { constructor(public status: number,message:string) {super(message);} }
export async function api<T>(path:string, data?:unknown):Promise<T> {
  const serialized=data===undefined?undefined:JSON.stringify(data);
  if(path==='sync' && serialized && new TextEncoder().encode(serialized).length>3_000_000){
    const expectedAccount=fieldAccountId();
    const checkAccount=()=>{if(fieldAccountId()!==expectedAccount)throw new ApiError(401,'Account changed during sync; local records are preserved.');};
    const session=await api<{chunkedSync?:boolean;user?:TeamUser}>('session');
    checkAccount();
    if(session.user?.id!==expectedAccount)throw new ApiError(401,'Account changed during sync; local records are preserved.');
    if(session.chunkedSync){
      const chunks:string[]=[];
      // Never split a UTF-16 surrogate pair across JSON chunks.
      for(let start=0;start<serialized.length;){let end=Math.min(start+200_000,serialized.length);const last=serialized.charCodeAt(end-1);if(last>=0xD800&&last<=0xDBFF)end--;chunks.push(serialized.slice(start,end));start=end;}
      const upload=await api<{id:string}>('sync-start',{parts:chunks.length});
      for(let index=0;index<chunks.length;index++){checkAccount();await api('sync-part',{id:upload.id,index,body:chunks[index]});}
      checkAccount();
      return api<T>('sync-finish',{id:upload.id});
    }
  }
  const headers: Record<string,string> = {};
  if (data !== undefined) headers['Content-Type']='application/json';
  const account=fieldAccountId();
  if (account && !['session','login','setup'].includes(path)) headers['X-Jalrakshak-Account']=account;
  const response=await fetch(`/api/team/${path}`,{method:data===undefined?'GET':'POST',headers,body:serialized,cache:'no-store',signal:AbortSignal.timeout(65000)});
  let result;try{result=await response.json();}catch{throw new ApiError(response.status,'Server response unavailable. Retry sync; local records are preserved.');} if (!response.ok) throw new ApiError(response.status,result.error ?? 'Request failed.'); return result;
}
function assertAccount(user:TeamUser) {if(fieldAccountId()!==user.id)throw new ApiError(401,'Account changed during sync. Sign in again; local records were preserved.');}
const key=(user:TeamUser)=>`team-snapshot-${user.id}`;
export async function baseline(user:TeamUser):Promise<TeamSnapshot|undefined> { return (await fieldDatabase().teamState.get(key(user)))?.value as TeamSnapshot | undefined; }
export async function pendingRecords(user:TeamUser) {
  assertAccount(user);
  const saved=await baseline(user); const local=await readField('MANUAL_FIELD');
  assertAccount(user);
  return (['sources','measurements','investigations'] as const).flatMap(kind=>local[kind]
    .filter(record=>canonical(record)!==canonical(saved?.data[kind].find(r=>r.id===record.id)))
    .map(record=>{
      const source=local.sources.find(source=>source.id===('sourceId' in record ? record.sourceId : record.id));
      return {id:record.id,kind,source:source ? `${source.code} · ${source.name}` : record.id};
    }));
}
export async function pendingCount(user:TeamUser) { return (await pendingRecords(user)).length; }
export async function pendingChanges(user:TeamUser) { const saved=await baseline(user); const local=await readField('MANUAL_FIELD'); return !saved ? local.sources.length>0 : canonical(local)!==canonical(saved.data); }
export async function applySnapshot(user:TeamUser, snapshot:TeamSnapshot, expected?:FieldData) {
  assertAccount(user);validateFieldData(snapshot.data,'MANUAL_FIELD'); const db=fieldDatabase();
  await db.transaction('rw',db.fieldSources,db.fieldMeasurements,db.fieldInvestigations,db.teamState,async()=>{
    if (expected && canonical(await readField('MANUAL_FIELD',db)) !== canonical(expected)) throw new ApiError(409,'Local records changed while syncing. Try again.');
    await db.fieldSources.where('scope').equals('MANUAL_FIELD').delete();
    await db.fieldMeasurements.where('scope').equals('MANUAL_FIELD').delete();
    await db.fieldInvestigations.where('scope').equals('MANUAL_FIELD').delete();
    await db.fieldSources.bulkAdd(snapshot.data.sources); await db.fieldMeasurements.bulkAdd(snapshot.data.measurements); await db.fieldInvestigations.bulkAdd(snapshot.data.investigations);
    await db.teamState.put({ id:key(user), value:snapshot });
  });

}
export async function synchronize(user:TeamUser) {
  assertAccount(user);
  const saved=await baseline(user); const local=await readField('MANUAL_FIELD');
  const dirty=saved ? canonical(local)!==canonical(saved.data) : local.sources.length>0;
  if (dirty && !saved) throw new ApiError(409,'No team baseline exists. Back up these records before loading team data.');
  assertAccount(user);
  const snapshot=dirty ? await api<TeamSnapshot>('sync',{revision:saved!.revision,data:local}) : await api<TeamSnapshot>('records');
  assertAccount(user);
  // Do not replace edits saved by another tab while a network request was running.
  if (canonical(await readField('MANUAL_FIELD'))!==canonical(local)) throw new ApiError(409,'Local records changed while syncing. Sync again; no local work was replaced.');
  await applySnapshot(user,snapshot,local); return snapshot;
}

export async function conflictReview(user:TeamUser) {
  const saved=await baseline(user); if(!saved)throw new ApiError(409,'No baseline exists. Export a backup before loading the team copy.');
  const local=await readField('MANUAL_FIELD'); const remote=await api<TeamSnapshot>('records');
  return {base:saved.data,local,remote};
}
export type ConflictReview=Awaited<ReturnType<typeof conflictReview>>;
export async function resolveConflict(user:TeamUser, review:ConflictReview, choices:Record<string,'local'|'remote'>) {
  assertAccount(user);const db=fieldDatabase();
  if(canonical(await readField('MANUAL_FIELD',db))!==canonical(review.local))throw new ApiError(409,'Local work changed. Refresh the comparison before resolving.');
  const plan=mergeRecords(review.base,review.local,review.remote,choices);
  if(plan.conflicts.length)throw new ApiError(409,'Choose how to resolve every conflict.');
  try{validateFieldData(plan.data,'MANUAL_FIELD');}catch{throw new ApiError(400,'These choices produce inconsistent records (for example duplicate source identifiers or incomplete coordinates). Choose the shared values for those fields and retry. No device records were replaced.');}
  // Retain the complete original work before any network or device replacement.
  await db.teamState.put({id:`team-recovery-${user.id}-${crypto.randomUUID()}`,value:{data:review.local,at:new Date().toISOString()}});
  assertAccount(user);
  const result=await api<TeamSnapshot>('sync',{revision:review.remote.revision,data:plan.data});
  await applySnapshot(user,result,review.local);return result;
}
