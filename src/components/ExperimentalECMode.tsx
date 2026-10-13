"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Database,
  Download,
  FlaskConical,
  Gauge,
  History,
  Plus,
  RotateCcw,
  Save,
  Thermometer,
  TriangleAlert,
} from "lucide-react";
import {
  db,
  readAll,
  readECData,
  resetExperimentalECData,
  saveECDevice,
  saveECMeasurementOnce,
} from "@/data/database";
import { generateSourceCode } from "@/domain/source-code";
import type { SourceType, WaterSource } from "@/domain/types";
import { createECCsv } from "@/ec/export";
import { hasRecordedCalibration } from "@/ec/device";
import {
  compareECWithHistory,
  getECAnalysisFailureReason,
  getECComparisonEligibility,
  type ECComparisonExclusionReason,
} from "@/ec/history";
import { evaluateECRepeatability } from "@/ec/measurement-quality";
import { ManualECMeasurementProvider } from "@/ec/provider";
import type {
  ECChangeResult,
  ECData,
  ECDevice,
  ECMeasurementRecord,
  ECRepeatabilityResult,
  ECSamplingMethod,
} from "@/ec/types";
import { ecT, type ECTranslationKey } from "@/i18n/ec-translations";
import type { Locale } from "@/i18n/translations";

type ECView = "home" | "source" | "device" | "measure" | "result" | "history";
const EMPTY_EC: ECData = { devices: [], measurements: [] };
const EC_FLOW_KEY = "jalrakshak-ec-active-flow-v1";
const measurementDraftKey = (sourceId: string, deviceId: string) =>
  `jalrakshak-ec-measurement-${sourceId}-${deviceId}`;

function formatEC(value: number | undefined) {
  return value === undefined || !Number.isFinite(value)
    ? "—"
    : `${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 }).format(value)} µS/cm`;
}

export function ExperimentalECMode({
  locale,
  online,
  onBack,
}: {
  locale: Locale;
  online: boolean;
  onBack: () => void;
}) {
  const [view, setView] = useState<ECView>("home");
  const [sources, setSources] = useState<WaterSource[]>([]);
  const [ecData, setECData] = useState<ECData>(EMPTY_EC);
  const [source, setSource] = useState<WaterSource | null>(null);
  const [device, setDevice] = useState<ECDevice | null>(null);
  const [savedRecord, setSavedRecord] = useState<ECMeasurementRecord | null>(null);
  const [changeResult, setChangeResult] = useState<ECChangeResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [flowReady, setFlowReady] = useState(false);
  const saveLock = useRef(false);
  const t = useCallback(
    (key: ECTranslationKey) => ecT(locale, key),
    [locale],
  );

  const reload = useCallback(async () => {
    const [appData, experimental] = await Promise.all([readAll(), readECData()]);
    setSources(appData.sources);
    setECData(experimental);
    return { appData, experimental };
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      reload()
        .then(({ appData, experimental }) => {
          try {
            const raw = localStorage.getItem(EC_FLOW_KEY);
            if (!raw) return;
            const draft = JSON.parse(raw) as {
              view?: ECView;
              sourceId?: string;
              deviceRecordId?: string;
              savedRecordId?: string;
            };
            const restoredSource = appData.sources.find(
              (item) => item.id === draft.sourceId,
            );
            const restoredDevice = experimental.devices.find(
              (item) => item.id === draft.deviceRecordId,
            );
            const restoredRecord = experimental.measurements.find(
              (item) => item.id === draft.savedRecordId,
            );
            if (restoredSource) setSource(restoredSource);
            if (restoredDevice) setDevice(restoredDevice);
            if (draft.view === "history" || draft.view === "source") {
              setView(draft.view);
            } else if (draft.view === "device" && restoredSource) {
              setView("device");
            } else if (draft.view === "measure" && restoredSource && restoredDevice) {
              setView("measure");
            } else if (draft.view === "result" && restoredSource && restoredRecord) {
              setSavedRecord(restoredRecord);
              setChangeResult(
                compareECWithHistory(restoredRecord, experimental.measurements),
              );
              setView("result");
            }
          } catch {
            localStorage.removeItem(EC_FLOW_KEY);
          }
        })
        .catch(() => setError(t("storageError")))
        .finally(() => setFlowReady(true));
    });
  }, [reload, t]);
  useEffect(() => {
    if (!flowReady) return;
    localStorage.setItem(
      EC_FLOW_KEY,
      JSON.stringify({
        view,
        sourceId: source?.id,
        deviceRecordId: device?.id,
        savedRecordId: savedRecord?.id,
      }),
    );
  }, [device, flowReady, savedRecord, source, view]);
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [view]);
  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 2800);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const trackedSources = useMemo(
    () => new Set(ecData.measurements.map((item) => item.sourceId)).size,
    [ecData.measurements],
  );

  function begin() {
    setSavedRecord(null);
    setChangeResult(null);
    setError("");
    setView("source");
  }

  async function registerSource(
    input: Omit<WaterSource, "id" | "sourceCode" | "createdAt" | "syncStatus">,
  ) {
    setBusy(true);
    setError("");
    try {
      let sourceCode = generateSourceCode(input.sourceType);
      while (await db.sources.where("sourceCode").equals(sourceCode).first()) {
        sourceCode = generateSourceCode(input.sourceType);
      }
      const created: WaterSource = {
        ...input,
        id: crypto.randomUUID(),
        sourceCode,
        createdAt: new Date().toISOString(),
        syncStatus: "LOCAL_ONLY",
        recordScope: "EXPERIMENTAL_EC",
      };
      await db.sources.add(created);
      await reload();
      setSource(created);
      setView("device");
    } catch {
      setError(t("required"));
    } finally {
      setBusy(false);
    }
  }

  async function createDevice(input: Omit<ECDevice, "id" | "createdAt">) {
    setBusy(true);
    setError("");
    try {
      const duplicate = ecData.devices.some(
        (item) =>
          item.deviceId.toLocaleLowerCase() === input.deviceId.toLocaleLowerCase() &&
          item.probeId.toLocaleLowerCase() === input.probeId.toLocaleLowerCase(),
      );
      if (duplicate) {
        setError(t("duplicateDevice"));
        return;
      }
      const hasAnyCalibration = Boolean(
        input.lastCalibrationDate || input.calibrationStandardUsCm !== undefined,
      );
      const created: ECDevice = {
        ...input,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };
      if (hasAnyCalibration && !hasRecordedCalibration(created)) {
        setError(t("invalidCalibration"));
        return;
      }
      await saveECDevice(created);
      await reload();
      setDevice(created);
      setView("measure");
    } catch {
      setError(t("storageError"));
    } finally {
      setBusy(false);
    }
  }

  async function capture(input: {
    reading1RawEcUsCm: number;
    reading2RawEcUsCm?: number;
    reading3RawEcUsCm?: number;
    temperatureC: number;
    samplingMethod: ECSamplingMethod;
    notes?: string;
  }, commit = false) {
    if (!source || !device || saveLock.current) return;
    setError("");
    const provider = new ManualECMeasurementProvider();
    let measurement;
    try {
      measurement = await provider.capture(input);
    } catch {
      setError(t("invalidInput"));
      return;
    }
    const quality = evaluateECRepeatability([
      measurement.reading1RawEcUsCm,
      measurement.reading2RawEcUsCm,
      measurement.reading3RawEcUsCm,
    ]);
    if (quality.status === "INSUFFICIENT_DATA") {
      setError(t("twoRequired"));
      return;
    }
    if (quality.requiresThirdReading || !commit) return quality;

    saveLock.current = true;
    setBusy(true);
    try {
      const calibrationRecorded = hasRecordedCalibration(device);
      const record: ECMeasurementRecord = {
        id: crypto.randomUUID(),
        visitId: `JR-ECV-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
        sourceId: source.id,
        deviceRecordId: device.id,
        deviceId: device.deviceId,
        probeId: device.probeId,
        measuredAt: measurement.capturedAt,
        reading1RawEcUsCm: measurement.reading1RawEcUsCm,
        reading2RawEcUsCm: measurement.reading2RawEcUsCm,
        reading3RawEcUsCm: measurement.reading3RawEcUsCm,
        temperatureC: measurement.temperatureC,
        representativeRawEcUsCm: quality.representativeRawEcUsCm,
        agreementStatus: quality.status,
        measurementQuality: quality.status,
        calibrationRecordId: calibrationRecorded ? device.id : undefined,
        calibrationRecorded,
        dataOrigin: measurement.dataOrigin,
        providerName: measurement.providerName,
        samplingMethod: input.samplingMethod,
        notes: input.notes?.trim() || undefined,
        createdOfflineAt: online ? undefined : measurement.capturedAt,
        syncStatus: "LOCAL_ONLY",
      };
      await saveECMeasurementOnce(record);
      const comparison = compareECWithHistory(record, ecData.measurements);
      await reload();
      setSavedRecord(record);
      setChangeResult(comparison);
      setView("result");
      return quality;
    } catch {
      setError(t("storageError"));
    } finally {
      saveLock.current = false;
      setBusy(false);
    }
  }

  function exportCsv(sourceId?: string) {
    const records = sourceId
      ? ecData.measurements.filter((item) => item.sourceId === sourceId)
      : ecData.measurements;
    const csv = createECCsv(records, sources, ecData.devices);
    const url = URL.createObjectURL(
      new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `jalrakshak-ec-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setNotice(t("downloadReady"));
  }

  async function reset() {
    if (!window.confirm(t("resetConfirm"))) return;
    setBusy(true);
    try {
      await resetExperimentalECData();
      await reload();
      setSource(null);
      setDevice(null);
      setSavedRecord(null);
      setChangeResult(null);
      localStorage.removeItem(EC_FLOW_KEY);
      setView("home");
      setNotice(t("resetComplete"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {view !== "home" && (
        <button
          type="button"
          onClick={() =>
            setView(
              view === "source"
                ? "home"
                : view === "device"
                  ? "source"
                  : view === "measure"
                    ? "device"
                    : "home",
            )
          }
          disabled={busy}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 font-bold text-river-700 disabled:opacity-50"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          {t("back")}
        </button>
      )}
      {error && (
        <p role="alert" className="rounded-2xl border border-red-300 bg-red-50 p-4 font-bold text-red-800">
          {error}
        </p>
      )}
      {view === "home" && (
        <ECHome
          t={t}
          online={online}
          visits={ecData.measurements.length}
          sources={trackedSources}
          onStart={begin}
          onHistory={() => setView("history")}
          onExport={() => exportCsv()}
          onReset={reset}
          onBack={onBack}
          hasData={ecData.measurements.length > 0}
          busy={busy}
        />
      )}
      {view === "source" && (
        <ECSourceStep
          t={t}
          sources={sources}
          busy={busy}
          onSelect={(selected) => {
            setSource(selected);
            setView("device");
          }}
          onRegister={registerSource}
        />
      )}
      {view === "device" && source && (
        <ECDeviceStep
          t={t}
          devices={ecData.devices}
          busy={busy}
          onSelect={(selected) => {
            setDevice(selected);
            setView("measure");
          }}
          onCreate={createDevice}
        />
      )}
      {view === "measure" && source && device && (
        <ECMeasurementStep
          key={`${source.id}-${device.id}`}
          t={t}
          source={source}
          device={device}
          busy={busy}
          onCapture={capture}
        />
      )}
      {view === "result" && source && savedRecord && changeResult && (
        <ECResult
          t={t}
          source={source}
          record={savedRecord}
          result={changeResult}
          online={online}
          onAgain={() => {
            setSavedRecord(null);
            setChangeResult(null);
            setView("measure");
          }}
          onHistory={() => setView("history")}
        />
      )}
      {view === "history" && (
        <ECHistory
          t={t}
          sources={sources}
          records={ecData.measurements}
          initialSourceId={source?.id}
          onStart={begin}
          onExport={exportCsv}
        />
      )}
      {notice && (
        <div role="status" className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-5 py-3 text-sm font-bold text-white shadow-xl">
          {notice}
        </div>
      )}
    </div>
  );
}

function ECHome({
  t,
  online,
  visits,
  sources,
  onStart,
  onHistory,
  onExport,
  onReset,
  onBack,
  hasData,
  busy,
}: {
  t: (key: ECTranslationKey) => string;
  online: boolean;
  visits: number;
  sources: number;
  onStart: () => void;
  onHistory: () => void;
  onExport: () => void;
  onReset: () => void;
  onBack: () => void;
  hasData: boolean;
  busy: boolean;
}) {
  return (
    <>
      <section className="overflow-hidden rounded-[2rem] border border-teal-800 bg-ink p-6 text-white shadow-card sm:p-9">
        <span className="inline-flex items-center gap-2 rounded-full bg-teal-200 px-3 py-1 text-xs font-black uppercase tracking-widest text-teal-950">
          <FlaskConical className="h-4 w-4" aria-hidden="true" />
          {t("researchMode")}
        </span>
        <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-5xl">
          {t("experimentalEC")}
        </h1>
        <p className="mt-2 max-w-2xl text-xl font-bold text-teal-100">
          {t("homeTitle")}
        </p>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200 sm:text-base">
          {t("homeBody")}
        </p>
        <div className="mt-7 grid gap-3 sm:flex">
          <button type="button" onClick={onStart} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-sun px-6 font-black text-ink">
            {t("startMeasurement")} <ChevronRight className="h-5 w-5" />
          </button>
          <button type="button" onClick={onHistory} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-white/40 bg-white/10 px-6 font-black text-white">
            <History className="h-5 w-5" /> {t("sourceHistory")}
          </button>
        </div>
      </section>
      <div className="flex gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-950">
        <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        {t("disclaimer")}
      </div>
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <ECMetric label={t("localRecords")} value={visits} />
        <ECMetric label={t("sourcesTracked")} value={sources} />
        <div className="col-span-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-bold text-slate-700 shadow-sm sm:col-span-1">
          <Database className="h-5 w-5 text-teal-700" />
          {online ? t("savedLocally") : t("offlineReady")}
        </div>
      </section>
      <p className="rounded-2xl bg-teal-50 p-4 text-sm font-bold text-teal-900">
        {t("dataSeparation")}
      </p>
      <details className="rounded-2xl border border-slate-300 bg-white p-4 text-sm shadow-sm">
        <summary className="cursor-pointer font-black text-teal-950">
          {t("localDataTitle")}
        </summary>
        <p className="mt-3 leading-6 text-slate-700">{t("localDataBody")}</p>
      </details>
      <section className="grid gap-3 sm:grid-cols-3">
        <button type="button" onClick={onExport} disabled={!hasData} className="min-h-12 rounded-xl border border-slate-300 bg-white px-4 font-bold disabled:opacity-40">
          <Download className="mr-2 inline h-4 w-4" /> {t("exportCsv")}
        </button>
        <button type="button" onClick={onReset} disabled={!hasData || busy} className="min-h-12 rounded-xl border border-slate-300 bg-white px-4 font-bold text-slate-600 disabled:opacity-40">
          <RotateCcw className="mr-2 inline h-4 w-4" /> {t("resetExperiment")}
        </button>
        <button type="button" onClick={onBack} className="min-h-12 rounded-xl border border-river-300 bg-river-50 px-4 font-bold text-river-800">
          {t("backToScreening")}
        </button>
      </section>
    </>
  );
}

function ECMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-black text-ink">{value}</p>
    </div>
  );
}

function StepHeading({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <header>
      <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-700">{eyebrow}</p>
      <h1 className="mt-2 text-3xl font-black text-ink">{title}</h1>
      <p className="mt-2 max-w-2xl text-slate-600">{body}</p>
    </header>
  );
}

function ECSourceStep({
  t,
  sources,
  busy,
  onSelect,
  onRegister,
}: {
  t: (key: ECTranslationKey) => string;
  sources: WaterSource[];
  busy: boolean;
  onSelect: (source: WaterSource) => void;
  onRegister: (input: Omit<WaterSource, "id" | "sourceCode" | "createdAt" | "syncStatus">) => void;
}) {
  const [selected, setSelected] = useState(sources[0]?.id ?? "");
  const [form, setForm] = useState({
    sourceType: "HANDPUMP" as SourceType,
    village: "Khunti",
    name: "School handpump",
    latitude: "23.3441",
    longitude: "85.3096",
  });
  const [formError, setFormError] = useState("");
  function submit(event: React.FormEvent) {
    event.preventDefault();
    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);
    if (!form.village.trim() || !form.name.trim() || !Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      setFormError(t("required"));
      return;
    }
    onRegister({ ...form, latitude, longitude, recordScope: "EXPERIMENTAL_EC" });
  }
  const typeLabels: Record<SourceType, ECTranslationKey> = {
    HANDPUMP: "handpump", WELL: "well", TAP: "tap", BOREWELL: "borewell", OTHER: "other",
  };
  return (
    <section className="space-y-6">
      <StepHeading eyebrow="1 / 3" title={t("chooseSource")} body={t("chooseSourceBody")} />
      {sources.length > 0 && (
        <div className="rounded-3xl bg-white p-5 shadow-card sm:p-7">
          <label className="block font-bold">
            {t("selectExisting")}
            <select value={selected} onChange={(e) => setSelected(e.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4">
              {sources.map((item) => <option key={item.id} value={item.id}>{item.sourceCode} — {item.name}, {item.village}</option>)}
            </select>
          </label>
          <button type="button" disabled={!selected || busy} onClick={() => { const item = sources.find((value) => value.id === selected); if (item) onSelect(item); }} className="mt-4 min-h-12 w-full rounded-xl bg-teal-800 px-5 font-black text-white disabled:opacity-50">
            {t("useSource")}
          </button>
        </div>
      )}
      <form onSubmit={submit} className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-card sm:p-7">
        <h2 className="text-lg font-black">{t("orRegister")}</h2>
        <p className="rounded-xl border border-violet-200 bg-violet-50 p-3 text-sm font-bold leading-5 text-violet-950">
          {t("exampleDataNotice")}
        </p>
        <label className="block text-sm font-bold">{t("sourceType")}
          <select value={form.sourceType} onChange={(e) => setForm((old) => ({ ...old, sourceType: e.target.value as SourceType }))} className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4">
            {(Object.keys(typeLabels) as SourceType[]).map((type) => <option key={type} value={type}>{t(typeLabels[type])}</option>)}
          </select>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <ECInput label={t("village")} value={form.village} onChange={(value) => setForm((old) => ({ ...old, village: value }))} />
          <ECInput label={t("sourceName")} value={form.name} onChange={(value) => setForm((old) => ({ ...old, name: value }))} />
          <ECInput label={t("latitude")} type="number" value={form.latitude} onChange={(value) => setForm((old) => ({ ...old, latitude: value }))} />
          <ECInput label={t("longitude")} type="number" value={form.longitude} onChange={(value) => setForm((old) => ({ ...old, longitude: value }))} />
        </div>
        {formError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{formError}</p>}
        <button type="submit" disabled={busy} className="min-h-14 w-full rounded-2xl bg-teal-800 px-5 font-black text-white disabled:opacity-50">{t("registerAndContinue")}</button>
      </form>
    </section>
  );
}

function ECDeviceStep({
  t, devices, busy, onSelect, onCreate,
}: {
  t: (key: ECTranslationKey) => string;
  devices: ECDevice[];
  busy: boolean;
  onSelect: (device: ECDevice) => void;
  onCreate: (input: Omit<ECDevice, "id" | "createdAt">) => void;
}) {
  const [selected, setSelected] = useState(devices[0]?.id ?? "");
  const [calibrationState, setCalibrationState] = useState<"RECORDED" | "NOT_RECORDED">("NOT_RECORDED");
  const [form, setForm] = useState({ deviceId: "JR-EC-001", probeId: "EC-P01", lastCalibrationDate: "", calibrationStandardUsCm: "", notes: "" });
  const [formError, setFormError] = useState("");
  function submit(event: React.FormEvent) {
    event.preventDefault();
    setFormError("");
    if (!form.deviceId.trim() || !form.probeId.trim()) {
      setFormError(t("required"));
      return;
    }
    if (calibrationState === "NOT_RECORDED") {
      onCreate({ deviceId: form.deviceId.trim(), probeId: form.probeId.trim(), notes: form.notes.trim() || undefined });
      return;
    }
    const standard = Number(form.calibrationStandardUsCm);
    const candidate: ECDevice = {
      id: "validation-only",
      deviceId: form.deviceId.trim(),
      probeId: form.probeId.trim(),
      lastCalibrationDate: form.lastCalibrationDate || undefined,
      calibrationStandardUsCm: standard,
      createdAt: new Date().toISOString(),
    };
    if (!hasRecordedCalibration(candidate)) {
      setFormError(t("invalidCalibration"));
      return;
    }
    onCreate({ deviceId: candidate.deviceId, probeId: candidate.probeId, lastCalibrationDate: candidate.lastCalibrationDate, calibrationStandardUsCm: candidate.calibrationStandardUsCm, notes: form.notes.trim() || undefined });
  }
  return (
    <section className="space-y-6">
      <StepHeading eyebrow="2 / 3" title={t("chooseDevice")} body={t("chooseDeviceBody")} />
      {devices.length > 0 && (
        <div className="rounded-3xl bg-white p-5 shadow-card sm:p-7">
          <label className="block font-bold">{t("selectDevice")}
            <select value={selected} onChange={(e) => setSelected(e.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4">
              {devices.map((item) => <option key={item.id} value={item.id}>{item.deviceId} / {item.probeId}</option>)}
            </select>
          </label>
          {selected && <CalibrationBadge t={t} device={devices.find((item) => item.id === selected)!} />}
          <button type="button" disabled={!selected || busy} onClick={() => { const item = devices.find((value) => value.id === selected); if (item) onSelect(item); }} className="mt-4 min-h-12 w-full rounded-xl bg-teal-800 px-5 font-black text-white disabled:opacity-50">{t("useDevice")}</button>
        </div>
      )}
      <form onSubmit={submit} className="space-y-5 rounded-3xl bg-white p-5 shadow-card sm:p-7">
        <div className="grid gap-4 sm:grid-cols-2">
          <ECInput label={t("deviceId")} value={form.deviceId} onChange={(value) => setForm((old) => ({ ...old, deviceId: value }))} />
          <ECInput label={t("probeId")} value={form.probeId} onChange={(value) => setForm((old) => ({ ...old, probeId: value }))} />
        </div>
        <fieldset className="rounded-2xl border border-slate-200 p-4">
          <legend className="px-1 text-sm font-black">{t("calibrationState")}</legend>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <label className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 font-bold ${calibrationState === "NOT_RECORDED" ? "border-teal-700 bg-teal-50 text-teal-950" : "border-slate-300"}`}>
              <input type="radio" name="calibration-state" checked={calibrationState === "NOT_RECORDED"} onChange={() => { setCalibrationState("NOT_RECORDED"); setFormError(""); setForm((old) => ({ ...old, lastCalibrationDate: "", calibrationStandardUsCm: "" })); }} />
              {t("calibrationNotRecorded")}
            </label>
            <label className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 font-bold ${calibrationState === "RECORDED" ? "border-teal-700 bg-teal-50 text-teal-950" : "border-slate-300"}`}>
              <input type="radio" name="calibration-state" checked={calibrationState === "RECORDED"} onChange={() => { setCalibrationState("RECORDED"); setFormError(""); }} />
              {t("calibrationRecorded")}
            </label>
          </div>
          {calibrationState === "RECORDED" && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <ECInput label={t("lastCalibration")} type="date" required={false} max={new Date().toISOString().slice(0, 10)} value={form.lastCalibrationDate} onChange={(value) => setForm((old) => ({ ...old, lastCalibrationDate: value }))} />
              <ECInput label={t("calibrationStandard")} type="number" required={false} min="0.000001" value={form.calibrationStandardUsCm} onChange={(value) => setForm((old) => ({ ...old, calibrationStandardUsCm: value }))} />
            </div>
          )}
          <p className="mt-3 text-sm text-slate-600">{calibrationState === "RECORDED" ? t("calibrationMetadataOnly") : t("calibrationCaution")}</p>
        </fieldset>
        <ECTextArea label={t("notes")} value={form.notes} onChange={(value) => setForm((old) => ({ ...old, notes: value }))} />
        {formError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-800">{formError}</p>}
        <button type="submit" disabled={busy} className="min-h-14 w-full rounded-2xl bg-teal-800 px-5 font-black text-white disabled:opacity-50">{t("saveDevice")}</button>
      </form>
    </section>
  );
}

function CalibrationBadge({ t, device }: { t: (key: ECTranslationKey) => string; device: ECDevice }) {
  const recorded = hasRecordedCalibration(device);
  return (
    <div className={`mt-4 rounded-xl border p-3 text-sm ${recorded ? "border-teal-300 bg-teal-50 text-teal-900" : "border-amber-300 bg-amber-50 text-amber-950"}`}>
      <p className="font-black">{recorded ? t("calibrationRecorded") : t("calibrationNotRecorded")}</p>
      {recorded ? <p className="mt-1">{device.lastCalibrationDate} • {device.calibrationStandardUsCm} µS/cm</p> : <p className="mt-1">{t("calibrationCaution")}</p>}
    </div>
  );
}

function ECMeasurementStep({
  t, source, device, busy, onCapture,
}: {
  t: (key: ECTranslationKey) => string;
  source: WaterSource;
  device: ECDevice;
  busy: boolean;
  onCapture: (input: { reading1RawEcUsCm: number; reading2RawEcUsCm?: number; reading3RawEcUsCm?: number; temperatureC: number; samplingMethod: ECSamplingMethod; notes?: string }, commit?: boolean) => Promise<ECRepeatabilityResult | void>;
}) {
  const [form, setForm] = useState({ temperatureC: "25.0", reading1: "", reading2: "", reading3: "", samplingMethod: "DIRECT_SOURCE" as ECSamplingMethod, notes: "" });
  const [assessment, setAssessment] = useState<ECRepeatabilityResult | null>(null);
  const [draftReady, setDraftReady] = useState(false);
  const draftKey = measurementDraftKey(source.id, device.id);
  useEffect(() => {
    queueMicrotask(() => {
      try {
        const raw = localStorage.getItem(draftKey);
        if (raw) setForm((current) => ({ ...current, ...JSON.parse(raw) }));
      } catch {
        localStorage.removeItem(draftKey);
      } finally {
        setDraftReady(true);
      }
    });
  }, [draftKey]);
  useEffect(() => {
    if (draftReady) localStorage.setItem(draftKey, JSON.stringify(form));
  }, [draftKey, draftReady, form]);
  const numberOrUndefined = (value: string) => value.trim() === "" ? undefined : Number(value);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const commit = Boolean(
      (assessment && !assessment.requiresThirdReading) ||
        (assessment?.requiresThirdReading && form.reading3.trim()),
    );
    const result = await onCapture({
      reading1RawEcUsCm: Number(form.reading1),
      reading2RawEcUsCm: numberOrUndefined(form.reading2),
      reading3RawEcUsCm: numberOrUndefined(form.reading3),
      temperatureC: Number(form.temperatureC),
      samplingMethod: form.samplingMethod,
      notes: form.notes,
    }, commit);
    if (commit && result && !result.requiresThirdReading) {
      localStorage.removeItem(draftKey);
    }
    if (result) setAssessment(result);
  }
  return (
    <section className="space-y-6">
      <StepHeading eyebrow="3 / 3" title={t("measurementTitle")} body={t("measurementIntro")} />
      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm sm:grid-cols-3">
        <div><p className="font-bold text-slate-500">{t("source")}</p><p className="mt-1 font-black">{source.sourceCode}</p><p>{source.name}</p></div>
        <div><p className="font-bold text-slate-500">{t("device")}</p><p className="mt-1 font-black">{device.deviceId}</p><p>{device.probeId}</p></div>
        <div><p className="font-bold text-slate-500">{t("recordedAt")}</p><p className="mt-1 font-black">{new Date().toLocaleString()}</p></div>
      </div>
      <CalibrationBadge t={t} device={device} />
      <form onSubmit={submit} className="space-y-5 rounded-3xl bg-white p-5 shadow-card sm:p-7">
        <div className="grid gap-4 sm:grid-cols-2">
          <ECInput label={`${t("temperature")} (°C)`} type="number" value={form.temperatureC} onChange={(value) => setForm((old) => ({ ...old, temperatureC: value }))} />
          <label className="block text-sm font-bold">{t("samplingMethod")}
            <select value={form.samplingMethod} onChange={(e) => setForm((old) => ({ ...old, samplingMethod: e.target.value as ECSamplingMethod }))} className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4">
              <option value="DIRECT_SOURCE">{t("directSource")}</option>
              <option value="SAMPLE_CONTAINER">{t("sampleContainer")}</option>
            </select>
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <ECInput label={`${t("reading1")} — ${t("rawEC")} (µS/cm)`} type="number" value={form.reading1} onChange={(value) => { setAssessment(null); setForm((old) => ({ ...old, reading1: value })); }} />
          <ECInput label={`${t("reading2")} — ${t("rawEC")} (µS/cm)`} type="number" value={form.reading2} onChange={(value) => { setAssessment(null); setForm((old) => ({ ...old, reading2: value })); }} />
        </div>
        {assessment?.requiresThirdReading && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
            <p className="flex items-center gap-2 font-black text-amber-950"><TriangleAlert className="h-5 w-5" />{t("measurementsDisagree")}</p>
            <p className="mt-1 text-sm text-amber-900">{t("takeAnother")}</p>
            <div className="mt-4"><ECInput label={`${t("reading3")} — ${t("rawEC")} (µS/cm)`} type="number" value={form.reading3} onChange={(value) => setForm((old) => ({ ...old, reading3: value }))} /></div>
          </div>
        )}
        {assessment && !assessment.requiresThirdReading && (
          <RepeatabilityPanel t={t} result={assessment} />
        )}
        <details className="rounded-xl border border-slate-200 p-3 text-sm">
          <summary className="cursor-pointer font-black">{t("provisionalRule")}</summary>
          <p className="mt-2 leading-6 text-slate-600">{t("provisionalRuleBody")}</p>
        </details>
        <ECTextArea label={t("notes")} value={form.notes} onChange={(value) => setForm((old) => ({ ...old, notes: value }))} />
        <button type="submit" disabled={busy} className="min-h-14 w-full rounded-2xl bg-teal-800 px-5 font-black text-white disabled:opacity-50">
          <Save className="mr-2 inline h-5 w-5" />
          {assessment && !assessment.requiresThirdReading ? t("saveMeasurement") : t("reviewRepeatability")}
        </button>
      </form>
      <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-violet-800"><FlaskConical className="h-4 w-4" />{t("manualBadge")}</p>
    </section>
  );
}

function RepeatabilityPanel({ t, result }: { t: (key: ECTranslationKey) => string; result: ECRepeatabilityResult }) {
  const agrees = result.status === "REPEATABLE";
  return (
    <div role="status" className={`rounded-2xl border p-4 ${agrees ? "border-teal-300 bg-teal-50 text-teal-950" : "border-amber-300 bg-amber-50 text-amber-950"}`}>
      <p className="flex items-center gap-2 font-black">{agrees ? <CheckCircle2 className="h-5 w-5" /> : <TriangleAlert className="h-5 w-5" />}{agrees ? t("measurementsAgree") : t("measurementsDisagree")}</p>
      {!agrees && <p className="mt-2 text-sm">{t("unresolvedDisagreement")}</p>}
      {result.differenceUsCm !== undefined && <div className="mt-3 grid grid-cols-2 gap-3 text-sm"><p><span className="block font-bold opacity-70">{t("difference")}</span>{formatEC(result.differenceUsCm)}</p><p><span className="block font-bold opacity-70">{t("allowedDifference")}</span>{formatEC(result.allowedDifferenceUsCm)}</p></div>}
    </div>
  );
}

function ECResult({
  t, source, record, result, online, onAgain, onHistory,
}: {
  t: (key: ECTranslationKey) => string;
  source: WaterSource;
  record: ECMeasurementRecord;
  result: ECChangeResult;
  online: boolean;
  onAgain: () => void;
  onHistory: () => void;
}) {
  const copy = result.status === "INSUFFICIENT_HISTORY"
    ? ["baselineNotEstablished", "baselineBody"] as const
    : result.status === "CHANGE_OBSERVED"
      ? ["changeObserved", "changeBody"] as const
      : result.status === "NO_UNUSUAL_EC_CHANGE_OBSERVED"
        ? ["noUnusualChange", "noUnusualChangeBody"] as const
        : ["qualityFailure", "qualityFailureBody"] as const;
  return (
    <section className="mx-auto max-w-3xl space-y-5">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-700">{t("resultTitle")}</p>
      <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-card sm:p-8">
        <span className="inline-flex rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-900">{t("manualBadge")}</span>
        <h1 className="mt-4 text-3xl font-black text-ink">{t(copy[0])}</h1>
        <p className="mt-3 leading-6 text-slate-700">{t(copy[1])}</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <ResultMetric icon={<Gauge />} label={t("currentEC")} value={formatEC(record.representativeRawEcUsCm)} />
          <ResultMetric icon={<Thermometer />} label={t("temperature")} value={`${record.temperatureC.toFixed(1)} °C`} />
          <ResultMetric icon={<Database />} label={t("measurementQuality")} value={qualityLabel(t, record.measurementQuality)} />
        </div>
        {result.historicalMedianUsCm !== undefined && (
          <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 text-sm sm:grid-cols-4">
            <p><span className="block font-bold text-slate-500">{t("historicalMedian")}</span><strong>{formatEC(result.historicalMedianUsCm)}</strong></p>
            <p><span className="block font-bold text-slate-500">{t("absoluteDifference")}</span><strong>{formatEC(result.absoluteDifferenceUsCm)}</strong></p>
            <p><span className="block font-bold text-slate-500">{t("percentageDifference")}</span><strong>{result.percentageDifference?.toFixed(1)}%</strong></p>
            <p><span className="block font-bold text-slate-500">{t("source")}</span><strong>{source.sourceCode}</strong></p>
          </div>
        )}
        <p className="mt-4 text-sm font-bold text-slate-600">{result.historicalCount} {t("historyUsed")}</p>
      </div>
      <p className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-950">{t("disclaimer")}</p>
      <p className="rounded-2xl bg-teal-50 p-4 text-sm font-bold text-teal-900">{online ? t("savedLocally") : t("offlineReady")}</p>
      <details className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
        <summary className="cursor-pointer font-black">{t("provisionalRule")}</summary>
        <p className="mt-2 leading-6 text-slate-600">{t("ruleDisclosure")}</p>
      </details>
      <div className="grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={onAgain} className="min-h-14 rounded-2xl bg-teal-800 px-5 font-black text-white"><Plus className="mr-2 inline h-5 w-5" />{t("addVisit")}</button>
        <button type="button" onClick={onHistory} className="min-h-14 rounded-2xl border border-teal-700 bg-white px-5 font-black text-teal-900"><History className="mr-2 inline h-5 w-5" />{t("viewHistory")}</button>
      </div>
    </section>
  );
}

function ResultMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-2xl border border-slate-200 p-4"><span className="text-teal-700 [&>svg]:h-5 [&>svg]:w-5">{icon}</span><p className="mt-3 text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-xl font-black">{value}</p></div>;
}

function ECHistory({
  t, sources, records, initialSourceId, onStart, onExport,
}: {
  t: (key: ECTranslationKey) => string;
  sources: WaterSource[];
  records: ECMeasurementRecord[];
  initialSourceId?: string;
  onStart: () => void;
  onExport: (sourceId?: string) => void;
}) {
  const sourceIds = useMemo(() => new Set(records.map((item) => item.sourceId)), [records]);
  const availableSources = sources.filter((item) => sourceIds.has(item.id));
  const [selectedId, setSelectedId] = useState(initialSourceId && sourceIds.has(initialSourceId) ? initialSourceId : availableSources[0]?.id ?? "");
  const selected = sources.find((item) => item.id === selectedId);
  const history = records.filter((item) => item.sourceId === selectedId).sort((a, b) => a.measuredAt.localeCompare(b.measuredAt));
  const comparisonAnchor = [...history].reverse().find(
    (item) =>
      !getECAnalysisFailureReason(item) &&
      item.dataOrigin === "MANUAL_EXPERIMENT",
  );
  return (
    <section className="space-y-5">
      <StepHeading eyebrow={t("experimentalEC")} title={t("historyTitle")} body={t("historyBody")} />
      {!availableSources.length ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center"><History className="mx-auto h-10 w-10 text-slate-400" /><p className="mt-3 font-bold text-slate-600">{t("noHistory")}</p><button type="button" onClick={onStart} className="mt-5 min-h-12 rounded-xl bg-teal-800 px-5 font-black text-white">{t("startMeasurement")}</button></div>
      ) : (
        <>
          <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm sm:flex-row sm:items-end">
            <label className="flex-1 text-sm font-bold">{t("chooseHistorySource")}<select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4">{availableSources.map((item) => <option key={item.id} value={item.id}>{item.sourceCode} — {item.name}</option>)}</select></label>
            <button type="button" onClick={() => onExport(selectedId)} className="min-h-12 rounded-xl border border-slate-300 px-4 font-bold"><Download className="mr-2 inline h-4 w-4" />{t("exportCsv")}</button>
          </div>
          {selected && <div className="rounded-3xl bg-white p-4 shadow-card sm:p-6"><div className="mb-4"><h2 className="text-xl font-black">{selected.sourceCode} — {selected.name}</h2><p className="text-sm text-slate-600">{selected.village} • {history.length} {t("visits")}</p></div><ECChart t={t} records={history} /></div>}
          <div className="space-y-3">{[...history].reverse().map((record, index) => {
            const eligibility = comparisonAnchor
              ? getECComparisonEligibility(comparisonAnchor, record)
              : { comparable: false, reason: getECAnalysisFailureReason(record) ?? "DIFFERENT_PROVENANCE" as ECComparisonExclusionReason };
            return <article key={record.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wide text-slate-500">{t("visit")} {history.length - index}</p><p className="mt-1 text-2xl font-black">{formatEC(record.representativeRawEcUsCm)}</p><p className="mt-1 text-sm text-slate-600">{formatDateTime(record.measuredAt)}</p></div><QualityBadge t={t} quality={record.measurementQuality} /></div><dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4"><div><dt className="font-bold text-slate-500">{t("temperature")}</dt><dd>{formatTemperature(record.temperatureC)}</dd></div><div><dt className="font-bold text-slate-500">{t("device")}</dt><dd>{record.deviceId} / {record.probeId}</dd></div><div><dt className="font-bold text-slate-500">{t("origin")}</dt><dd>{record.dataOrigin === "MANUAL_EXPERIMENT" ? t("manualOrigin") : record.dataOrigin}</dd></div><div><dt className="font-bold text-slate-500">{t("method")}</dt><dd>{record.samplingMethod === "DIRECT_SOURCE" ? t("directSource") : t("sampleContainer")}</dd></div></dl>{!eligibility.comparable && <p className="mt-3 rounded-xl bg-slate-100 p-3 text-sm font-bold text-slate-700">{t("excluded")}: {t(exclusionReasonKey(eligibility.reason))}</p>}</article>;
          })}</div>
        </>
      )}
      <p className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-950">{t("disclaimer")}</p>
    </section>
  );
}

function ECChart({ t, records }: { t: (key: ECTranslationKey) => string; records: ECMeasurementRecord[] }) {
  const width = 720, height = 250, padX = 48, padTop = 24, padBottom = 44;
  const anchor = [...records].reverse().find(
    (record) =>
      !getECAnalysisFailureReason(record) &&
      record.dataOrigin === "MANUAL_EXPERIMENT",
  );
  const points = records.map((record, index) => {
    const value = Number.isFinite(record.representativeRawEcUsCm)
      ? record.representativeRawEcUsCm
      : undefined;
    const eligibility = anchor
      ? getECComparisonEligibility(anchor, record)
      : { comparable: false, reason: getECAnalysisFailureReason(record) ?? "DIFFERENT_PROVENANCE" as ECComparisonExclusionReason };
    return { record, index, value, ...eligibility };
  });
  const values = points.flatMap((point) => point.value === undefined ? [] : [point.value]);
  const minimum = values.length ? Math.min(...values) : 0;
  const maximum = values.length ? Math.max(...values) : 1;
  const span = maximum === minimum ? Math.max(maximum * 0.1, 20) : maximum - minimum;
  const low = Math.max(0, minimum - span * 0.15), high = maximum + span * 0.15;
  const x = (index: number) => records.length <= 1 ? width / 2 : padX + (index / (records.length - 1)) * (width - padX * 2);
  const y = (value: number) => padTop + ((high - value) / Math.max(high - low, 1)) * (height - padTop - padBottom);
  const paths: string[] = [];
  let activePath = "";
  for (const point of points) {
    if (!point.comparable || point.value === undefined) {
      if (activePath) paths.push(activePath);
      activePath = "";
      continue;
    }
    activePath += `${activePath ? " L" : "M"}${x(point.index).toFixed(1)},${y(point.value).toFixed(1)}`;
  }
  if (activePath) paths.push(activePath);
  return (
    <figure>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={t("chartLabel")} className="h-auto w-full overflow-visible rounded-xl bg-slate-50">
        <title>{t("chartLabel")}</title><desc>{t("chartHelp")}</desc>
        {[0, 0.5, 1].map((part) => { const value = high - (high - low) * part; const yy = padTop + (height - padTop - padBottom) * part; return <g key={part}><line x1={padX} x2={width - padX} y1={yy} y2={yy} stroke="#cbd5e1" strokeDasharray="4 5" /><text x={padX - 8} y={yy + 4} textAnchor="end" fontSize="11" fill="#475569">{Math.round(value)}</text></g>; })}
        <text x="13" y="16" fontSize="11" fontWeight="700" fill="#475569">EC (µS/cm)</text>
        {paths.map((path, index) => <path key={index} d={path} fill="none" stroke="#0f766e" strokeWidth="4" strokeLinejoin="round" />)}
        {points.map((point) => point.comparable && point.value !== undefined && <g key={point.record.id}><circle cx={x(point.index)} cy={y(point.value)} r="7" fill="#0f766e" stroke="white" strokeWidth="3" /><text x={x(point.index)} y={height - 16} textAnchor="middle" fontSize="11" fill="#475569">{point.index + 1}</text></g>)}
        {points.map((point) => !point.comparable && point.value !== undefined && <g key={point.record.id}><circle cx={x(point.index)} cy={y(point.value)} r="7" fill="#94a3b8" stroke="white" strokeWidth="3" /><text x={x(point.index)} y={height - 16} textAnchor="middle" fontSize="11" fill="#475569">{point.index + 1}</text></g>)}
        {points.map((point) => !point.comparable && point.value === undefined && <g key={point.record.id} stroke="#64748b" strokeWidth="4"><line x1={x(point.index) - 6} x2={x(point.index) + 6} y1={height - padBottom - 6} y2={height - padBottom + 6} /><line x1={x(point.index) + 6} x2={x(point.index) - 6} y1={height - padBottom - 6} y2={height - padBottom + 6} /><text x={x(point.index)} y={height - 16} textAnchor="middle" fontSize="11" stroke="none" fill="#475569">{point.index + 1}</text></g>)}
      </svg>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold text-slate-700" aria-label={t("chartLegend")}>
        <span className="inline-flex items-center gap-2"><span className="h-1 w-6 rounded-full bg-teal-700" />{t("comparableMeasurements")}</span>
        <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-slate-400" />{t("notIncludedInComparison")}</span>
      </div>
      <figcaption className="mt-2 text-xs text-slate-600">{t("chartHelp")}</figcaption>
    </figure>
  );
}

function exclusionReasonKey(reason?: ECComparisonExclusionReason): ECTranslationKey {
  const keys: Record<ECComparisonExclusionReason, ECTranslationKey> = {
    INVALID_MEASUREMENT: "exclusionInvalid",
    MEASUREMENT_DISAGREEMENT: "exclusionDisagreement",
    MISSING_CALIBRATION: "exclusionCalibration",
    DIFFERENT_SOURCE: "exclusionSource",
    DIFFERENT_PROVENANCE: "exclusionProvenance",
    DIFFERENT_DEVICE: "exclusionDevice",
    DIFFERENT_SAMPLING_METHOD: "exclusionMethod",
    TEMPERATURE_OUTSIDE_ENVELOPE: "exclusionTemperature",
  };
  return keys[reason ?? "INVALID_MEASUREMENT"];
}

function formatTemperature(value: number) {
  return Number.isFinite(value) ? `${value.toFixed(1)} °C` : "—";
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "—" : date.toLocaleString();
}

function qualityLabel(t: (key: ECTranslationKey) => string, quality: ECMeasurementRecord["measurementQuality"]) {
  const keys = { REPEATABLE: "repeatable", DISAGREEMENT: "disagreement", INSUFFICIENT_DATA: "insufficientData", INVALID: "invalid" } as const;
  return t(keys[quality]);
}

function QualityBadge({ t, quality }: { t: (key: ECTranslationKey) => string; quality: ECMeasurementRecord["measurementQuality"] }) {
  const good = quality === "REPEATABLE";
  return <span className={`rounded-full border px-3 py-1 text-xs font-black ${good ? "border-teal-300 bg-teal-50 text-teal-900" : "border-slate-300 bg-slate-100 text-slate-700"}`}>{qualityLabel(t, quality)}</span>;
}

function ECInput({ label, value, onChange, type = "text", required = true, min, max }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; min?: string; max?: string }) {
  return <label className="block text-sm font-bold">{label}<input required={required} type={type} step={type === "number" ? "any" : undefined} min={min} max={max} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-4" /></label>;
}

function ECTextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block text-sm font-bold">{label}<textarea value={value} onChange={(event) => onChange(event.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-slate-300 p-4" /></label>;
}
