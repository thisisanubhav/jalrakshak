import { useState } from 'react';
import { importFieldSources } from '@/field/store';
import { previewSourceImport, sourceCsvTemplate, type ImportPreview } from '@/field/source-import';
import type { FieldSource, Scope } from '@/field/model';
import type { Translate } from '@/field/i18n';

export function SourceImport({sources,scope,t,onImported}:{sources:FieldSource[];scope:Scope;t:Translate;onImported:()=>Promise<unknown>}){
  const [text,setText]=useState(''),[preview,setPreview]=useState<ImportPreview>(),[busy,setBusy]=useState(false),[message,setMessage]=useState<'csvDone'|'csvFailed'|'csvLimit'|'csvRefresh'>();
  const valid=preview&&preview.rows.length>0&&!preview.issues.length&&preview.rows.every(row=>row.source&&row.issues.length===0);
  async function read(file?:File){
    if(!file)return;setPreview(undefined);setMessage(undefined);setText('');
    if(file.size>1_000_000){setMessage('csvLimit');return;}
    setBusy(true);try{const value=await file.text();setText(value);setPreview(previewSourceImport(value,sources,scope));}catch{setMessage('csvFailed');}finally{setBusy(false);}
  }
  async function confirm(){
    if(!valid||busy)return;setBusy(true);setMessage(undefined);
    try{
      await importFieldSources(preview.rows.map(row=>row.source!));
      setText('');setPreview(undefined);setMessage('csvDone');
    }catch{setMessage('csvFailed');setPreview(undefined);return;}
    finally{setBusy(false);}
    // A refresh failure must not misreport a committed import as rolled back.
    try{await onImported();}catch{setMessage('csvRefresh');}
  }
  return <details className="field-card no-print"><summary>{t('bulkImport')}</summary><p>{t('csvHelp')}</p>
    <a className="field-button" href={'data:text/csv;charset=utf-8,'+encodeURIComponent(sourceCsvTemplate)} download="jalrakshak-sources-template.csv">{t('csvTemplate')}</a>
    <fieldset disabled={busy}>
      <label className="field-label">{t('csvFile')}<input type="file" accept=".csv,text/csv" onChange={e=>{void read(e.target.files?.[0]);e.target.value='';}} /></label>
      <label className="field-label">{t('csvContent')}<textarea rows={5} maxLength={1_000_000} value={text} onChange={e=>{setText(e.target.value);setPreview(undefined);setMessage(undefined);}} /></label>
      <button type="button" disabled={!text} onClick={()=>{setMessage(undefined);setPreview(previewSourceImport(text,sources,scope));}}>{t('csvPreview')}</button>
      {preview&&<section aria-label={t('csvPreview')}>
        {preview.issues.map(issue=><p role="alert" key={issue}>{t(issue)}</p>)}
        <p>{t('csvReady')}: {preview.rows.filter(row=>!row.issues.length).length} / {preview.rows.length}</p>
        <ul className="field-task-list">{preview.rows.map(row=><li key={row.line}><div><strong>{t('csvRow')} {row.line}: {row.code} · {row.name}</strong>{row.source&&<p>{row.source.village} · {row.source.district} · {row.source.category}</p>}{row.issues.map(issue=><p role="alert" key={issue}>{t(issue)}</p>)}</div></li>)}</ul>
        <button type="button" disabled={!valid} onClick={()=>void confirm()}>{t('csvConfirm')}</button>
      </section>}
    </fieldset>
    {message&&<p role={message==='csvDone'?'status':'alert'}>{t(message)}</p>}
  </details>;
}
