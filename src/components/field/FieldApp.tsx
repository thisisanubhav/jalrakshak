"use client";
import { useCallback, useEffect, useState } from "react";
import { JalRakshakApp } from "@/components/JalRakshakApp";
import { FieldError, type FieldData, type FieldSource, type Locale, type Scope } from "@/field/model";
import { translate, type Label } from "@/field/i18n";
import { appendInvestigationEvent, openFieldInvestigation, readField, saveFieldMeasurement, saveFieldSource } from "@/field/store";
import { loadFieldDemo } from "@/field/demo";
import { fieldCsv } from "@/field/report";
import { FieldAtmosphere, FieldHeader, FieldHero } from "./FieldChrome";
import { InvestigationForm, MeasurementForm, SourceForm } from "./FieldForms";
import { EvidenceLog, FieldReport, MeasurementDetails, Select, SourceDetails, Trend } from "./FieldViews";
const tabs = ["sources", "measure", "history", "investigations", "reports"] as const;
type Tab = typeof tabs[number];
const empty: FieldData = { sources: [], measurements: [], investigations: [] };
export function FieldApp() {
  const [locale, setLocale] = useState<Locale>("en"); const [scope, setScope] = useState<Scope>("MANUAL_FIELD"); const [tab, setTab] = useState<Tab>("sources"); const [data, setData] = useState<FieldData>(empty); const [selected, setSelected] = useState(""); const [editing, setEditing] = useState<FieldSource | "new">(); const [investigationId, setInvestigationId] = useState(""); const [error, setError] = useState<Label>(); const [notice, setNotice] = useState(false); const [online, setOnline] = useState(true); const [ready, setReady] = useState(false); const [legacy, setLegacy] = useState(false); const [booted, setBooted] = useState(false); const [busy, setBusy] = useState(false);
  const t = translate(locale);
  const reload = useCallback(async () => { const result = await readField(scope); setData(result); setReady(true); return result; }, [scope]);
  const showError = (err: unknown) => setError(err instanceof FieldError ? err.code : "storageError");
  useEffect(() => {
    queueMicrotask(() => {
      setLegacy(new URLSearchParams(location.search).get("legacy") === "1");
      try {
        const saved = JSON.parse(localStorage.getItem("field-preferences") ?? "{}");
        if (saved.locale === "hi") setLocale("hi");
        if (saved.scope === "SYNTHETIC_DEMO") setScope("SYNTHETIC_DEMO");
        if (tabs.includes(saved.tab)) setTab(saved.tab);
        if (typeof saved.selected === "string") setSelected(saved.selected);
      } catch { setError("storageError"); }
      setOnline(navigator.onLine); setBooted(true);
    });
    const connectivity = () => setOnline(navigator.onLine);
    addEventListener("online", connectivity); addEventListener("offline", connectivity);
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) navigator.serviceWorker.register("/sw-v2.js").catch(() => setError("storageError"));
    return () => { removeEventListener("online", connectivity); removeEventListener("offline", connectivity); };
  }, []);
  useEffect(() => {
    if (!booted || legacy) return;
    let active = true;
    readField(scope).then(result => { if (active) { setData(result); setReady(true); } }).catch(err => { if (active) { showError(err); setReady(false); } });
    return () => { active = false; };
  }, [scope, booted, legacy]);
  useEffect(() => {
    if (!booted || legacy) return;
    document.documentElement.lang = locale;
    try { localStorage.setItem("field-preferences", JSON.stringify({ locale, scope, tab, selected })); } catch { queueMicrotask(() => setError("storageError")); }
  }, [booted, legacy, locale, scope, tab, selected]);
  const sources = data.sources.filter(s => s.scope === scope);
  const source = sources.find(s => s.id === selected) ?? sources[0];
  const measurements = data.measurements.filter(m => m.sourceId === source?.id && m.scope === scope);
  const investigation = data.investigations.find(i => i.id === investigationId && i.scope === scope);
  async function action(fn: () => Promise<unknown>) { setBusy(true); setError(undefined); try { await fn(); await reload(); setNotice(true); } catch (err) { showError(err); } finally { setBusy(false); } }
  function navigate(next: Tab) { setTab(next); setEditing(undefined); setInvestigationId(""); setNotice(false); }
  function download() {
    if (!source) return;
    try { const blob = new Blob([fieldCsv(data, source.id, scope, locale)], { type: "text/csv;charset=utf-8" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `jalrakshak-${source.id}.csv`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); } catch (err) { showError(err); }
  }
  if (legacy) return <><div className="field-legacy-return"><a href="/">{t("back")}</a></div><JalRakshakApp /></>;
  return <div className="field-shell air-shell">
    <FieldAtmosphere />
    <FieldHeader locale={locale} online={online} t={t} onLanguage={() => setLocale(locale === "en" ? "hi" : "en")} />
    <main className="field-main air-main relative z-10"><div className="no-print">
      {tab === "sources" && !editing ? <FieldHero t={t} synthetic={scope === "SYNTHETIC_DEMO"} ready={ready} onRegister={() => setEditing("new")} /> : <h1>{t("title")}</h1>}
      <div className="field-context"><p>{t(online ? "online" : "offline")} · {t("local")}</p><p className="field-scope">{t(scope === "SYNTHETIC_DEMO" ? "synthetic" : "manual")}</p><p>{t("limitation")}</p></div>
      <nav aria-label={t("title")}>{tabs.map(item => <button key={item} type="button" aria-current={tab === item ? "page" : undefined} onClick={() => navigate(item)}>{t(item)}</button>)}</nav>
      <div className="field-actions field-mode-card"><button type="button" onClick={() => { setScope(scope === "MANUAL_FIELD" ? "SYNTHETIC_DEMO" : "MANUAL_FIELD"); setReady(false); setData(empty); setSelected(""); navigate("sources"); }}>{t(scope === "MANUAL_FIELD" ? "demo" : "manual")}</button><a href="/?legacy=1">{t("legacy")}</a></div>
      {error && <div role="alert" className="field-error">{t(error)} <button type="button" onClick={() => void action(reload)}>{t("retry")}</button></div>}{notice && <p role="status">{t("saved")}</p>}
      {!ready && <p>{t("loading")}</p>}
      {scope === "SYNTHETIC_DEMO" && <section className="field-card"><p>{t("demoHelp")}</p><button disabled={busy || !ready} type="button" onClick={() => void action(() => loadFieldDemo())}>{t("loadDemo")}</button><ol>{(["scenario1", "scenario2", "scenario3", "scenario4"] as const).map(key => <li key={key}>{t(key)}</li>)}</ol></section>}
      {ready && tab !== "sources" && sources.length > 0 && <Select label={t("select")} value={source?.id ?? ""} onChange={e => { setSelected(e.target.value); setInvestigationId(""); }}>{sources.map(s => <option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}</Select>}
    </div>
    {ready && tab === "sources" && <section><h2>{t("sources")}</h2>{editing ? <SourceForm key={typeof editing === "string" ? scope : editing.id} source={typeof editing === "string" ? undefined : editing} scope={scope} t={t} onCancel={() => setEditing(undefined)} onSave={async (s, expected) => { await saveFieldSource(s, expected); await reload(); setSelected(s.id); setEditing(undefined); setNotice(true); }} /> : <>{!sources.length && <p>{t("empty")}</p>}{sources.map(s => <article className="field-card" key={s.id}><h3>{s.code} · {s.name}</h3><SourceDetails source={s} t={t} /><div className="field-actions"><button type="button" onClick={() => setEditing(s)}>{t("edit")}</button><button type="button" onClick={() => { setSelected(s.id); navigate("measure"); }}>{t("measure")}</button><button type="button" onClick={() => { setSelected(s.id); navigate("history"); }}>{t("history")}</button></div></article>)}</>}</section>}
    {ready && !source && tab !== "sources" && <p>{t("empty")}</p>}
    {ready && source && tab === "measure" && <MeasurementForm key={`${source.id}-${investigation?.id ?? "new"}`} sourceId={source.id} scope={scope} investigation={investigation} previous={[...measurements].sort((a,b) => b.measuredAt.localeCompare(a.measuredAt))[0]} t={t} onSave={async (input, rule) => { await saveFieldMeasurement(input, rule); await reload(); setNotice(true); setTab(investigation ? "investigations" : "history"); }} />}
    {ready && source && tab === "history" && <section><h2>{t("history")}</h2><Trend measurements={measurements} t={t} />{[...measurements].sort((a,b) => b.measuredAt.localeCompare(a.measuredAt)).map(m => <div key={m.id}><MeasurementDetails record={m} t={t} /><button disabled={busy} type="button" onClick={() => void action(async () => { const i = await openFieldInvestigation(m.id); setInvestigationId(i.id); setTab("investigations"); })}>{t("openInvestigation")}</button></div>)}</section>}
    {ready && source && tab === "investigations" && <section><h2>{t("investigations")}</h2>{!data.investigations.some(i => i.sourceId === source.id && i.scope === scope) && <p>{t("noInvestigations")}</p>}{data.investigations.filter(i => i.sourceId === source.id && i.scope === scope).map(i => <article className="field-card" key={i.id}><h3>{t(i.state)}</h3><p>{t("cause")}: {t(i.cause === "review" ? "reviewCause" : i.cause)}</p><EvidenceLog investigation={i} t={t} />{i.state === "RETEST_REQUESTED" && <button type="button" onClick={() => { setInvestigationId(i.id); setTab("measure"); }}>{t("retest")}</button>}<InvestigationForm key={i.events.at(-1)!.id} investigation={i} measurements={measurements} t={t} onSave={async event => { await appendInvestigationEvent(i.id, i.events.at(-1)!.id, event); await reload(); setNotice(true); }} /></article>)}</section>}
    {ready && source && tab === "reports" && <><div className="field-actions no-print"><button type="button" onClick={download}>{t("csv")}</button><button type="button" onClick={() => window.print()}>{t("print")}</button></div><FieldReport data={data} sourceId={source.id} scope={scope} t={t} /></>}
    <footer className="no-print"><p>{t("privacy")}</p></footer></main>
  </div>;
}
