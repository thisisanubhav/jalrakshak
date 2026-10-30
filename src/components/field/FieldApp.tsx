"use client";
import { GettingStarted } from './WorkflowGuidance';
import { UiText } from '@/components/UiLanguage';

import { useUiLanguage } from "../UiLanguage";
import { VisitSchedule, ScheduleEditor } from "./VisitSchedule";
import { SourceImport } from './SourceImport';
import { ReportAiDraft } from './ReportAiDraft';
import { MonthlyReport } from './MonthlyReport';
import { BackupHealth } from './BackupHealth';
import { nextScheduledVisit } from '@/field/operations';
import { VisitReviewQueue } from "./VisitReviewQueue";
import { SourceQr, SourceScanner } from "./SourceQr";
import { FieldTasks } from "./FieldTasks";
import { SourceFilters } from "./SourceFilters";
import { SupervisorOverview } from "./SupervisorOverview";
import { fieldTasks, filterSources, emptySourceFilters, type FieldTask } from "@/field/tasks";
import type { TeamUser } from "@/team/shared";
import { FieldNavigation, type FieldDestination } from "./FieldNavigation";
import { MapPin, Activity, History, ClipboardCheck, FileText, HardDrive } from "lucide-react";
import { workspaceKey } from "@/field/workspace";
import { useCallback, useEffect, useState } from "react";
import { JalRakshakApp } from "@/components/JalRakshakApp";
import { FieldError, type FieldData, type FieldSource, type Scope } from "@/field/model";
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
import { fieldOverview, matchesInvestigation, sourceMapSummary, type InvestigationFilter } from "@/field/overview";
const tabs = ["sources", "measure", "history", "investigations", "reports", "dataTools"] as const;
const tabIcons = { sources: MapPin, measure: Activity, history: History, investigations: ClipboardCheck, reports: FileText, dataTools: HardDrive };
type Tab = typeof tabs[number] | "training";
const empty: FieldData = { sources: [], measurements: [], investigations: [] };
export function FieldApp({ team = false, teamUser, onManageTeam, syncConfirmed = false, dataRevision = 0 }: { dataRevision?: number; syncConfirmed?: boolean; team?: boolean; teamUser?: TeamUser; onManageTeam?: () => void }) {
  const [monthly,setMonthly]=useState(false);
  const [choosingSource,setChoosingSource]=useState(false);
  const [lastSavedVisit,setLastSavedVisit]=useState('');
  function chooseSource() { setChoosingSource(true); requestAnimationFrame(()=>document.querySelector<HTMLSelectElement>('.field-source-picker select')?.focus()); }

  const {locale,setLocale}=useUiLanguage(); const [scope, setScope] = useState<Scope>("MANUAL_FIELD"); const [tab, setTab] = useState<Tab>("sources"); const [data, setData] = useState<FieldData>(empty); const [selected, setSelected] = useState(""); const [editing, setEditing] = useState<FieldSource | "new">(); const [investigationId, setInvestigationId] = useState(""); const [error, setError] = useState<Label>(); const [notice, setNotice] = useState(false); const [online, setOnline] = useState(true); const [ready, setReady] = useState(false); const [legacy, setLegacy] = useState(false); const [booted, setBooted] = useState(false); const [busy, setBusy] = useState(false);
  const [correctsMeasurementId,setCorrectsMeasurementId]=useState<string>();
  const [scheduleId,setScheduleId]=useState<string>();
  const [sourceView, setSourceView] = useState<"list" | "map">("list");
  const [sourceFilters, setSourceFilters] = useState({...emptySourceFilters});
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
        setLastSavedVisit(sessionStorage.getItem(workspaceKey('last-saved-visit')) ?? '');
        const saved = JSON.parse(localStorage.getItem(workspaceKey("field-preferences")) ?? "{}");

        // Training survives refresh in this tab, but a new tab opens real records.
        const trainingSession = sessionStorage.getItem(workspaceKey("field-training-session")) === "1";
        if (trainingSession && saved.scope === "SYNTHETIC_DEMO") setScope("SYNTHETIC_DEMO");
        if ((tabs.includes(saved.tab) || (trainingSession && saved.tab === "training")) && (trainingSession || saved.scope !== "SYNTHETIC_DEMO")) setTab(saved.tab);
        if (saved.sourceView === "map") setSourceView("map");
        if (typeof saved.selected === "string") setSelected(saved.selected);
        if (typeof saved.scheduleId === 'string') setScheduleId(saved.scheduleId);
        if (typeof saved.correctsMeasurementId === 'string') setCorrectsMeasurementId(saved.correctsMeasurementId);
        if (typeof saved.investigationId === 'string') setInvestigationId(saved.investigationId);
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
  }, [scope, booted, legacy, dataRevision]);
  useEffect(() => {
    if (!booted || legacy) return;
    document.documentElement.lang = locale;
    try { localStorage.setItem(workspaceKey("field-preferences"), JSON.stringify({ locale, scope, tab, selected, sourceView, scheduleId, correctsMeasurementId, investigationId })); } catch { queueMicrotask(() => setError("storageError")); }
  }, [booted, legacy, locale, scope, tab, selected, sourceView, scheduleId, correctsMeasurementId, investigationId]);
  const overview = fieldOverview(data, scope);
  const sources = overview.sources;
  const visibleSources = filterSources(data, scope, sourceFilters).filter(s => !eligibleOnly || overview.eligibleSourceIds.has(s.id));
  const source = sources.find(s => s.id === selected) ?? sources[0];
  const savedVisit = data.measurements.find(m=>m.id===lastSavedVisit && m.scope===scope);
  const measurements = data.measurements.filter(m => m.sourceId === source?.id && m.scope === scope);
  const visibleInvestigations = overview.investigations.filter(i => (allInvestigationSources || i.sourceId === source?.id) && matchesInvestigation(i, investigationFilter));
  const investigation = data.investigations.find(i => i.id === investigationId && i.scope === scope);
  async function action(fn: () => Promise<unknown>) { setBusy(true); setError(undefined); try { await fn(); await reload(); setNotice(true); } catch (err) { showError(err); } finally { setBusy(false); } }
  function navigate(next: Tab) { setChoosingSource(false); setCorrectsMeasurementId(undefined); setScheduleId(undefined); if (next === "training") { try { sessionStorage.setItem(workspaceKey("field-training-session"), "1"); } catch { /* Optional training preference. */ } } setTab(next); setEditing(undefined); setInvestigationId(""); setNotice(false); }
  const destination: FieldDestination = tab === "sources" ? sourceView === "map" ? "map" : "home" : tab === "measure" || tab === "history" ? "tests" : "dashboard";
  const sectionTabs = destination === "tests" ? ["measure", "history"] as const : destination === "dashboard" ? ["investigations", "reports", "dataTools"] as const : [];
  function navigatePrimary(next: FieldDestination) {
    if (next === "home" || next === "map") { setSourceView(next === "map" ? "map" : "list"); navigate("sources"); }
    else if (next === "tests") navigate(destination === "tests" && tab === "history" ? "history" : "measure");
    else navigate(destination === "dashboard" && (tab === "reports" || tab === "dataTools") ? tab : "investigations");
    requestAnimationFrame(() => document.getElementById(next === "map" ? "field-map-workspace" : "field-main")?.scrollIntoView({ block: "start" }));
  }
  function switchScope(next: Scope) { setSourceFilters({...emptySourceFilters}); setScope(next); setReady(false); setData(empty); setSelected(""); setEligibleOnly(false); setAllInvestigationSources(false); setInvestigationFilter("all"); setConfirmReset(false); navigate("sources"); }
  useEffect(()=>{
    if(sourceView==='map'&&tab==='sources'&&!editing)document.getElementById('field-map-workspace')?.scrollIntoView({block:'start'});
  },[sourceView,tab,editing]);
  function openTask(task: FieldTask) {
    setSelected(task.source.id);
    if (task.kind === 'followup') { navigate('investigations'); setAllInvestigationSources(false); setInvestigationFilter('all'); }
    else { navigate('measure'); setInvestigationId(task.investigationId ?? ''); }
  }
  function recordMapVisit(id: string) {
    const target=sources.find(s=>s.id===id);if(!target)return;
    const summary=sourceMapSummary(data,target);
    setSelected(id);navigate('measure');
    setScheduleId(nextScheduledVisit(target,data.measurements)?.id);
    if(summary.retestRequested)setInvestigationId(summary.investigation!.id);
  }
  function openSource(id: string) { setSelected(id); navigate("history"); }
  function download() {
    if (!source) return;
    try { const blob = new Blob([fieldCsv(data, source.id, scope, locale)], { type: "text/csv;charset=utf-8" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `jalrakshak-${source.id}.csv`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); } catch (err) { showError(err); }
  }
  if (legacy) return <><div className="field-legacy-return"><a href="/personal">{t("back")}</a></div><JalRakshakApp /></>;
  return <div className={`field-shell air-shell ${sourceView === "map" && tab === "sources" ? "field-map-mode" : ""}`}>
    {!team && <aside className="field-card no-print"><UiText text={"Device-only archive / इस डिवाइस के पुराने रिकॉर्ड ·"}/><a href="/"><UiText text={"Open team workspace / टीम कार्यक्षेत्र खोलें"}/></a></aside>}
    <FieldAtmosphere />
    <FieldHeader onHome={() => { navigatePrimary("home"); window.scrollTo({top: 0, behavior: "instant"}); }} locale={locale} online={online} t={t} onLanguage={() => setLocale(locale === "en" ? "hi" : "en")} />
    <main id="field-main" className="field-main air-main relative z-10"><div className="no-print">
      {sectionTabs.length > 0 && <div className="field-section-nav" role="group" aria-label={t("title")}>{sectionTabs.map(item => <button key={item} type="button" aria-pressed={tab === item} onClick={() => navigate(item)}>{(() => { const Icon = tabIcons[item]; return <Icon size={17} aria-hidden="true" />; })()}{t(item)}</button>)}</div>}
      {tab === "sources" && !editing && sourceView === "list" ? <FieldHero t={t} synthetic={scope === "SYNTHETIC_DEMO"} ready={ready} onRegister={() => setEditing("new")} onMap={() => setSourceView("map")} /> : <h1 className={tab === "measure" ? "visit-page-title" : undefined}>{t(tab === "measure" ? "recordVisit" : tab === "dataTools" ? "dataTools" : "title")}</h1>}
      {ready && tab === "sources" && !editing && sourceView === "list" && <section className="field-work-summary" aria-label={t("workSummary")}>
        <div><strong>{sources.length}</strong><span>{t("workSources")}</span></div>
        <button type="button" onClick={() => { navigate("investigations"); setAllInvestigationSources(true); setInvestigationFilter("retests"); }}><strong>{overview.counts.retests}</strong><span>{t("workRetests")}</span></button>
        <button type="button" onClick={() => { navigate("investigations"); setAllInvestigationSources(true); setInvestigationFilter("followup"); }}><strong>{overview.counts.followup}</strong><span>{t("workFollowup")}</span></button>
        <div><strong>{data.measurements.filter(m => m.scope === scope && sources.some(s => s.id === m.sourceId)).length}</strong><span>{t("workRecords")}</span></div>
      </section>}
      {scope === "SYNTHETIC_DEMO" && <p className="field-scope">{t("synthetic")}</p>}

      {scope === "SYNTHETIC_DEMO" && <div className="field-actions field-mode-card"><button type="button" onClick={() => { switchScope("MANUAL_FIELD"); }}>{t("manual")}</button></div>}
      {error && <div role="alert" className="field-error">{t(error)} <button type="button" onClick={() => void action(reload)}>{t("retry")}</button></div>}{notice && !savedVisit && <p className="visit-save-notice" role="status">{t(team && scope === "MANUAL_FIELD" ? syncConfirmed ? "visitSynced" : "visitSavedPending" : "saved")}</p>}
      {savedVisit && <div className="visit-save-notice" id="visit-save-confirmation"><p role="status">{t(team && scope==='MANUAL_FIELD' ? syncConfirmed ? 'visitSynced' : 'visitSavedPending' : 'saved')}</p><button type="button" onClick={()=>{setSelected(savedVisit.sourceId);navigate('history');requestAnimationFrame(()=>document.getElementById(`visit-${savedVisit.id}`)?.focus());}}>{t('viewSavedVisit')}</button></div>}
      {!ready && <p>{t("loading")}</p>}
      {scope === "SYNTHETIC_DEMO" && (tab === "sources" || tab === "training") && <section className="field-card"><p>{t("demoHelp")}</p><button disabled={busy || !ready} type="button" onClick={() => void action(() => loadFieldDemo())}>{t("loadDemo")}</button><button disabled={busy || !ready} type="button" onClick={() => setConfirmReset(true)}>{t("resetFieldDemo")}</button>{confirmReset && <div><p>{t("resetHelp")}</p><button disabled={busy} type="button" onClick={() => void action(async () => { await resetFieldDemo(); setSelected(""); setConfirmReset(false); })}>{t("confirmReset")}</button><button type="button" onClick={() => setConfirmReset(false)}>{t("cancel")}</button></div>}<ol>{(["scenario1", "scenario2", "scenario3", "scenario4"] as const).map(key => <li key={key}>{t(key)}</li>)}</ol></section>}
      {ready && !(tab === "reports" && monthly) && tab !== "sources" && tab !== "training" && tab !== "dataTools" && sources.length > 0 && <div className="field-source-picker">{tab==='measure' && source ? <div className="visit-source-summary"><div><strong>{source.code} · {source.name}</strong><p>{[source.village,source.district,source.state].filter(Boolean).join(' · ')}</p></div><button type="button" aria-expanded={choosingSource} aria-controls="visit-source-select" onClick={()=>choosingSource ? setChoosingSource(false) : chooseSource()}>{t('changeSource')}</button></div> : <p>{t("recordGuidance")}</p>}<div id="visit-source-select" hidden={tab==='measure'&&!choosingSource}><Select label={t("select")} value={tab === "investigations" && allInvestigationSources ? "" : source?.id ?? ""} onChange={e => { setChoosingSource(false); setSelected(e.target.value); setCorrectsMeasurementId(undefined); setScheduleId(undefined); setAllInvestigationSources(!e.target.value); setInvestigationId(""); }}>{tab === "investigations" && <option value="">{t("allSources")}</option>}{sources.map(s => <option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}</Select></div></div>}
    </div>
    {ready && scope === 'MANUAL_FIELD' && teamUser?.role === 'supervisor' && tab === 'sources' && !editing && sourceView === 'list' && <GettingStarted data={data} t={t} onRegister={()=>setEditing('new')} onTeam={onManageTeam} onSchedule={()=>{document.getElementById('field-source-list')?.scrollIntoView({block:'start',behavior:'smooth'});}} />}
    {ready && tab === "sources" && !editing && <SourceScanner sources={sources} t={t} onOpen={openSource} />}
    {ready && tab === "sources" && !editing && sourceView === "list" && (!team||teamUser?.role==='supervisor') && <SourceImport key={scope} sources={sources} scope={scope} t={t} onImported={reload} />}
    {ready && tab === "sources" && !editing && sourceView === "list" && <FieldTasks tasks={fieldTasks(data,scope)} t={t} worker={teamUser?.role === "worker"} onOpen={openTask} />}
    {ready && tab === "sources" && !editing && sourceView === "list" && sources.some(s=>s.schedule) && <VisitSchedule data={data} scope={scope} t={t} onOpen={(id,occurrenceId)=>{setSelected(id);navigate('measure');setScheduleId(occurrenceId);}} />}
    {ready && tab === "sources" && !editing && sources.length > 0 && <SourceFilters value={sourceFilters} onChange={value=>{setSourceFilters(value);setEligibleOnly(false);}} sources={sources} count={visibleSources.length} t={t} />}
    {ready && tab === "sources" && <section id="field-source-list"><h2>{t("sources")}</h2>{!editing && <div className="field-actions"><button type="button" aria-pressed={sourceView === "list"} onClick={() => setSourceView("list")}>{t("listView")}</button><button type="button" aria-pressed={sourceView === "map"} onClick={() => setSourceView("map")}>{t("mapView")}</button>{sourceView === "map" && <button type="button" onClick={()=>setEditing("new")}>{t("add")}</button>}{eligibleOnly && <button type="button" onClick={() => setEligibleOnly(false)}>{t("allSources")}</button>}</div>}{editing ? <SourceForm key={typeof editing === "string" ? scope : editing.id} source={typeof editing === "string" ? undefined : editing} scope={scope} t={t} onCancel={() => setEditing(undefined)} onSave={async (s, expected) => { await saveFieldSource(s, expected); await reload(); setSelected(s.id); setEditing(undefined); setNotice(true); }} /> : <>{!visibleSources.length && <p>{t(sources.length ? "noMatchingSources" : teamUser?.role === "worker" ? "noAssignedSources" : "noSourcesNext")}</p>}{sourceView === "map" ? <FieldMap data={{ ...data, sources: visibleSources }} scope={scope} online={online} t={t} onOpen={openSource} onRecord={recordMapVisit} onEdit={id=>setEditing(sources.find(s=>s.id===id))} /> : visibleSources.map(s => <article className="field-card field-source-card" key={s.id}><h3>{s.code} · {s.name}</h3><SourceDetails source={s} t={t} /><SourceQr source={s} t={t} />{(!team||teamUser?.role==='supervisor')&&<ScheduleEditor key={s.updatedAt} source={s} t={t} onSaved={reload} />}{teamUser?.role==='worker'&&s.schedule&&<p>{t('visitPlan')}: {s.schedule.date} · {s.schedule.note}</p>}<div className="field-actions"><button type="button" onClick={() => setEditing(s)}>{t("edit")}</button><button type="button" onClick={() => { setSelected(s.id); navigate("measure"); }}>{t("measure")}</button><button type="button" onClick={() => { setSelected(s.id); navigate("history"); }}>{t("history")}</button></div></article>)}</>}</section>}
    {ready && !source && tab !== "sources" && tab !== "training" && tab !== "dataTools" && tab !== "investigations" && <p>{t("empty")}</p>}
    {ready && source && tab === "measure" && scheduleId && <p>{t('visitPlan')}: {nextScheduledVisit(source,data.measurements)?.date} · {source.schedule?.note}</p>}
    {ready && source && tab === "measure" && <MeasurementForm onChooseSource={chooseSource} sourceLabel={`${source.code} · ${source.name}`} key={`${source.id}-${investigation?.id ?? correctsMeasurementId ?? "new"}-${scheduleId??""}`} scheduleId={scheduleId} correctsMeasurementId={correctsMeasurementId} sourceId={source.id} scope={scope} investigation={investigation} original={measurements.find(m=>m.id===investigation?.measurementId)} previous={[...measurements].sort((a,b) => b.measuredAt.localeCompare(a.measuredAt))[0]} t={t} onSave={async (input, rule) => { await saveFieldMeasurement(input, rule); setLastSavedVisit(input.id); try { sessionStorage.setItem(workspaceKey('last-saved-visit'),input.id); } catch { /* Confirmation still works in this mounted workspace. */ } await reload(); setNotice(true); setTab(investigation ? "investigations" : "history"); requestAnimationFrame(()=>document.getElementById('visit-save-confirmation')?.scrollIntoView({block:'center'})); }} />}
    {ready && source && tab === "history" && <section><h2>{t("history")}</h2><p className="field-small">{t("limitation")}</p>{scope==='MANUAL_FIELD'&&teamUser?.role==='supervisor'&&<ReportAiDraft key={JSON.stringify([source.id,source.updatedAt,measurements.map(m=>m.id),data.investigations,locale])} kind="history" filters={{sourceId:source.id}} t={t} onOpen={openSource} />}<Trend measurements={measurements} t={t} /><h3>{t("timeline")}</h3>{[
      ...measurements.map(m => ({ id: m.id, at: m.measuredAt, record: m, event: undefined })),
      ...overview.investigations.filter(i => i.sourceId === source.id).flatMap(i => i.events.map(event => ({ id: `${i.id}-${event.id}`, at: event.at, record: undefined, event: { investigation: i, evidence: event } }))),
    ].sort((a,b) => b.at.localeCompare(a.at) || a.id.localeCompare(b.id)).map(entry => entry.event ? <article className="field-card" key={entry.id}><EvidenceLog investigation={{ ...entry.event.investigation, events: [entry.event.evidence] }} t={t} /></article> : entry.record && (() => { const m = entry.record; return <div key={m.id}><MeasurementDetails record={m} t={t} /><button disabled={busy} type="button" onClick={() => void action(async () => { const i = await openFieldInvestigation(m.id); setInvestigationId(i.id); setTab("investigations"); })}>{t("openInvestigation")}</button></div>; })())}</section>}
    {tab === "investigations" && scope === "MANUAL_FIELD" && teamUser?.role === "supervisor" && <SupervisorOverview t={t} onManage={onManageTeam} />}
    {ready && tab === "investigations" && scope==='MANUAL_FIELD' && <VisitReviewQueue data={data} scope={scope} user={teamUser} t={t} onSaved={reload} onOpen={openSource} onCorrect={visit=>{setSelected(visit.sourceId);navigate('measure');setCorrectsMeasurementId(visit.id);}} />}
    {ready && tab === "investigations" && <section><h2>{t("investigations")}</h2>
      <FieldOverview data={data} scope={scope} t={t} filter={investigationFilter} onFilter={filter => { setInvestigationFilter(filter); setAllInvestigationSources(true); }} onSources={eligible => { setEligibleOnly(eligible); navigate("sources"); }} />
      {!visibleInvestigations.length && <p>{t("noInvestigations")}</p>}
      {visibleInvestigations.map(i => <article className="field-card" key={i.id}><p>{sources.find(s => s.id === i.sourceId)?.code}</p><h3>{t(i.state)}</h3><p>{t("cause")}: {t(i.cause === "review" ? "reviewCause" : i.cause)}</p><EvidenceLog investigation={i} t={t} />{i.state === "RETEST_REQUESTED" && <button type="button" onClick={() => { setSelected(i.sourceId); setInvestigationId(i.id); setTab("measure"); }}>{t("retest")}</button>}<InvestigationForm key={i.events.at(-1)!.id} investigation={i} measurements={data.measurements.filter(m => m.scope === scope && m.sourceId === i.sourceId)} t={t} onSave={async event => { await appendInvestigationEvent(i.id, i.events.at(-1)!.id, event); await reload(); setNotice(true); }} /></article>)}
    </section>}
    {tab === "dataTools" && <FieldDataTools t={t} onRestored={reload} onTraining={() => navigate("training")} />}
    {ready && tab === "training" && <FieldTraining locale={locale} online={online} t={t} onJudgeDemo={() => { if (scope === "SYNTHETIC_DEMO") navigate("sources"); else switchScope("SYNTHETIC_DEMO"); }} />}
    {tab==='dataTools'&&teamUser?.role==='supervisor'&&<BackupHealth />}
    {ready&&tab==='reports'&&<div className="field-actions no-print"><button type="button" aria-pressed={monthly} onClick={()=>setMonthly(true)}><UiText text={"Monthly reports / मासिक रिपोर्ट"}/></button><button type="button" aria-pressed={!monthly} onClick={()=>setMonthly(false)}><UiText text={"Source report / स्रोत रिपोर्ट"}/></button></div>}
    {ready&&tab==='reports'&&monthly&&<MonthlyReport key={scope} data={data} scope={scope} t={t} supervisor={teamUser?.role==='supervisor'} onOpen={openSource} />}
    {ready && source && tab === "reports" && !monthly && <><div className="field-actions no-print"><button type="button" onClick={download}>{t("csv")}</button><button type="button" onClick={() => window.print()}>{t("print")}</button></div><FieldReport data={data} sourceId={source.id} scope={scope} t={t} /></>}
    <footer className="no-print"><p>{t("privacy")}</p></footer></main>
    <FieldNavigation current={destination} t={t} onNavigate={navigatePrimary} />
  </div>;
}
