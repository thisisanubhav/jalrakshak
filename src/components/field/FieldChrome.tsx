
import { pickLanguage, useUiLanguage } from '@/components/UiLanguage';
import { ArrowRight, Cloud, CloudOff, Droplets, Languages, MapPin } from "lucide-react";
import type { Locale } from "@/field/model";
import type { Translate } from "@/field/i18n";

// Shared atmospheric primitives for every field workspace.
export function FieldAtmosphere() {
  return (
    <div className="air-atmosphere no-print" aria-hidden="true">
      <span className="air-cloud air-cloud-one" />
      <span className="air-cloud air-cloud-two" />
      <span className="air-cloud air-cloud-three" />
      <span className="air-haze" />
    </div>
  );
}

export function FieldHeader({ locale, online, t, onLanguage, onHome }: {
  locale: Locale; online: boolean; t: Translate; onLanguage: () => void; onHome: () => void;
}) {
  const {locale:uiLocale}=useUiLanguage();
  return (
    <header className="air-header field-topbar no-print sticky top-0 z-40 border-b border-slate-900/10 bg-white/35 backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-2 px-4 py-2 sm:px-6">
        <button type="button" className="field-brand-home flex items-center gap-3" aria-label={`JalRakshak · ${t("navHome")}`} onClick={onHome}>
          <span className="air-brand-mark grid h-10 w-10 shrink-0 place-items-center rounded-full bg-teal-950/10 text-teal-950">
            <Droplets aria-hidden="true" className="h-6 w-6" />
          </span>
          <span>
            <strong className="air-brand hidden font-black text-teal-950 min-[370px]:block">JalRakshak</strong>
            <span className="hidden text-xs text-slate-700 sm:block">{t("title")}</span>
          </span>
        </button>
        <div className="flex items-center gap-2">
          <span className={`air-status flex min-h-10 items-center gap-2 rounded-full px-3 text-xs font-bold ${online ? "bg-white/55 text-teal-950" : "bg-amber-100 text-amber-950"}`}>
            {online ? <Cloud aria-hidden="true" className="h-4 w-4" /> : <CloudOff aria-hidden="true" className="h-4 w-4" />}
            {t(online ? "online" : "offline")}
          </span>
          <button type="button" className="air-language flex items-center gap-2" aria-label={pickLanguage("Switch language / भाषा बदलें",uiLocale)} onClick={onLanguage}>
            <Languages aria-hidden="true" className="h-4 w-4" />{locale === "en" ? "हिंदी" : "EN"}
          </button>
        </div>
      </div>
    </header>
  );
}

export function FieldHero({ t, synthetic, ready, onRegister, onMap }: {
  t: Translate; synthetic: boolean; ready: boolean; onRegister: () => void; onMap: () => void;
}) {
  return (
    <section className="air-hero field-hero field-work-intro">
      <div>
        <p className="field-work-eyebrow">{t(synthetic ? "synthetic" : "manual")}</p>
        <h1>{t("workTitle")}</h1>
        <p className="field-hero-body">{t("workHelp")}</p>
      </div>
      <div className="field-work-actions">
        <button type="button" disabled={!ready} onClick={onRegister} className="air-primary-cta field-hero-cta">
          {t("add")}<ArrowRight aria-hidden="true" className="h-5 w-5" />
        </button>
        <button type="button" className="field-map-entry" onClick={onMap}><MapPin size={18} aria-hidden="true" />{t("exploreMap")}</button>
      </div>
    </section>
  );
}
