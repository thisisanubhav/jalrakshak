"use client";
import { MapPin, Activity, History, ClipboardCheck, FileText, HardDrive } from "lucide-react";
import { workspaceKey } from "@/field/workspace";
import { useCallback, useEffect, useState } from "react";
import { JalRakshakApp } from "@/components/JalRakshakApp";
import { FieldError, type FieldData, type FieldSource, type Locale, type Scope } from "@/field/model";
import { translate, type Label, type Translate } from "@/field/i18n";
import { appendInvestigationEvent, openFieldInvestigation, readField, saveFieldMeasurement, saveFieldSource } from "@/field/store";
import { loadFieldDemo, resetFieldDemo } from "@/field/demo";
import { fieldCsv } from "@/field/report";
import { FieldAtmosphere, FieldHeader, FieldHero } from "./FieldChrome";
import { InvestigationForm, MeasurementForm, SourceForm } from "./FieldForms";
import { EvidenceLog, FieldReport, MeasurementDetails, Select, SourceDetails, Trend } from "./FieldViews";
import { FieldMap } from "./FieldMap";
import { FieldOverview } from "./FieldOverview";
import { FieldDataTools } from "./FieldDataTools";
import { FieldTraining } from "./FieldTraining";
import { fieldOverview, matchesInvestigation, type InvestigationFilter } from "@/field/overview";
const tabs = ["sources", "measure", "history", "investigations", "reports", "dataTools"] as const;
const tabIcons = { sources: MapPin, measure: Activity, history: History, investigations: ClipboardCheck, reports: FileText, dataTools: HardDrive };
type Tab = typeof tabs[number] | "training";
const empty: FieldData = { sources: [], measurements: [], investigations: [] };
export function FieldApp({ team = false }: { team?: boolean }) {
  const [locale, setLocale] = useState<Locale>("en"); const [scope, setScope] = useState<Scope>("MANUAL_FIELD"); const [tab, setTab] = useState<Tab>("sources"); const [data, setData] = useState<FieldData>(empty); const [selected, setSelected] = useState(""); const [editing, setEditing] = useState<FieldSource | "new">(); const [investigationId, setInvestigationId] = useState(""); const [error, setError] = useState<Label>(); const [notice, setNotice] = useState(false); const [online, setOnline] = useState(true); const [ready, setReady] = useState(false); const [legacy, setLegacy] = useState(false); const [booted, setBooted] = useState(false); const [busy, setBusy] = useState(false);
  const [sourceView, setSourceView] = useState<"list" | "map">("list");
  const [eligibleOnly, setEligibleOnly] = useState(false);
  const [investigationFilter, setInvestigationFilter] = useState<InvestigationFilter>("all");
  const [allInvestigationSources, setAllInvestigationSources] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const labels = translate(locale);
  const t: Translate = key => labels(team && key === "privacy" ? "teamPrivacy" : team && key === "local" ? "teamLocal" : key);
  const reload = useCallback(async () => { const result = await readField(scope); setData(result); setReady(true); return result; }, [scope]);
  const showError = (err: unknown) => setError(err instanceof FieldError ? err.code : "storageError");
  useEffect(() => {
    queueMicrotask(() => {
      setLegacy(!team && new URLSearchParams(location.search).get("legacy") === "1");
      try {
        const saved = JSON.parse(localStorage.getItem(workspaceKey("field-preferences")) ?? "{}");
        if (saved.locale === "hi") setLocale("hi");
        // Training survives refresh in this tab, but a new tab opens real records.
        const trainingSession = sessionStorage.getItem(workspaceKey("field-training-session")) === "1";
        if (trainingSession && saved.scope === "SYNTHETIC_DEMO") setScope("SYNTHETIC_DEMO");
        if ((tabs.includes(saved.tab) || (trainingSession && saved.tab === "training")) && (trainingSession || saved.scope !== "SYNTHETIC_DEMO")) setTab(saved.tab);
        if (typeof saved.selected === "string") setSelected(saved.selected);
      } catch { setError("storageError"); }
      setOnline(navigator.onLine); setBooted(true);
    });
    const connectivity = () => setOnline(navigator.onLine);
    addEventListener("online", connectivity); addEventListener("offline", connectivity);
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) navigator.serviceWorker.register("/sw-v2.js").catch(() => setError("storageError"));
    return () => { removeEventListener("online", connectivity); removeEventListener("offline", connectivity); };
  }, [team]);
  useEffect(() => {
    if (!booted || legacy) return;
    let active = true;
    readField(scope).then(result => { if (active) { setData(result); setReady(true); } }).catch(err => { if (active) { showError(err); setReady(false); } });
    return () => { active = false; };
  }, [scope, booted, legacy]);
  useEffect(() => {
    if (!booted || legacy) return;
    document.documentElement.lang = locale;
    try { localStorage.setItem(workspaceKey("field-preferences"), JSON.stringify({ locale, scope, tab, selected })); } catch { queueMicrotask(() => setError("storageError")); }
  }, [booted, legacy, locale, scope, tab, selected]);
  const overview = fieldOverview(data, scope);
  const sources = overview.sources;
  const visibleSources = sources.filter(s => !eligibleOnly || overview.eligibleSourceIds.has(s.id));
  const source = sources.find(s => s.id === selected) ?? sources[0];
  const measurements = data.measurements.filter(m => m.sourceId === source?.id && m.scope === scope);
  const visibleInvestigations = overview.investigations.filter(i => (allInvestigationSources || i.sourceId === source?.id) && matchesInvestigation(i, investigationFilter));
  const investigation = data.investigations.find(i => i.id === investigationId && i.scope === scope);
  async function action(fn: () => Promise<unknown>) { setBusy(true); setError(undefined); try { await fn(); await reload(); setNotice(true); } catch (err) { showError(err); } finally { setBusy(false); } }
  function navigate(next: Tab) { if (next === "training") { try { sessionStorage.setItem(workspaceKey("field-training-session"), "1"); } catch { /* Optional training preference. */ } } setTab(next); setEditing(undefined); setInvestigationId(""); setNotice(false); }
  function switchScope(next: Scope) { setScope(next); setReady(false); setData(empty); setSelected(""); setEligibleOnly(false); setAllInvestigationSources(false); setInvestigationFilter("all"); setConfirmReset(false); navigate("sources"); }
  function openSource(id: string) { setSelected(id); navigate("history"); }
  function download() {
    if (!source) return;
    try { const blob = new Blob([fieldCsv(data, source.id, scope, locale)], { type: "text/csv;charset=utf-8" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `jalrakshak-${source.id}.csv`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); } catch (err) { showError(err); }
  }
  if (legacy) return <><div className="field-legacy-return"><a href="/personal">{t("back")}</a></div><JalRakshakApp /></>;
  return <div className="field-shell air-shell">
    {!team && <aside className="field-card no-print">Device-only archive / इस डिवाइस के पुराने रिकॉर्ड · <a href="/">Open team workspace / टीम कार्यक्षेत्र खोलें</a></aside>}
    <FieldAtmosphere />
    <FieldHeader locale={locale} online={online} t={t} onLanguage={() => setLocale(locale === "en" ? "hi" : "en")} />
    <main className="field-main air-main relative z-10"><div className="no-print">
      {tab === "sources" && !editing && sourceView === "list" ? <FieldHero t={t} synthetic={scope === "SYNTHETIC_DEMO"} ready={ready} onRegister={() => setEditing("new")} onMap={() => setSourceView("map")} /> : <h1>{t("title")}</h1>}
      <div className="field-context"><p>{t(online ? "online" : "offline")} · {t(team ? "teamLocal" : "local")}</p><p className="field-scope">{t(scope === "SYNTHETIC_DEMO" ? "synthetic" : "manual")}</p><p>{t("limitation")}</p></div>
      <nav aria-label={t("title")}>{tabs.map(item => <button key={item} type="button" aria-current={tab === item ? "page" : undefined} onClick={() => navigate(item)}>{(() => { const Icon = tabIcons[item]; return <Icon size={17} aria-hidden="true" />; })()}{t(item)}</button>)}</nav>
      {scope === "SYNTHETIC_DEMO" && <div className="field-actions field-mode-card"><button type="button" onClick={() => { switchScope("MANUAL_FIELD"); }}>{t("manual")}</button></div>}
      {error && <div role="alert" className="field-error">{t(error)} <button type="button" onClick={() => void action(reload)}>{t("retry")}</button></div>}{notice && <p role="status">{t("saved")}</p>}
      {!ready && <p>{t("loading")}</p>}
      {scope === "SYNTHETIC_DEMO" && (tab === "sources" || tab === "training") && <section className="field-card"><p>{t("demoHelp")}</p><button disabled={busy || !ready} type="button" onClick={() => void action(() => loadFieldDemo())}>{t("loadDemo")}</button><button disabled={busy || !ready} type="button" onClick={() => setConfirmReset(true)}>{t("resetFieldDemo")}</button>{confirmReset && <div><p>{t("resetHelp")}</p><button disabled={busy} type="button" onClick={() => void action(async () => { await resetFieldDemo(); setSelected(""); setConfirmReset(false); })}>{t("confirmReset")}</button><button type="button" onClick={() => setConfirmReset(false)}>{t("cancel")}</button></div>}<ol>{(["scenario1", "scenario2", "scenario3", "scenario4"] as const).map(key => <li key={key}>{t(key)}</li>)}</ol></section>}
      {ready && tab !== "sources" && tab !== "training" && tab !== "dataTools" && sources.length > 0 && <Select label={t("select")} value={tab === "investigations" && allInvestigationSources ? "" : source?.id ?? ""} onChange={e => { setSelected(e.target.value); setAllInvestigationSources(!e.target.value); setInvestigationId(""); }}>{tab === "investigations" && <option value="">{t("allSources")}</option>}{sources.map(s => <option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}</Select>}
    </div>
    {ready && tab === "sources" && <section><h2>{t("sources")}</h2>{!editing && <div className="field-actions"><button type="button" aria-pressed={sourceView === "list"} onClick={() => setSourceView("list")}>{t("listView")}</button><button type="button" aria-pressed={sourceView === "map"} onClick={() => setSourceView("map")}>{t("mapView")}</button>{eligibleOnly && <button type="button" onClick={() => setEligibleOnly(false)}>{t("allSources")}</button>}</div>}{editing ? <SourceForm key={typeof editing === "string" ? scope : editing.id} source={typeof editing === "string" ? undefined : editing} scope={scope} t={t} onCancel={() => setEditing(undefined)} onSave={async (s, expected) => { await saveFieldSource(s, expected); await reload(); setSelected(s.id); setEditing(undefined); setNotice(true); }} /> : <>{!visibleSources.length && <p>{t("empty")}</p>}{sourceView === "map" ? <FieldMap data={{ ...data, sources: visibleSources }} scope={scope} online={online} t={t} onOpen={openSource} onEdit={id=>setEditing(sources.find(s=>s.id===id))} /> : visibleSources.map(s => <article className="field-card" key={s.id}><h3>{s.code} · {s.name}</h3><SourceDetails source={s} t={t} /><div className="field-actions"><button type="button" onClick={() => setEditing(s)}>{t("edit")}</button><button type="button" onClick={() => { setSelected(s.id); navigate("measure"); }}>{t("measure")}</button><button type="button" onClick={() => { setSelected(s.id); navigate("history"); }}>{t("history")}</button></div></article>)}</>}</section>}
    {ready && !source && tab !== "sources" && tab !== "training" && tab !== "dataTools" && tab !== "investigations" && <p>{t("empty")}</p>}
    {ready && source && tab === "measure" && <MeasurementForm key={`${source.id}-${investigation?.id ?? "new"}`} sourceId={source.id} scope={scope} investigation={investigation} previous={[...measurements].sort((a,b) => b.measuredAt.localeCompare(a.measuredAt))[0]} t={t} onSave={async (input, rule) => { await saveFieldMeasurement(input, rule); await reload(); setNotice(true); setTab(investigation ? "investigations" : "history"); }} />}
    {ready && source && tab === "history" && <section><h2>{t("history")}</h2><Trend measurements={measurements} t={t} /><h3>{t("timeline")}</h3>{[
      ...measurements.map(m => ({ id: m.id, at: m.measuredAt, record: m, event: undefined })),
      ...overview.investigations.filter(i => i.sourceId === source.id).flatMap(i => i.events.map(event => ({ id: `${i.id}-${event.id}`, at: event.at, record: undefined, event: { investigation: i, evidence: event } }))),
    ].sort((a,b) => b.at.localeCompare(a.at) || a.id.localeCompare(b.id)).map(entry => entry.event ? <article className="field-card" key={entry.id}><EvidenceLog investigation={{ ...entry.event.investigation, events: [entry.event.evidence] }} t={t} /></article> : entry.record && (() => { const m = entry.record; return <div key={m.id}><MeasurementDetails record={m} t={t} /><button disabled={busy} type="button" onClick={() => void action(async () => { const i = await openFieldInvestigation(m.id); setInvestigationId(i.id); setTab("investigations"); })}>{t("openInvestigation")}</button></div>; })())}</section>}
    {ready && tab === "investigations" && <section><h2>{t("investigations")}</h2>
      <FieldOverview data={data} scope={scope} t={t} filter={investigationFilter} onFilter={filter => { setInvestigationFilter(filter); setAllInvestigationSources(true); }} onSources={eligible => { setEligibleOnly(eligible); navigate("sources"); }} />
      {!visibleInvestigations.length && <p>{t("noInvestigations")}</p>}
      {visibleInvestigations.map(i => <article className="field-card" key={i.id}><p>{sources.find(s => s.id === i.sourceId)?.code}</p><h3>{t(i.state)}</h3><p>{t("cause")}: {t(i.cause === "review" ? "reviewCause" : i.cause)}</p><EvidenceLog investigation={i} t={t} />{i.state === "RETEST_REQUESTED" && <button type="button" onClick={() => { setSelected(i.sourceId); setInvestigationId(i.id); setTab("measure"); }}>{t("retest")}</button>}<InvestigationForm key={i.events.at(-1)!.id} investigation={i} measurements={data.measurements.filter(m => m.scope === scope && m.sourceId === i.sourceId)} t={t} onSave={async event => { await appendInvestigationEvent(i.id, i.events.at(-1)!.id, event); await reload(); setNotice(true); }} /></article>)}
    </section>}
    {tab === "dataTools" && <FieldDataTools t={t} onRestored={reload} onTraining={() => navigate("training")} />}
    {ready && tab === "training" && <FieldTraining locale={locale} online={online} t={t} onJudgeDemo={() => { if (scope === "SYNTHETIC_DEMO") navigate("sources"); else switchScope("SYNTHETIC_DEMO"); }} />}
    {ready && source && tab === "reports" && <><div className="field-actions no-print"><button type="button" onClick={download}>{t("csv")}</button><button type="button" onClick={() => window.print()}>{t("print")}</button></div><FieldReport data={data} sourceId={source.id} scope={scope} t={t} /></>}
    <footer className="no-print"><p>{t("privacy")}</p></footer></main>
  </div>;
}
