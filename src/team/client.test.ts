import 'fake-indexeddb/auto';
import { afterEach, expect, it } from 'vitest';
import { activateWorkspace, closeWorkspace, workspaceKey } from '@/field/workspace';
import { JalRakshakDatabase } from '@/data/database';
import { readField, saveFieldSource } from '@/field/store';
import type { FieldSource } from '@/field/model';
import { applySnapshot, baseline, pendingChanges } from './client';
import type { TeamUser } from './shared';
const ids:string[]=[];
function account():TeamUser {const id=crypto.randomUUID();ids.push(id);return{id,username:id,name:'Worker',role:'worker'};}
afterEach(async()=>{closeWorkspace();for(const id of ids.splice(0))await new JalRakshakDatabase(`jalrakshak-worker-${id}`).delete();});
const source:FieldSource={id:'s1',code:'S1',name:'Pump',scope:'MANUAL_FIELD',village:'Village',district:'Khunti',location:'',category:'HANDPUMP',operator:'OP',createdAt:'2026-01-01T00:00:00.000Z',updatedAt:'2026-01-01T00:00:00.000Z'};
it('isolates field records and draft keys between accounts',async()=>{const a=account(),b=account();activateWorkspace(a.id);await saveFieldSource(source);const firstKey=workspaceKey('field-draft');activateWorkspace(b.id);expect((await readField('MANUAL_FIELD')).sources).toHaveLength(0);expect(workspaceKey('field-draft')).not.toBe(firstKey);activateWorkspace(a.id);expect((await readField('MANUAL_FIELD')).sources).toEqual([source]);});
it('commits server snapshot and sync baseline together and detects pending edits',async()=>{const user=account();activateWorkspace(user.id);const snapshot={data:{sources:[source],measurements:[],investigations:[]},assignments:{s1:user.id},revision:'v1'};await applySnapshot(user,snapshot);expect(await baseline(user)).toEqual(snapshot);expect(await pendingChanges(user)).toBe(false);await saveFieldSource({...source,name:'Changed'},source.updatedAt);expect(await pendingChanges(user)).toBe(true);});
it('refuses to replace edits committed while a sync request was in flight',async()=>{const user=account();activateWorkspace(user.id);const before=await readField('MANUAL_FIELD');await saveFieldSource(source);await expect(applySnapshot(user,{data:before,assignments:{},revision:'v1'},before)).rejects.toMatchObject({status:409});expect((await readField('MANUAL_FIELD')).sources).toEqual([source]);expect(await baseline(user)).toBeUndefined();});
