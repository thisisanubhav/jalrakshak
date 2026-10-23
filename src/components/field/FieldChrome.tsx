import { ArrowRight, Cloud, CloudOff, Droplets, Languages } from "lucide-react";
import type { Locale } from "@/field/model";
import type { Translate } from "@/field/i18n";

// Use the same atmospheric shell, branding and hero primitives as the deployed UI.
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

export function FieldHeader({ locale, online, t, onLanguage }: {
  locale: Locale; online: boolean; t: Translate; onLanguage: () => void;
}) {
  return (
    <header className="air-header field-topbar no-print sticky top-0 z-40 border-b border-slate-900/10 bg-white/35 backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-2 px-4 py-2 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="air-brand-mark grid h-10 w-10 shrink-0 place-items-center rounded-full bg-teal-950/10 text-teal-950">
            <Droplets aria-hidden="true" className="h-6 w-6" />
          </div>
          <div>
            <strong className="air-brand hidden font-black text-teal-950 min-[370px]:block">JalRakshak</strong>
            <p className="hidden text-xs text-slate-700 sm:block">{t("title")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`air-status flex min-h-10 items-center gap-2 rounded-full px-3 text-xs font-bold ${online ? "bg-white/55 text-teal-950" : "bg-amber-100 text-amber-950"}`}>
            {online ? <Cloud aria-hidden="true" className="h-4 w-4" /> : <CloudOff aria-hidden="true" className="h-4 w-4" />}
            {t(online ? "online" : "offline")}
          </span>
          <button type="button" className="air-language flex items-center gap-2" aria-label="Switch language / भाषा बदलें" onClick={onLanguage}>
            <Languages aria-hidden="true" className="h-4 w-4" />{locale === "en" ? "हिंदी" : "EN"}
          </button>
        </div>
      </div>
    </header>
  );
}

export function FieldHero({ t, synthetic, ready, onRegister }: {
  t: Translate; synthetic: boolean; ready: boolean; onRegister: () => void;
}) {
  return (
    <section className="air-hero field-hero relative flex min-h-[31rem] items-center justify-center overflow-hidden p-6 text-center text-teal-950 sm:min-h-[38rem] sm:p-9">
      <div className="relative z-10 mx-auto max-w-3xl">
        <span className="inline-flex rounded-full border border-teal-950/20 bg-white/45 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em]">{t(synthetic ? "synthetic" : "manual")}</span>
        <p className="air-kicker mt-8 text-xs font-black uppercase tracking-[0.34em] text-teal-950/80">JalRakshak</p>
        <h1 className="air-hero-title">{t("heroTitle")}</h1>
        <p className="field-hero-body">{t("heroBody")}</p>
        <button type="button" disabled={!ready} onClick={onRegister} className="air-primary-cta field-hero-cta">
          {t("add")}<ArrowRight aria-hidden="true" className="h-5 w-5" />
        </button>
      </div>
      <span aria-hidden="true" className="air-hero-orb air-hero-orb-left" />
      <span aria-hidden="true" className="air-hero-orb air-hero-orb-right" />
    </section>
  );
}
