import { states, stateByName, districtByName } from '@/field/locations';
import type { Translate } from '@/field/i18n';
import { Select } from './FieldViews';

export function SourceLocationFields({state,district,legacy,t,onChange}:{state:string;district:string;legacy:boolean;t:Translate;onChange:(state:string,district:string)=>void}) {
  const selected = stateByName(state);
  return <>
    <Select label={t('state')} required={!legacy} value={selected?.name ?? ''} onChange={e=>onChange(e.target.value,'')}>
      <option value="">{t('selectState')}</option>
      {states.map(s=><option key={s.code} value={s.name}>{s.name}</option>)}
    </Select>
    {legacy&&!state ? <p>{t('legacyLocation')} {district} · {t('locationUnspecified')}</p> :
      <Select label={t('district')} required disabled={!selected} value={districtByName(state,district) ?? ''} onChange={e=>onChange(state,e.target.value)}>
        <option value="">{t('selectDistrict')}</option>
        {selected?.districts.map(d=><option key={d} value={d}>{d}</option>)}
      </Select>
    }
  </>;
}
