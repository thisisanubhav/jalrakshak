import type { FieldData, FieldSource } from '@/field/model';
import { canonical, type TeamSnapshot } from './shared';
export interface MergeConflict { key:string; label:string; local:unknown; remote:unknown; localAllowed:boolean; }
export interface MergePlan { data:FieldData; conflicts:MergeConflict[]; }
type Choices=Record<string,'local'|'remote'>;
const equal=(a:unknown,b:unknown)=>canonical(a)===canonical(b);
// Three-way reconciliation never deletes server evidence or restores lost access.
export function mergeRecords(base:FieldData, local:FieldData, remote:TeamSnapshot, choices:Choices={}):MergePlan {
  const data=structuredClone(remote.data); const conflicts:MergeConflict[]=[];
  function choose(key:string,label:string,ours:unknown,theirs:unknown,localAllowed=true) {
    if (!choices[key] || (choices[key]==='local'&&!localAllowed)) conflicts.push({key,label,local:ours,remote:theirs,localAllowed});
    return choices[key]==='local'&&localAllowed ? ours : theirs;
  }
  const inaccessible=new Set(base.sources.filter(s=>!remote.data.sources.some(r=>r.id===s.id)).map(s=>s.id));
  for(const id of inaccessible) {
    const subset=(d:FieldData)=>({sources:d.sources.filter(s=>s.id===id),measurements:d.measurements.filter(m=>m.sourceId===id),investigations:d.investigations.filter(i=>i.sourceId===id)});
    if(!equal(subset(base),subset(local))) choose(`access:${id}`,'Source reassigned — retain pending work in recovery copy',subset(local),undefined,false);
  }
  for(const ours of local.sources) {
    if(inaccessible.has(ours.id))continue;
    const before=base.sources.find(s=>s.id===ours.id), theirs=data.sources.find(s=>s.id===ours.id);
    if(!theirs){
      const duplicate=data.sources.find(s=>s.code===ours.code);
      if(duplicate) {choose(`duplicate:${ours.id}`,`Identifier ${ours.code} already belongs to another source`,ours,duplicate,false);continue;}
      data.sources.push(structuredClone(ours));continue;
    }
    for(const field of [...new Set([...Object.keys(before??{}),...Object.keys(ours),...Object.keys(theirs)])] as (keyof FieldSource)[]) {
      if(['id','scope','createdAt','updatedAt'].includes(field))continue;
      if(equal(ours[field],theirs[field])||equal(ours[field],before?.[field]))continue;
      const value=equal(theirs[field],before?.[field])?ours[field]:choose(`source:${ours.id}:${field}`,`${ours.code} · ${field}`,ours[field],theirs[field]);
      Object.assign(theirs,{[field]:value});
    }
    theirs.updatedAt=[ours.updatedAt,theirs.updatedAt].sort().at(-1)!;
  }
  for(const source of data.sources) {
    const original=remote.data.sources.find(s=>s.id===source.id);
    if(original&&source.code!==original.code&&data.sources.some(s=>s.id!==source.id&&s.code===source.code)) {
      source.code=choose(`code:${source.id}`,`${source.name} · identifier conflicts with another source`,source.code,original.code,false) as string;
    }
  }
  const sourceIds=new Set(data.sources.map(s=>s.id));
  for(const kind of ['measurements','investigations'] as const) {
    for(const ours of local[kind]) {
      if(!sourceIds.has(ours.sourceId))continue;
      const before=base[kind].find(r=>r.id===ours.id), index=data[kind].findIndex(r=>r.id===ours.id), theirs=data[kind][index];
      if(!theirs){(data[kind] as typeof ours[]).push(structuredClone(ours));continue;}
      if(equal(ours,theirs)||equal(ours,before))continue;
      if(kind==='investigations'&&'events' in ours&&'events' in theirs) {
        if(equal(ours.events.slice(0,theirs.events.length),theirs.events)) {Object.assign(theirs,structuredClone(ours));continue;}
        if(equal(theirs.events.slice(0,ours.events.length),ours.events))continue;
      }
      choose(`${kind}:${ours.id}`,`${kind} · ${ours.id} — saved evidence cannot be rewritten`,ours,theirs,false);
    }
  }

  return {data,conflicts};
}
