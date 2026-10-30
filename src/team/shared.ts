import type { FieldData } from "@/field/model";
export type TeamRole = "worker" | "supervisor";
export interface TeamUser { id: string; username: string; name: string; role: TeamRole; organisationId?: string; organisationName?: string }
export interface TeamSnapshot { data: FieldData; revision: string; assignments: Record<string, string>; }
// Stable comparison accepts harmless JSON property reordering, never changed evidence.
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  return JSON.stringify(value);
}
export interface TeamOverview {
  snapshot: TeamSnapshot;
  users: (TeamUser & { active: number })[];
  activity: { id: number; actorName: string; action: string; at: string; detail?: string }[];
  at: string;
}
// Audit rows may contain older free text. Expose only known identifiers/counts.
export function publicActivityDetail(action:string,detail:string):string|undefined{
  const id=(value:unknown)=>typeof value==='string'&&/^[a-zA-Z0-9_-]{1,200}$/.test(value)?value:undefined;
  if(['create-account','reset-password','password-recovery','enable-account','disable-account','verified-signup'].includes(action))return id(detail);
  try{const value=JSON.parse(detail);if(!value||typeof value!=='object')return undefined;
    if(action==='assign-source')return JSON.stringify({sourceId:id(value.sourceId),userId:id(value.userId)});
    if(action==='sync')return JSON.stringify({sourceIds:Array.isArray(value.sourceIds)?value.sourceIds.map(id).filter(Boolean):undefined,...Object.fromEntries(['sources','measurements','investigations'].filter(key=>Number.isSafeInteger(value[key])&&value[key]>=0).map(key=>[key,value[key]]))});
  }catch{/* Unknown legacy detail stays private. */}
  return undefined;
}
