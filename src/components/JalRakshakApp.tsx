"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  ChevronRight,
  CircleAlert,
  Cloud,
  CloudOff,
  Droplets,
  FlaskConical,
  Gauge,
  Home,
  Languages,
  ListChecks,
  LocateFixed,
  Map as MapIcon,
  RefreshCcw,
  RotateCcw,
  Save,
  ShieldAlert,
  Thermometer,
  Waves,
} from "lucide-react";
import {
  createReferralOnce,
  db,
  readAll,
  resetDemoData,
  saveTestOnce,
} from "@/data/database";
import { DemoSyncTransport, syncPending } from "@/data/sync";
import {
  assertValidReadings,
  evaluateScreening,
  formatReading,
} from "@/domain/screening";
import { generateSourceCode } from "@/domain/source-code";
import type {
  AppData,
  DataOrigin,
  LabReferral,
  ScreeningResult,
  ScreeningStatus,
  SensorReadings,
  SourceType,
  WaterSource,
  WaterTest,
} from "@/domain/types";
import {
  translations,
  type Locale,
  type TranslationKey,
} from "@/i18n/translations";
import {
  SimulatedSensorProvider,
  type SensorProgress,
  type SimulationScenario,
} from "@/sensors/provider";
import { MapPanel } from "./MapPanel";
import { ExperimentalECMode } from "./ExperimentalECMode";

type View =
  | "home"
  | "register"
  | "screen"
  | "result"
  | "map"
  | "tests"
  | "dashboard"
  | "ec";
type AppDraft = {
  view: View;
  locale: Locale;
  sourceId: string | null;
  test: WaterTest | null;
  scenario: SimulationScenario;
};
const APP_DRAFT_KEY = "jalrakshak-active-flow-v1";
const EMPTY: AppData = { sources: [], tests: [], referrals: [] };
const statusStyle: Record<ScreeningStatus, string> = {
  NORMAL_SCREENING: "bg-emerald-100 text-emerald-800 border-emerald-300",
  RETEST: "bg-amber-100 text-amber-900 border-amber-300",
  LAB_REFERRAL: "bg-red-100 text-red-800 border-red-300",
};
const statusDot: Record<ScreeningStatus, string> = {
  NORMAL_SCREENING: "bg-emerald-600",
  RETEST: "bg-amber-500",
  LAB_REFERRAL: "bg-red-600",
};
const readingMeta = {
  ph: ["phLabel", "", Activity],
  tds: ["tdsLabel", "mg/L", Gauge],
  turbidity: ["turbidityLabel", "NTU", Waves],
  temperature: ["temperatureLabel", "°C", Thermometer],
} as const;

function statusLabel(
  t: (key: TranslationKey) => string,
  status: ScreeningStatus,
) {
  return status === "NORMAL_SCREENING"
    ? t("normalStatus")
    : status === "RETEST"
      ? t("retestStatus")
      : t("referralStatusLabel");
}

function sourceTypeLabel(t: (key: TranslationKey) => string, type: SourceType) {
  const keys: Record<SourceType, TranslationKey> = {
    HANDPUMP: "handpump",
    WELL: "well",
    TAP: "tap",
    BOREWELL: "borewell",
    OTHER: "other",
  };
  return t(keys[type]);
}

function StatusBadge({
  status,
  t,
}: {
  status: ScreeningStatus;
  t: (key: TranslationKey) => string;
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black tracking-wide ${statusStyle[status]}`}
    >
      {statusLabel(t, status)}
    </span>
  );
}

function OriginBadge({
  origin,
  t,
}: {
  origin: DataOrigin;
  t: (key: TranslationKey) => string;
}) {
  const labels: Record<DataOrigin, TranslationKey> = {
    SIMULATED: "simulated",
    SENSOR: "sensor",
    LAB_CONFIRMED: "labConfirmed",
  };
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-violet-300 bg-violet-50 px-3 py-1 text-xs font-black text-violet-800">
      <FlaskConical aria-hidden="true" className="h-3.5 w-3.5" />
      {t(labels[origin])}
    </span>
  );
}

function syncLabel(
  t: (key: TranslationKey) => string,
  status: WaterTest["syncStatus"],
) {
  const labels = {
    LOCAL_ONLY: "syncLocal",
    SYNCING: "syncSyncing",
    SYNCED: "syncComplete",
    SYNC_FAILED: "syncFailed",
  } as const;
  return t(labels[status]);
}

function reasonLabel(t: (key: TranslationKey) => string, code: string) {
  const labels: Record<string, TranslationKey> = {
    PH_REFERRAL_RANGE: "reasonPhReferral",
    TDS_REFERRAL_RANGE: "reasonTdsReferral",
    TURBIDITY_REFERRAL_RANGE: "reasonTurbidityReferral",
    TEMPERATURE_REFERRAL_RANGE: "reasonTemperatureReferral",
    PH_RETEST_RANGE: "reasonPhRetest",
    TDS_RETEST_RANGE: "reasonTdsRetest",
    TURBIDITY_RETEST_RANGE: "reasonTurbidityRetest",
    TEMPERATURE_RETEST_RANGE: "reasonTemperatureRetest",
  };
  return t(labels[code] ?? "reasonOther");
}
function MetricCard({
  label,
  value,
  accent = "text-ink",
  compact = false,
}: {
  label: string;
  value: number;
  accent?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${compact ? "p-3 lg:p-4" : "p-4"}`}
    >
      <p
        className={`${compact ? "text-xs" : "text-sm"} font-semibold text-slate-500`}
      >
        {label}
      </p>
      <p
        className={`${compact ? "mt-0.5 text-2xl" : "mt-1 text-3xl"} font-black ${accent}`}
      >
        {value}
      </p>
    </div>
  );
}
function Disclaimer({ text }: { text: string }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm font-bold leading-5 text-amber-950">
      <CircleAlert aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
      {text}
    </div>
  );
}

export function JalRakshakApp() {
  const [view, setView] = useState<View>("home");
  const [locale, setLocale] = useState<Locale>("en");
  const [data, setData] = useState<AppData>(EMPTY);
  const [online, setOnline] = useState(true);
  const [busy, setBusy] = useState(false);
  const [source, setSource] = useState<WaterSource | null>(null);
  const [test, setTest] = useState<WaterTest | null>(null);
  const [result, setResult] = useState<ScreeningResult | null>(null);
  const [scenario, setScenario] = useState<SimulationScenario>("referral");
  const [progress, setProgress] = useState<SensorProgress | null>(null);
  const [toast, setToast] = useState("");
  const [storageError, setStorageError] = useState(false);
  const [measurementError, setMeasurementError] = useState(false);
  const [filter, setFilter] = useState<"ALL" | ScreeningStatus>("ALL");
  const [draftReady, setDraftReady] = useState(false);
  const saveLock = useRef(false);
  const referralLock = useRef(false);
  const registrationLock = useRef(false);
  const t = useCallback(
    (key: TranslationKey) => translations[locale][key],
    [locale],
  );
  useEffect(() => {
    queueMicrotask(async () => {
      try {
        const raw = localStorage.getItem(APP_DRAFT_KEY);
        if (raw) {
          const draft = JSON.parse(raw) as Partial<AppDraft>;
          const restoredView = draft.view ?? "home";
          const restoredSource = draft.sourceId
            ? await db.sources.get(draft.sourceId)
            : undefined;
          const canRestore =
            !["screen", "result"].includes(restoredView) ||
            (restoredSource && (restoredView !== "result" || draft.test));
          setView(canRestore ? restoredView : "home");
          if (draft.locale === "en" || draft.locale === "hi") setLocale(draft.locale);
          setSource(restoredSource ?? null);
          setTest(draft.test ?? null);
          setResult(draft.test ? evaluateScreening(draft.test) : null);
          if (["normal", "retest", "referral"].includes(draft.scenario ?? "")) {
            setScenario(draft.scenario as SimulationScenario);
          }
        }
      } catch {
        localStorage.removeItem(APP_DRAFT_KEY);
      } finally {
        setDraftReady(true);
      }
    });
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  useEffect(() => {
    if (!draftReady) return;
    const draft: AppDraft = {
      view,
      locale,
      sourceId: source?.id ?? null,
      test,
      scenario,
    };
    try {
      localStorage.setItem(APP_DRAFT_KEY, JSON.stringify(draft));
    } catch {
      setStorageError(true);
    }
  }, [draftReady, locale, scenario, source?.id, test, view]);
  const reload = useCallback(async () => {
    try {
      setData(await readAll());
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, []);
  useEffect(() => {
    queueMicrotask(reload);
    queueMicrotask(() => setOnline(navigator.onLine));
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    addEventListener("online", on);
    addEventListener("offline", off);
    if (process.env.NODE_ENV === "production") {
      navigator.serviceWorker?.register("/sw-v2.js").catch(() => undefined);
    }
    return () => {
      removeEventListener("online", on);
      removeEventListener("offline", off);
    };
  }, [reload]);
  useEffect(() => {
    if (!online) return;
    syncPending(new DemoSyncTransport())
      .then(reload)
      .catch(() => undefined);
  }, [online, reload]);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(id);
  }, [toast]);
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [view]);
  const latestBySource = useMemo(
    () =>
      new Map(
        data.sources.map((s) => [
          s.id,
          data.tests
            .filter((x) => x.sourceId === s.id)
            .sort((a, b) => b.testedAt.localeCompare(a.testedAt))[0],
        ]),
      ),
    [data],
  );
  const pending = [...data.sources, ...data.tests, ...data.referrals].filter(
    (x) => x.syncStatus !== "SYNCED",
  ).length;
  const localOnly = [...data.sources, ...data.tests, ...data.referrals].filter(
    (x) => x.syncStatus === "LOCAL_ONLY",
  ).length;
  const counts = {
    normal: data.tests.filter((x) => x.screeningStatus === "NORMAL_SCREENING")
      .length,
    retest: data.tests.filter((x) => x.screeningStatus === "RETEST").length,
    referral: data.referrals.length,
  };
  useEffect(() => {
    if (!online || !localOnly) return;
    const id = window.setTimeout(() => {
      syncPending(new DemoSyncTransport())
        .then(reload)
        .catch(() => undefined);
    }, 200);
    return () => window.clearTimeout(id);
  }, [localOnly, online, reload]);
  const nav = (next: View) => {
    setView(next);
    scrollTo({ top: 0, behavior: "smooth" });
  };
  async function runSync() {
    if (!online || busy) return;
    setBusy(true);
    try {
      const count = await syncPending(new DemoSyncTransport());
      await reload();
      setToast(count ? t("syncSuccess") : t("synced"));
    } catch {
      setToast(t("syncFailure"));
    } finally {
      setBusy(false);
    }
  }
  async function reset() {
    if (!confirm(t("resetConfirm"))) return;
    try {
      await resetDemoData();
      setSource(null);
      setTest(null);
      setResult(null);
      setProgress(null);
      setMeasurementError(false);
      localStorage.removeItem(APP_DRAFT_KEY);
      await reload();
      nav("home");
      setToast(t("resetComplete"));
    } catch {
      setStorageError(true);
    }
  }
  async function registerSource(
    value: Omit<WaterSource, "id" | "sourceCode" | "createdAt" | "syncStatus">,
  ) {
    if (registrationLock.current) return;
    registrationLock.current = true;
    setBusy(true);
    try {
      let sourceCode = generateSourceCode(value.sourceType);
      while (await db.sources.where("sourceCode").equals(sourceCode).first()) {
        sourceCode = generateSourceCode(value.sourceType);
      }
      const item: WaterSource = {
        ...value,
        id: crypto.randomUUID(),
        sourceCode,
        createdAt: new Date().toISOString(),
        syncStatus: "LOCAL_ONLY",
        recordScope: "SCREENING_DEMO",
      };
      await db.sources.add(item);
      setSource(item);
      setTest(null);
      setResult(null);
      setProgress(null);
      await reload();
      nav("screen");
    } catch {
      setStorageError(true);
    } finally {
      registrationLock.current = false;
      setBusy(false);
    }
  }
  async function measure() {
    if (!source || busy) return;
    setBusy(true);
    setProgress(null);
    setMeasurementError(false);
    try {
      const measurement = await new SimulatedSensorProvider(scenario).measure(
        setProgress,
      );
      assertValidReadings(measurement.readings);
      const evaluation = evaluateScreening(measurement.readings);
      const item: WaterTest = {
        ...measurement.readings,
        id: crypto.randomUUID(),
        sourceId: source.id,
        screeningStatus: evaluation.status,
        reasonCodes: evaluation.reasonCodes,
        explanation: evaluation.explanation,
        dataOrigin: measurement.dataOrigin,
        providerName: measurement.providerName,
        measurementProvenance: measurement.measurementProvenance,
        testedAt: new Date().toISOString(),
        syncStatus: "LOCAL_ONLY",
      };
      setTest(item);
      setResult(evaluation);
      nav("result");
    } catch {
      setMeasurementError(true);
      setProgress(null);
    } finally {
      setBusy(false);
    }
  }
  async function saveTest() {
    if (!test || busy || saveLock.current) return;
    saveLock.current = true;
    setBusy(true);
    try {
      await saveTestOnce(test);
      await reload();
      setToast(t("savedOnDevice"));
    } catch {
      setStorageError(true);
    } finally {
      saveLock.current = false;
      setBusy(false);
    }
  }
  async function createReferralFor(testId: string, sourceId: string) {
    if (busy || referralLock.current) return;
    const referralTest = data.tests.find((item) => item.id === testId) ?? test;
    const referralSource =
      data.sources.find((item) => item.id === sourceId) ?? source;
    if (!referralTest || !referralSource) return;
    referralLock.current = true;
    setBusy(true);
    try {
      const referral: LabReferral = {
        id: `JRL-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
        testId: referralTest.id,
        sourceId: referralSource.id,
        referralStatus: "CREATED",
        notes:
          "Awaiting sample collection and accredited laboratory confirmation.",
        createdAt: new Date().toISOString(),
        syncStatus: "LOCAL_ONLY",
      };
      await createReferralOnce(referral);
      await reload();
      setToast(t("referralCreated"));
    } catch {
      setStorageError(true);
    } finally {
      referralLock.current = false;
      setBusy(false);
    }
  }
  function openHistory(id: string) {
    const s = data.sources.find((x) => x.id === id);
    if (s) setSource(s);
    nav("tests");
  }
  function openMainView(next: View) {
    if (next === "tests") setSource(null);
    nav(next);
  }
  function startNewTest() {
    setScenario("referral");
    setSource(null);
    setTest(null);
    setResult(null);
    setProgress(null);
    setMeasurementError(false);
    nav("register");
  }
  return (
    <div className="air-shell min-h-screen pb-24 lg:pb-0">
      <div className="air-atmosphere" aria-hidden="true">
        <span className="air-cloud air-cloud-one" />
        <span className="air-cloud air-cloud-two" />
        <span className="air-cloud air-cloud-three" />
        <span className="air-haze" />
      </div>
      <Header
        locale={locale}
        setLocale={setLocale}
        online={online}
        pending={pending}
        t={t}
        onSync={runSync}
        busy={busy}
        experimental={view === "ec"}
      />
      <main className="air-main relative z-10 mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-9">
        {storageError && (
          <div
            role="alert"
            className="mb-5 flex gap-3 rounded-2xl border border-red-300 bg-red-50 p-4 font-bold text-red-900"
          >
            <ShieldAlert aria-hidden="true" className="h-5 w-5 shrink-0" />
            {t("storageError")}
          </div>
        )}
        {view === "home" && (
          <HomeView
            t={t}
            data={data}
            counts={counts}
            pending={pending}
            online={online}
            onStart={startNewTest}
            onStartEC={() => nav("ec")}
            onReset={reset}
          />
        )}
        {view === "register" && (
          <Registration
            t={t}
            busy={busy}
            onBack={() => nav("home")}
            onSubmit={registerSource}
          />
        )}
        {view === "screen" && source && (
          <ScreenView
            t={t}
            source={source}
            scenario={scenario}
            setScenario={setScenario}
            progress={progress}
            busy={busy}
            error={measurementError}
            onBack={() => nav("register")}
            onMeasure={measure}
          />
        )}
        {view === "result" && source && test && result && (
          <ResultView
            t={t}
            source={source}
            test={test}
            result={result}
            saved={data.tests.some((x) => x.id === test.id)}
            referred={data.referrals.some((x) => x.testId === test.id)}
            busy={busy}
            onSave={saveTest}
            onRefer={() => createReferralFor(test.id, source.id)}
            onRetest={() => nav("screen")}
            onMap={() => nav("map")}
          />
        )}
        {view === "map" && (
          <MapView t={t} data={data} online={online} onHistory={openHistory} />
        )}
        {view === "tests" && (
          <TestsView
            t={t}
            data={data}
            focusSource={source?.id}
            busy={busy}
            onRefer={createReferralFor}
          />
        )}
        {view === "dashboard" && (
          <DashboardView
            t={t}
            data={data}
            latestBySource={latestBySource}
            counts={counts}
            pending={pending}
            filter={filter}
            setFilter={setFilter}
            onHistory={openHistory}
          />
        )}
        {view === "ec" && (
          <ExperimentalECMode
            locale={locale}
            online={online}
            onBack={() => nav("home")}
          />
        )}
      </main>
      {view !== "ec" && (
        <BottomNav view={view} nav={openMainView} t={t} busy={busy} />
      )}
      {toast && (
        <div
          role="status"
          className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-5 py-3 text-sm font-bold text-white shadow-xl lg:bottom-7"
        >
          {toast}
        </div>
      )}
    </div>
  );
}

function Header({
  locale,
  setLocale,
  online,
  pending,
  t,
  onSync,
  busy,
  experimental,
}: {
  locale: Locale;
  setLocale: (x: Locale) => void;
  online: boolean;
  pending: number;
  t: (k: TranslationKey) => string;
  onSync: () => void;
  busy: boolean;
  experimental: boolean;
}) {
  return (
    <header className="air-header sticky top-0 z-40 border-b border-white/20 bg-white/10 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="air-brand-mark grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white">
            <Droplets aria-hidden="true" className="h-6 w-6" />
          </div>
          <div>
            <p className="air-brand hidden font-black leading-none text-white min-[370px]:block">{t("brand")}</p>
            <p className="mt-1 hidden text-xs text-white/75 sm:block">
              {t("tagline")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {experimental ? (
            <div
              role="status"
              className={`air-status flex min-h-10 items-center gap-2 rounded-full px-3 text-xs font-bold ${online ? "bg-white/15 text-white" : "bg-amber-100 text-amber-950"}`}
              aria-label={`${t("experimentalECLabel")}. ${online ? t("online") : t("offline")}. ${t("ecLocalOnly")}`}
            >
              <FlaskConical className="h-4 w-4" />
              <span className="hidden sm:inline">{t("experimentalECLabel")}</span>
              {online ? <Cloud className="h-4 w-4" /> : <CloudOff className="h-4 w-4" />}
              {!online && <span>{t("offlineShort")}</span>}
            </div>
          ) : (
            <button
              type="button"
              onClick={onSync}
              disabled={!online || busy}
              aria-live="polite"
              aria-label={`${online ? t("online") : t("offline")}. ${pending ? `${pending} ${t("pendingSync")}` : t("synced")}. ${t("demoSyncNote")}`}
              className={`air-status flex min-h-10 items-center gap-2 rounded-full px-3 text-xs font-bold ${online ? "bg-white/15 text-white" : "bg-amber-100 text-amber-950"}`}
            >
              {online ? <Cloud className="h-4 w-4" /> : <CloudOff className="h-4 w-4" />}
              <span className="hidden sm:inline">{online ? t("online") : t("offline")}</span>
              {pending > 0 && <span className="rounded-full bg-white px-2 py-0.5">{pending}</span>}
            </button>
          )}
          <button
            type="button"
            onClick={() => setLocale(locale === "en" ? "hi" : "en")}
            aria-label={t("languageSwitch")}
            className="air-language flex min-h-10 items-center gap-2 rounded-full border border-white/35 bg-white/10 px-3 text-sm font-bold text-white"
          >
            <Languages className="h-4 w-4" />
            {locale === "en" ? "हिंदी" : "EN"}
          </button>
        </div>
      </div>
    </header>
  );
}

function HomeView({
  t,
  data,
  counts,
  pending,
  online,
  onStart,
  onStartEC,
  onReset,
}: {
  t: (k: TranslationKey) => string;
  data: AppData;
  counts: { normal: number; retest: number; referral: number };
  pending: number;
  online: boolean;
  onStart: () => void;
  onStartEC: () => void;
  onReset: () => void;
}) {
  return (
    <div className="space-y-6">
      <section className="air-hero relative flex min-h-[31rem] items-center justify-center overflow-hidden rounded-[2rem] p-6 text-center text-white sm:min-h-[38rem] sm:p-9">
        <div className="relative z-10 mx-auto max-w-3xl">
          <span className="inline-flex rounded-full border border-white/30 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] backdrop-blur-md">
            {t("screeningDemoLabel")}
          </span>
          <p className="air-kicker mt-8 text-xs font-black uppercase tracking-[0.34em] text-white/75">
            {t("brand")}
          </p>
          <h1 className="air-hero-title mt-5 text-5xl font-black leading-[0.96] tracking-[-0.055em] sm:text-7xl lg:text-[5.8rem]">
            {t("newTest")}
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-white/85 sm:text-lg">{t("heroBody")}</p>
          <button
            type="button"
            onClick={onStart}
            className="air-primary-cta mx-auto mt-8 flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-white px-7 font-black text-ink shadow-lg sm:w-auto"
          >
            {t("testWater")}
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        <span aria-hidden="true" className="air-hero-orb air-hero-orb-left" />
        <span aria-hidden="true" className="air-hero-orb air-hero-orb-right" />
      </section>
      <section className="air-feature-card rounded-[2rem] border border-white/60 bg-white/90 p-5 shadow-card backdrop-blur-xl sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-7">
        <div className="flex gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-teal-100 text-teal-800">
            <Gauge aria-hidden="true" className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-teal-700">
              {t("researchModeLabel")}
            </p>
            <h2 className="mt-1 text-2xl font-black">{t("experimentalECLabel")}</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
              {t("experimentalECBody")}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onStartEC}
          className="mt-5 flex min-h-14 w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-teal-800 px-6 font-black text-white sm:mt-0 sm:w-auto"
        >
          {t("openExperimentalEC")}
          <ChevronRight className="h-5 w-5" />
        </button>
      </section>
      {!online && <Disclaimer text={t("offline")} />}
      <section>
        <h2 className="mb-3 text-lg font-black">{t("todayGlance")}</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard
            label={t("sourcesTested")}
            value={new Set(data.tests.map((item) => item.sourceId)).size}
          />
          <MetricCard label={t("testsCompleted")} value={data.tests.length} />
          <MetricCard
            label={t("retests")}
            value={counts.retest}
            accent="text-amber-700"
          />
          <MetricCard
            label={t("referrals")}
            value={counts.referral}
            accent="text-red-700"
          />
        </div>
      </section>
      <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-3xl bg-white p-5 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-500">
                {t("deviceQueue")}
              </p>
              <p className="mt-1 text-xl font-black">
                {pending ? `${pending} ${t("pendingSync")}` : t("synced")}
              </p>
              <p className="mt-1 text-xs text-slate-500">{t("demoSyncNote")}</p>
            </div>
            <div
              className={`grid h-12 w-12 place-items-center rounded-2xl ${pending ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}
            >
              <RefreshCcw />
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="flex min-h-16 items-center justify-center gap-2 rounded-3xl border border-slate-300 bg-white font-bold text-slate-600"
        >
          <RotateCcw className="h-4 w-4" />
          {t("resetDemo")}
        </button>
      </section>
    </div>
  );
}

function Registration({
  t,
  busy,
  onBack,
  onSubmit,
}: {
  t: (k: TranslationKey) => string;
  busy: boolean;
  onBack: () => void;
  onSubmit: (
    x: Omit<WaterSource, "id" | "sourceCode" | "createdAt" | "syncStatus">,
  ) => void | Promise<void>;
}) {
  const [form, setForm] = useState({
    sourceType: "HANDPUMP" as SourceType,
    village: "Khunti",
    name: "School handpump",
    latitude: "23.3441",
    longitude: "85.3096",
    photoUrl: "",
  });
  const [error, setError] = useState("");
  const [locating, setLocating] = useState(false);
  const field = (key: keyof typeof form, value: string) => {
    setError("");
    setForm((x) => ({ ...x, [key]: value }));
  };
  const locate = () => {
    setLocating(true);
    setError("");
    if (!navigator.geolocation) {
      setError(t("locationError"));
      setLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setForm((x) => ({
          ...x,
          latitude: p.coords.latitude.toFixed(6),
          longitude: p.coords.longitude.toFixed(6),
        }));
        setLocating(false);
      },
      () => {
        setError(t("locationError"));
        setLocating(false);
      },
      { timeout: 7000 },
    );
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = Number(form.latitude),
      lng = Number(form.longitude);
    if (
      !form.village.trim() ||
      !form.name.trim() ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      setError(t("required"));
      return;
    }
    onSubmit({
      ...form,
      photoUrl: form.photoUrl || undefined,
      latitude: lat,
      longitude: lng,
    });
  };
  return (
    <section className="mx-auto max-w-2xl">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-xl px-2 font-bold text-river-700"
      >
        <ArrowLeft aria-hidden="true" className="h-5 w-5" />
        {t("back")}
      </button>
      <p className="text-sm font-bold uppercase tracking-widest text-river-600">
        {t("step1")}
      </p>
      <h1 className="mt-2 text-3xl font-black">{t("register")}</h1>
      <form
        onSubmit={submit}
        className="mt-6 space-y-5 rounded-3xl bg-white p-5 shadow-card sm:p-8"
      >
        <label className="block">
          <span className="font-bold">{t("sourceType")}</span>
          <select
            value={form.sourceType}
            onChange={(e) => field("sourceType", e.target.value)}
            className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4"
          >
            {(
              ["HANDPUMP", "WELL", "TAP", "BOREWELL", "OTHER"] as SourceType[]
            ).map((value) => (
              <option value={value} key={value}>
                {sourceTypeLabel(t, value)}
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label={t("village")}
            value={form.village}
            onChange={(v) => field("village", v)}
          />
          <Field
            label={t("sourceName")}
            value={form.name}
            onChange={(v) => field("name", v)}
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <span className="font-bold">{t("location")}</span>
            <button
              type="button"
              onClick={locate}
              className="flex min-h-11 items-center gap-2 rounded-xl bg-river-50 px-3 text-sm font-bold text-river-700"
            >
              <LocateFixed className="h-4 w-4" />
              {locating ? t("locating") : t("useLocation")}
            </button>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <Field
              label={t("latitude")}
              type="number"
              min={-90}
              max={90}
              value={form.latitude}
              onChange={(v) => field("latitude", v)}
            />
            <Field
              label={t("longitude")}
              type="number"
              min={-180}
              max={180}
              value={form.longitude}
              onChange={(v) => field("longitude", v)}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">{t("locationHint")}</p>
        </div>
        <label className="block">
          <span className="font-bold">{t("photo")}</span>
          <input
            type="file"
            accept="image/*"
            className="mt-2 block w-full rounded-xl border border-dashed border-slate-300 p-3 text-sm"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && file.size < 1_500_000) {
                const r = new FileReader();
                r.onload = () => field("photoUrl", String(r.result));
                r.readAsDataURL(file);
              } else if (file) {
                setError(t("photoTooLarge"));
                e.currentTarget.value = "";
              }
            }}
          />
        </label>
        {error && (
          <p
            role="alert"
            className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700"
          >
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="min-h-14 w-full rounded-2xl bg-river-700 px-5 font-black text-white disabled:opacity-60"
        >
          {t("continueTesting")} →
        </button>
      </form>
    </section>
  );
}
function Field({
  label,
  value,
  onChange,
  type = "text",
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  min?: number;
  max?: number;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold">{label}</span>
      <input
        required
        type={type}
        step={type === "number" ? "any" : undefined}
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-4"
      />
    </label>
  );
}

function ScreenView({
  t,
  source,
  scenario,
  setScenario,
  progress,
  busy,
  error,
  onBack,
  onMeasure,
}: {
  t: (k: TranslationKey) => string;
  source: WaterSource;
  scenario: SimulationScenario;
  setScenario: (x: SimulationScenario) => void;
  progress: SensorProgress | null;
  busy: boolean;
  error: boolean;
  onBack: () => void;
  onMeasure: () => void;
}) {
  const progressLabel =
    progress?.stage === "connecting"
      ? t("connecting")
      : progress?.stage === "stabilizing"
        ? t("stabilizing")
        : t("measuring");
  return (
    <section className="mx-auto max-w-2xl">
      <button
        type="button"
        onClick={onBack}
        disabled={busy}
        className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-xl px-2 font-bold text-river-700 disabled:opacity-50"
      >
        <ArrowLeft aria-hidden="true" className="h-5 w-5" />
        {t("back")}
      </button>
      <p className="text-sm font-bold uppercase tracking-widest text-river-600">
        {t("step2")} · {source.sourceCode}
      </p>
      <h1 className="mt-2 text-3xl font-black">{t("waterScreening")}</h1>
      <div className="mt-6 rounded-3xl bg-white p-6 shadow-card sm:p-8">
        <div className="flex items-center gap-4">
          <div
            className={`grid h-14 w-14 place-items-center rounded-2xl ${busy ? "animate-pulse bg-sun" : "bg-river-100 text-river-700"}`}
          >
            <Gauge aria-hidden="true" className="h-7 w-7" />
          </div>
          <div>
            <p className="font-black">
              {busy ? progressLabel : t("sensorReady")}
            </p>
            <p className="text-sm text-slate-500">
              {source.name} · {source.village}
            </p>
          </div>
        </div>
        {progress && (
          <>
            <div
              role="progressbar"
              aria-label={progressLabel}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress.progress}
              className="mt-6 h-3 overflow-hidden rounded-full bg-slate-100"
            >
              <div
                className="h-full rounded-full bg-river-600 transition-all duration-500"
                style={{ width: `${progress.progress}%` }}
              />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {Object.entries(readingMeta).map(([key, [labelKey, unit]]) => (
                <div key={key} className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-bold text-slate-500">
                    {t(labelKey)}
                  </p>
                  <p className="mt-1 text-2xl font-black">
                    {typeof progress.readings?.[key as keyof SensorReadings] ===
                    "number"
                      ? formatReading(
                          key as keyof SensorReadings,
                          progress.readings[key as keyof SensorReadings]!,
                        )
                      : "—"}{" "}
                    <span className="text-sm text-slate-500">{unit}</span>
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
        {error && (
          <p
            role="alert"
            className="mt-6 rounded-2xl border border-red-300 bg-red-50 p-4 font-bold text-red-800"
          >
            {t("measurementError")}
          </p>
        )}
        <div className="mt-5 rounded-2xl border border-violet-300 bg-violet-50 p-4">
          <div className="flex items-center gap-2 text-sm font-black text-violet-900">
            <FlaskConical aria-hidden="true" className="h-4 w-4" />
            {t("demoSummary")}
          </div>
          <p className="mt-1 text-sm leading-5 text-violet-950">
            {t("demoShort")}
          </p>
          <details className="mt-2 text-sm text-violet-950">
            <summary className="min-h-9 cursor-pointer py-2 font-bold text-violet-800">
              {t("aboutDemo")}
            </summary>
            <p className="pb-2 leading-5">{t("demoDisclosure")}</p>
          </details>
          <label className="mt-3 block text-sm font-bold">
            {t("demoScenario")}
            <select
              disabled={busy}
              value={scenario}
              onChange={(e) =>
                setScenario(e.target.value as SimulationScenario)
              }
              className="mt-2 min-h-12 w-full rounded-xl border border-violet-300 bg-white px-4"
            >
              <option value="normal">{t("normalPreset")}</option>
              <option value="retest">{t("retestPreset")}</option>
              <option value="referral">{t("referralPreset")}</option>
            </select>
          </label>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={onMeasure}
          className="mt-6 min-h-14 w-full rounded-2xl bg-river-700 px-5 font-black text-white disabled:opacity-60"
        >
          {busy
            ? `${progress?.progress || 0}% · ${progressLabel}`
            : t("startScreening")}
        </button>
      </div>
      <p className="mt-4 text-center text-xs text-slate-500">
        {t("provisional")}
      </p>
    </section>
  );
}

function ResultView({
  t,
  source,
  test,
  result,
  saved,
  referred,
  busy,
  onSave,
  onRefer,
  onRetest,
  onMap,
}: {
  t: (k: TranslationKey) => string;
  source: WaterSource;
  test: WaterTest;
  result: ScreeningResult;
  saved: boolean;
  referred: boolean;
  busy: boolean;
  onSave: () => void;
  onRefer: () => void;
  onRetest: () => void;
  onMap: () => void;
}) {
  const title =
    result.status === "NORMAL_SCREENING"
      ? t("normalTitle")
      : result.status === "RETEST"
        ? t("retestTitle")
        : t("referralTitle");
  const explanation =
    result.status === "NORMAL_SCREENING"
      ? t("normalExplanation")
      : result.status === "RETEST"
        ? t("retestExplanation")
        : t("referralExplanation");
  return (
    <section className="mx-auto max-w-3xl">
      <p className="text-sm font-bold uppercase tracking-widest text-river-600">
        {t("step3")}
      </p>
      <div className="mt-3 rounded-[2rem] bg-white p-5 shadow-card sm:p-8">
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={result.status} t={t} />
          <OriginBadge origin={test.dataOrigin ?? "SIMULATED"} t={t} />
        </div>
        <h1 className="mt-3 text-[1.75rem] font-black leading-[1.1] sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-base leading-6 text-slate-600 sm:text-lg sm:leading-7">
          {explanation}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          {Object.entries(readingMeta).map(([key, [labelKey, unit, Icon]]) => {
            const attention = result.attentionMeasurements.includes(
              key as keyof SensorReadings,
            );
            return (
              <div
                key={key}
                className={`rounded-2xl border p-3 ${attention ? "border-amber-400 bg-amber-50" : "border-slate-200 bg-slate-50"}`}
              >
                <div className="flex items-center gap-2">
                  <Icon
                    aria-hidden="true"
                    className={`h-4 w-4 shrink-0 ${attention ? "text-amber-700" : "text-river-600"}`}
                  />
                  <p className="text-xs font-bold text-slate-500">
                    {t(labelKey)}
                  </p>
                </div>
                <p className="mt-0.5 text-xl font-black sm:text-2xl">
                  {formatReading(
                    key as keyof SensorReadings,
                    test[key as keyof SensorReadings],
                  )}{" "}
                  <span className="text-xs text-slate-500">{unit}</span>
                </p>
                {attention && (
                  <p className="mt-1 text-xs font-bold text-amber-800">
                    {t("needsAttention")}
                  </p>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-4">
          <Disclaimer text={t("disclaimer")} />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <button
            type="button"
            disabled={saved || busy}
            onClick={onSave}
            className="min-h-[52px] rounded-xl bg-river-700 font-black text-white disabled:bg-emerald-600"
          >
            <Save aria-hidden="true" className="mr-2 inline h-4 w-4" />
            {busy ? t("saving") : saved ? t("savedOnDevice") : t("saveTest")}
          </button>
          {result.status === "LAB_REFERRAL" && (
            <button
              type="button"
              disabled={!saved || referred || busy}
              title={!saved ? t("referralPendingSave") : undefined}
              onClick={onRefer}
              className="min-h-[52px] rounded-xl bg-red-700 font-black text-white disabled:bg-red-400"
            >
              <FlaskConical
                aria-hidden="true"
                className="mr-2 inline h-4 w-4"
              />
              {referred ? t("referralCreated") : t("referLab")}
            </button>
          )}
          <button
            type="button"
            onClick={onRetest}
            className="min-h-[52px] rounded-xl border border-slate-300 font-bold"
          >
            <RefreshCcw aria-hidden="true" className="mr-2 inline h-4 w-4" />
            {t("retestAction")}
          </button>
        </div>
        {result.status === "LAB_REFERRAL" && !saved && (
          <p className="mt-2 text-center text-sm font-semibold text-slate-600">
            {t("referralPendingSave")}
          </p>
        )}
        {saved && (
          <button
            type="button"
            onClick={onMap}
            className="mt-3 min-h-12 w-full rounded-xl bg-river-50 font-bold text-river-700"
          >
            {t("seeOnMap")} →
          </button>
        )}
        <div className="mt-4 grid gap-3 rounded-2xl border border-slate-200 p-3 text-sm sm:grid-cols-2 sm:p-4">
          <div>
            <span className="text-slate-500">{t("source")}</span>
            <p className="font-bold">
              {source.name} · {source.sourceCode}
            </p>
          </div>
          <div>
            <span className="text-slate-500">{t("location")}</span>
            <p className="font-bold">
              {source.village} · {source.latitude.toFixed(4)},{" "}
              {source.longitude.toFixed(4)}
            </p>
          </div>
          <div>
            <span className="text-slate-500">{t("timestamp")}</span>
            <p className="font-bold">
              {new Date(test.testedAt).toLocaleString()}
            </p>
          </div>
          {result.reasonCodes.length > 0 && (
            <div className="sm:col-span-2">
              <span className="text-slate-500">{t("screeningReasons")}</span>
              <ul className="mt-1 list-disc space-y-1 pl-5 font-bold">
                {result.reasonCodes.map((code) => (
                  <li key={code}>{reasonLabel(t, code)}</li>
                ))}
              </ul>
              <details className="mt-2 text-xs text-slate-500">
                <summary className="min-h-9 cursor-pointer py-2 font-bold text-slate-600">
                  {t("technicalDetails")}
                </summary>
                <p>
                  {t("reasonCodes")}: {result.reasonCodes.join(", ")}
                </p>
              </details>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function MapView({
  t,
  data,
  online,
  onHistory,
}: {
  t: (k: TranslationKey) => string;
  data: AppData;
  online: boolean;
  onHistory: (id: string) => void;
}) {
  const [mapError, setMapError] = useState(false);
  const onMapError = useCallback(() => setMapError(true), []);
  const labels = useMemo(
    () => ({
      mapLabel: t("mapTitle"),
      history: t("viewHistory"),
      origin: t("dataOrigin"),
      ph: t("phLabel"),
      tds: t("tdsLabel"),
      turbidity: t("turbidityLabel"),
      status: (status: ScreeningStatus) => statusLabel(t, status),
      originName: (origin: WaterTest["dataOrigin"]) =>
        origin === "SIMULATED"
          ? t("simulated")
          : origin === "SENSOR"
            ? t("sensor")
            : t("labConfirmed"),
    }),
    [t],
  );
  const mappedSources = data.sources
    .map((item) => ({
      source: item,
      latest: data.tests
        .filter((test) => test.sourceId === item.id)
        .sort((a, b) => b.testedAt.localeCompare(a.testedAt))[0],
    }))
    .filter((item): item is { source: WaterSource; latest: WaterTest } =>
      Boolean(item.latest),
    );
  const mapStatusCounts = {
    NORMAL_SCREENING: mappedSources.filter(
      ({ latest }) => latest.screeningStatus === "NORMAL_SCREENING",
    ).length,
    RETEST: mappedSources.filter(
      ({ latest }) => latest.screeningStatus === "RETEST",
    ).length,
    LAB_REFERRAL: mappedSources.filter(
      ({ latest }) => latest.screeningStatus === "LAB_REFERRAL",
    ).length,
  };
  const allDemo = mappedSources.every(
    ({ latest }) => latest.dataOrigin === "SIMULATED",
  );
  return (
    <section>
      <div className="mb-5">
        <p className="text-sm font-bold uppercase tracking-widest text-river-600">
          Jharkhand
        </p>
        <h1 className="mt-1 text-3xl font-black">{t("mapTitle")}</h1>
        <p className="mt-2 text-slate-600">{t("mapSubtitle")}</p>
        <div
          aria-label={t("mapTitle")}
          className="mt-3 flex flex-wrap gap-2 text-xs font-bold"
        >
          <span className="rounded-full bg-white px-3 py-1.5 shadow-sm">
            {mappedSources.length} {t("sources")}
          </span>
          {mapStatusCounts.NORMAL_SCREENING > 0 && (
            <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-emerald-800">
              {mapStatusCounts.NORMAL_SCREENING} {t("normalStatus")}
            </span>
          )}
          {mapStatusCounts.RETEST > 0 && (
            <span className="rounded-full bg-amber-100 px-3 py-1.5 text-amber-900">
              {mapStatusCounts.RETEST} {t("retestStatus")}
            </span>
          )}
          {mapStatusCounts.LAB_REFERRAL > 0 && (
            <span className="rounded-full bg-red-100 px-3 py-1.5 text-red-800">
              {mapStatusCounts.LAB_REFERRAL} {t("referralStatusLabel")}
            </span>
          )}
          {!!mappedSources.length && (
            <span className="rounded-full bg-violet-100 px-3 py-1.5 text-violet-800">
              {allDemo ? t("demoData") : t("mixedData")}
            </span>
          )}
        </div>
      </div>
      {online && !mapError ? (
        <MapPanel
          sources={data.sources}
          tests={data.tests}
          onHistory={onHistory}
          onMapError={onMapError}
          labels={labels}
        />
      ) : (
        <div
          role="status"
          className="grid min-h-[260px] place-items-center rounded-3xl border border-dashed border-amber-400 bg-amber-50 p-8 text-center"
        >
          <div className="max-w-md">
            <CloudOff
              aria-hidden="true"
              className="mx-auto h-10 w-10 text-amber-700"
            />
            <h2 className="mt-4 text-xl font-black">
              {online ? t("mapUnavailableTitle") : t("mapOfflineTitle")}
            </h2>
            <p className="mt-2 text-slate-700">{t("mapOfflineBody")}</p>
          </div>
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-4 rounded-2xl bg-white p-4 text-sm shadow-sm">
        <strong>{t("screeningLegend")}:</strong>
        {(
          ["NORMAL_SCREENING", "RETEST", "LAB_REFERRAL"] as ScreeningStatus[]
        ).map((s) => (
          <span key={s} className="flex items-center gap-2">
            <i className={`h-3 w-3 rounded-full ${statusDot[s]}`} />
            {statusLabel(t, s)}
          </span>
        ))}
      </div>
      <section className="mt-6" aria-labelledby="local-sources-heading">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <h2 id="local-sources-heading" className="text-xl font-black">
            {t("localSources")}
          </h2>
          <p className="text-sm text-slate-500">{t("offlineMapListHint")}</p>
        </div>
        {!mappedSources.length ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-600">
            {t("noMappedSources")}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {mappedSources.map(({ source, latest }) => (
              <article
                key={source.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-black">{source.name}</p>
                    <p className="text-sm text-slate-500">
                      {source.sourceCode} · {source.village}
                    </p>
                  </div>
                  <StatusBadge status={latest.screeningStatus} t={t} />
                </div>
                <div className="mt-3">
                  <OriginBadge
                    origin={latest.dataOrigin ?? "SIMULATED"}
                    t={t}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => onHistory(source.id)}
                  className="mt-3 min-h-11 w-full rounded-xl bg-river-50 font-bold text-river-700"
                >
                  {t("viewHistory")} →
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
function TestsView({
  t,
  data,
  focusSource,
  busy,
  onRefer,
}: {
  t: (k: TranslationKey) => string;
  data: AppData;
  focusSource?: string;
  busy: boolean;
  onRefer: (testId: string, sourceId: string) => void;
}) {
  const focusedSource = data.sources.find((item) => item.id === focusSource);
  const rows = [...data.tests]
    .filter((x) => !focusSource || x.sourceId === focusSource)
    .sort((a, b) => b.testedAt.localeCompare(a.testedAt));
  return (
    <section>
      <p className="text-sm font-bold uppercase tracking-widest text-river-600">
        {focusedSource ? focusedSource.sourceCode : t("allHistory")}
      </p>
      <h1 className="mt-1 text-3xl font-black">{t("testHistory")}</h1>
      <p className="mt-2 max-w-3xl text-slate-600">{t("historySubtitle")}</p>
      {focusedSource && (
        <div className="mt-5 grid gap-3 rounded-2xl border border-river-100 bg-river-50 p-4 sm:grid-cols-3">
          <div>
            <p className="text-xs font-bold uppercase text-slate-500">
              {t("source")}
            </p>
            <p className="mt-1 font-black">{focusedSource.name}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-slate-500">
              {t("village")}
            </p>
            <p className="mt-1 font-black">{focusedSource.village}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-slate-500">
              {t("coordinates")}
            </p>
            <p className="mt-1 font-black">
              {focusedSource.latitude.toFixed(4)},{" "}
              {focusedSource.longitude.toFixed(4)}
            </p>
          </div>
        </div>
      )}
      <div className="mt-6 space-y-3">
        {!rows.length && (
          <div className="rounded-3xl bg-white p-8 text-center text-slate-500">
            {t("noData")}
          </div>
        )}
        {rows.map((test, rowIndex) => {
          const source = data.sources.find((s) => s.id === test.sourceId);
          const ref = data.referrals.find((r) => r.testId === test.id);
          const sourceTests = data.tests
            .filter((item) => item.sourceId === test.sourceId)
            .sort((a, b) => a.testedAt.localeCompare(b.testedAt));
          const testNumber =
            sourceTests.findIndex((item) => item.id === test.id) + 1;
          return (
            <article
              key={test.id}
              className="rounded-2xl bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-black">
                    {source?.name} · {source?.sourceCode}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {t("testNumber")} {testNumber}
                    {rowIndex === 0 && focusSource
                      ? ` · ${t("latestTest")}`
                      : ""}
                    {" · "}
                    {source?.village} ·{" "}
                    {new Date(test.testedAt).toLocaleString()}
                  </p>
                </div>
                <StatusBadge status={test.screeningStatus} t={t} />
              </div>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                <span>
                  pH <b>{formatReading("ph", test.ph)}</b>
                </span>
                <span>
                  {t("tdsLabel")} <b>{formatReading("tds", test.tds)} mg/L</b>
                </span>
                <span>
                  {t("turbidityLabel")}{" "}
                  <b>{formatReading("turbidity", test.turbidity)} NTU</b>
                </span>
                <span>
                  {t("temperatureLabel")}{" "}
                  <b>{formatReading("temperature", test.temperature)}°C</b>
                </span>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs font-bold text-slate-500">
                <span>{syncLabel(t, test.syncStatus)}</span>
                <OriginBadge origin={test.dataOrigin ?? "SIMULATED"} t={t} />
              </div>
              {test.screeningStatus === "LAB_REFERRAL" && !ref && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onRefer(test.id, test.sourceId)}
                  className="mt-4 min-h-12 w-full rounded-xl bg-red-700 px-4 font-black text-white disabled:opacity-60"
                >
                  <FlaskConical
                    aria-hidden="true"
                    className="mr-2 inline h-4 w-4"
                  />
                  {t("createReferralForTest")}
                </button>
              )}
              {ref && source && (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-black text-red-900">
                      {t("referralDetails")}
                    </h3>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-red-800">
                      {ref.referralStatus === "CREATED"
                        ? t("referralCreatedStatus")
                        : ref.referralStatus.replaceAll("_", " ")}
                    </span>
                  </div>
                  <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                    <div>
                      <dt className="text-slate-500">{t("referralId")}</dt>
                      <dd className="font-bold">{ref.id}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">{t("sourceCode")}</dt>
                      <dd className="font-bold">{source.sourceCode}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">{t("village")}</dt>
                      <dd className="font-bold">{source.village}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">{t("coordinates")}</dt>
                      <dd className="font-bold">
                        {source.latitude.toFixed(4)},{" "}
                        {source.longitude.toFixed(4)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">
                        {t("screeningReasons")}
                      </dt>
                      <dd>
                        <ul className="mt-1 list-disc space-y-1 pl-5 font-bold">
                          {test.reasonCodes.map((code) => (
                            <li key={code}>{reasonLabel(t, code)}</li>
                          ))}
                        </ul>
                        <details className="mt-2 text-xs text-slate-500">
                          <summary className="cursor-pointer font-bold">
                            {t("technicalDetails")}
                          </summary>
                          <p className="mt-1">{test.reasonCodes.join(", ")}</p>
                        </details>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">{t("timestamp")}</dt>
                      <dd className="font-bold">
                        {new Date(ref.createdAt).toLocaleString()}
                      </dd>
                    </div>
                  </dl>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
function DashboardView({
  t,
  data,
  latestBySource,
  counts,
  pending,
  filter,
  setFilter,
  onHistory,
}: {
  t: (k: TranslationKey) => string;
  data: AppData;
  latestBySource: Map<string, WaterTest | undefined>;
  counts: { normal: number; retest: number; referral: number };
  pending: number;
  filter: "ALL" | ScreeningStatus;
  setFilter: (x: "ALL" | ScreeningStatus) => void;
  onHistory: (id: string) => void;
}) {
  const attention = data.sources
    .map((s) => ({ source: s, test: latestBySource.get(s.id) }))
    .filter(
      (x) =>
        x.test &&
        x.test.screeningStatus !== "NORMAL_SCREENING" &&
        (filter === "ALL" || x.test.screeningStatus === filter),
    );
  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-river-600">
            {t("fieldMonitoring")}
          </p>
          <h1 className="mt-1 text-3xl font-black">{t("dashboard")}</h1>
        </div>
        <select
          aria-label={t("filters")}
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 font-bold"
        >
          <option value="ALL">{t("all")}</option>
          <option value="RETEST">{t("retestStatus")}</option>
          <option value="LAB_REFERRAL">{t("referralStatusLabel")}</option>
        </select>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <MetricCard compact label={t("sources")} value={data.sources.length} />
        <MetricCard
          compact
          label={t("testsCompleted")}
          value={data.tests.length}
        />
        <MetricCard
          compact
          label={t("normalScreenings")}
          value={counts.normal}
        />
        <MetricCard
          compact
          label={t("retests")}
          value={counts.retest}
          accent="text-amber-700"
        />
        <MetricCard
          compact
          label={t("referrals")}
          value={counts.referral}
          accent="text-red-700"
        />
        <MetricCard compact label={t("pendingDeviceSync")} value={pending} />
      </div>
      <div className="mt-5 overflow-hidden rounded-3xl bg-white shadow-card">
        <div className="border-b p-4 sm:p-5">
          <h2 className="text-xl font-black">{t("requiringAttention")}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="p-3 sm:p-4">{t("sourceCode")}</th>
                <th className="p-3 sm:p-4">{t("village")}</th>
                <th className="p-3 sm:p-4">{t("sourceTypeLabel")}</th>
                <th className="p-3 sm:p-4">{t("latestStatus")}</th>
                <th className="p-3 sm:p-4">{t("lastTested")}</th>
                <th className="p-3 sm:p-4">{t("action")}</th>
              </tr>
            </thead>
            <tbody>
              {attention.map(({ source, test }) => (
                <tr key={source.id} className="border-t">
                  <td className="p-3 font-bold sm:p-4">{source.sourceCode}</td>
                  <td className="p-3 sm:p-4">{source.village}</td>
                  <td className="p-3 sm:p-4">
                    {sourceTypeLabel(t, source.sourceType)}
                  </td>
                  <td className="p-3 sm:p-4">
                    <StatusBadge status={test!.screeningStatus} t={t} />
                  </td>
                  <td className="p-3 sm:p-4">
                    {new Date(test!.testedAt).toLocaleDateString()}
                  </td>
                  <td className="p-3 sm:p-4">
                    <button
                      onClick={() => onHistory(source.id)}
                      className="font-bold text-river-700"
                    >
                      {t("review")} →
                    </button>
                  </td>
                </tr>
              ))}
              {!attention.length && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    {t("noAttentionSources")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="mt-5">
        <Disclaimer text={t("disclaimer")} />
      </div>
    </section>
  );
}
function BottomNav({
  view,
  nav,
  t,
  busy,
}: {
  view: View;
  nav: (x: View) => void;
  t: (k: TranslationKey) => string;
  busy: boolean;
}) {
  const items: [View, TranslationKey, typeof Home][] = [
    ["home", "home", Home],
    ["map", "map", MapIcon],
    ["tests", "tests", ListChecks],
    ["dashboard", "dashboard", BarChart3],
  ];
  return (
    <nav
      aria-label={t("navigation")}
      className="safe-bottom fixed bottom-0 z-40 grid w-full grid-cols-4 border-t bg-white px-2 pt-2 lg:sticky lg:bottom-auto lg:mx-auto lg:mt-8 lg:max-w-2xl lg:rounded-2xl lg:border lg:p-2"
    >
      {items.map(([target, key, Icon]) => (
        <button
          type="button"
          key={target}
          disabled={busy}
          aria-current={view === target ? "page" : undefined}
          onClick={() => nav(target)}
          className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-xs font-bold disabled:opacity-40 ${view === target ? "bg-river-50 text-river-700" : "text-slate-500"}`}
        >
          <Icon className="h-5 w-5" />
          {t(key)}
        </button>
      ))}
    </nav>
  );
}
