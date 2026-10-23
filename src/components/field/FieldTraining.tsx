"use client";
import { useState } from 'react';
import type { Locale } from '@/field/model';
import type { Translate } from '@/field/i18n';
import { JalRakshakApp } from '../JalRakshakApp';
import { InteractiveJudgeDemo } from '../InteractiveJudgeDemo';
export function FieldTraining({ locale, online, t, onJudgeDemo }: { locale: Locale; online: boolean; t: Translate; onJudgeDemo: () => void }) {
  const [experience, setExperience] = useState<'screening' | 'ec'>();
  return <section className="field-card"><h2>{t('training')}</h2>
    <p className="field-badge">{t('simulatedWarning')}</p><p>{t('simulatorHelp')}</p>
    <div className="field-actions">
      <button type="button" onClick={() => setExperience(experience === 'screening' ? undefined : 'screening')} aria-pressed={experience === 'screening'}>{t('screeningSimulator')}</button>
      <button type="button" onClick={onJudgeDemo}>{t('demo')}</button>
      <button type="button" onClick={() => setExperience(experience === 'ec' ? undefined : 'ec')} aria-pressed={experience === 'ec'}>{t('interactiveDemo')}</button>
    </div>
    <p>{t('demoHelp')}</p><ol>{(['scenario1','scenario2','scenario3','scenario4'] as const).map(key => <li key={key}>{t(key)}</li>)}</ol>
    {experience === 'screening' && <JalRakshakApp key={locale} training initialLocale={locale} />}
    {experience === 'ec' && <InteractiveJudgeDemo locale={locale} online={online} onBack={() => setExperience(undefined)} />}
    <p><a href="/?legacy=1">{t('legacy')}</a></p>
  </section>;
}
