import type { FieldData } from "@/field/model";
export type TeamRole = "worker" | "supervisor";
export interface TeamUser { id: string; username: string; name: string; role: TeamRole }
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
  activity: { id: number; actorName: string; action: string; at: string }[];
  at: string;
}
