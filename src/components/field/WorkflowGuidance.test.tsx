import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { VisitSyncStatus, WorkflowContext, GettingStarted } from './WorkflowGuidance';
import { translate } from '@/field/i18n';
import { compareField, defaultRule, type FieldMeasurement, type FieldSource } from '@/field/model';
import { evaluateECRepeatability } from '@/ec/measurement-quality';
const source:FieldSource={id:'source',code:'S1',name:'Pump',scope:'MANUAL_FIELD',village:'Village',district:'Khunti',location:'',category:'HANDPUMP',operator:'OP',createdAt:'2026-01-01T00:00:00Z',updatedAt:'2026-01-01T00:00:00Z'};
const input={id:'visit',sourceId:'source',scope:'MANUAL_FIELD' as const,measuredAt:'2026-01-02T00:00:00Z',readings:[600,602],instrument:'Meter',device:'',probe:'',calibrationDate:'',calibrationReference:'',method:'DIRECT_SOURCE' as const,operator:'OP',notes:''};
const visit:FieldMeasurement={...input,createdAt:input.measuredAt,rule:defaultRule,quality:evaluateECRepeatability(input.readings),comparison:compareField(input,[],defaultRule)};
const snapshot={revision:'1',assignments:{source:'supervisor'},data:{sources:[source],measurements:[visit],investigations:[]}};
const base={snapshot,syncing:false,failed:false,conflict:false,retry:()=>{}};
it('confirms the exact visit even when another record failed to sync',()=>{
 const html=renderToStaticMarkup(<WorkflowContext.Provider value={{...base,failed:true}}><VisitSyncStatus visit={visit} t={translate('en')}/></WorkflowContext.Provider>);
 expect(html).toContain('Synced to your team'); expect(html).not.toContain('Retry visit sync');
});
it('does not confirm edited evidence just because the visit ID exists on the server',()=>{
 const html=renderToStaticMarkup(<WorkflowContext.Provider value={base}><VisitSyncStatus visit={{...visit,notes:'Changed offline'}} t={translate('en')}/></WorkflowContext.Provider>);
 expect(html).toContain('Saved on this device');expect(html).toContain('Retry visit sync');expect(html).not.toContain('Synced to your team');
});
it('disables retry while a conflict needs review and supports Hindi',()=>{
 const html=renderToStaticMarkup(<WorkflowContext.Provider value={{...base,snapshot:undefined,conflict:true}}><VisitSyncStatus visit={visit} t={translate('hi')}/></WorkflowContext.Provider>);
 expect(html).toContain('सिंक विवाद');expect(html).toContain('disabled');
});
it('never labels training or personal visits as team-synced',()=>{
 expect(renderToStaticMarkup(<VisitSyncStatus visit={visit} t={translate('en')}/>)).toBe('');
 expect(renderToStaticMarkup(<WorkflowContext.Provider value={base}><VisitSyncStatus visit={{...visit,scope:'SYNTHETIC_DEMO'}} t={translate('en')}/></WorkflowContext.Provider>)).toBe('');
});
it('keeps assignment onboarding incomplete for a source still owned by its creator',()=>{
 const html=renderToStaticMarkup(<WorkflowContext.Provider value={{...base,supervisorId:'supervisor'}}><GettingStarted data={snapshot.data} t={translate('en')} onRegister={()=>{}} onTeam={()=>{}} onSchedule={()=>{}}/></WorkflowContext.Provider>);
 expect(html).toContain('Invite a worker');expect(html.match(/>Open</g)?.length).toBe(2);
});
