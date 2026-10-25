import { useId } from 'react';
import { states, stateByName } from '@/field/locations';
import type { Translate } from '@/field/i18n';

export function SourceLocationFields({state,district,legacy,t,onChange}:{state:string;district:string;legacy:boolean;t:Translate;onChange:(state:string,district:string)=>void}) {
  const id=useId(), selected=stateByName(state);
  return <>
    <label>{t('state')}<input list={`${id}-states`} required={!legacy} value={state} placeholder={t('selectState')} autoComplete="off" onChange={e=>onChange(e.target.value,'')} /></label>
    <datalist id={`${id}-states`}>{states.map(s=><option key={s.code} value={s.name} />)}</datalist>
    {legacy&&!state ? <p>{t('legacyLocation')} {district} · {t('locationUnspecified')}</p> : <>
      <label>{t('district')}<input list={`${id}-districts`} required disabled={!selected} value={district} placeholder={t('selectDistrict')} autoComplete="off" onChange={e=>onChange(state,e.target.value)} /></label>
      <datalist id={`${id}-districts`}>{selected?.districts.map(d=><option key={d} value={d} />)}</datalist>
    </>}
    <small>{t('locationSnapshot')}</small>
  </>;
}
