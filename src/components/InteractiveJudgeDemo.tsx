"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  FileText,
  Printer,
  RotateCcw,
  TriangleAlert,
} from "lucide-react";
import {
  loadJudgeDemoScenario,
  readJudgeDemoScenarios,
  resetJudgeDemoScenarios,
} from "@/data/database";
import {
  buildInvestigationReport,
  SCIENTIFIC_REPORT_LIMITATION,
} from "@/demo/report";
import { cloneJudgeScenario, JUDGE_DEMO_SCENARIOS } from "@/demo/scenarios";
import type { JudgeDemoScenario, JudgeScenarioId } from "@/demo/types";
import { createECCsv } from "@/ec/export";
import { compareECWithHistory, getECComparisonEligibility } from "@/ec/history";
import type { ECComparisonExclusionReason } from "@/ec/history";
import type { ECChangeResult, ECMeasurementRecord } from "@/ec/types";
import { demoT, type DemoTranslationKey } from "@/i18n/demo-translations";
import type { Locale } from "@/i18n/translations";
import { getMeasurementQualityCopy } from "@/demo/quality-copy";

type DemoView = "landing" | "scenario" | "report";
const ACTIVE_DEMO_KEY = "jalrakshak-judge-demo-v1";

const scenarioKeys: Record<
  JudgeScenarioId,
  { title: DemoTranslationKey; body: DemoTranslationKey }
> = {
  stable: { title: "stableTitle", body: "stableBody" },
  disagreement: { title: "disagreementTitle", body: "disagreementBody" },
  insufficient: { title: "insufficientTitle", body: "insufficientBody" },
  change: { title: "changeTitle", body: "changeBody" },
};

function formatEC(value?: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? `${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 }).format(value)} µS/cm`
    : "—";
}

export function InteractiveJudgeDemo({
  locale,
  online,
  onBack,
}: {
  locale: Locale;
  online: boolean;
  onBack: () => void;
}) {
  const [view, setView] = useState<DemoView>("landing");
  const [loaded, setLoaded] = useState<JudgeDemoScenario[]>([]);
  const [active, setActive] = useState<JudgeDemoScenario | null>(null);
  const [notice, setNotice] = useState("");
  const [storageError, setStorageError] = useState(false);
  const t = useCallback(
    (key: DemoTranslationKey) => demoT(locale, key),
    [locale],
  );

  const reload = useCallback(async () => {
    const scenarios = await readJudgeDemoScenarios();
    setLoaded(scenarios);
    return scenarios;
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      reload()
        .then((scenarios) => {
          const selected = localStorage.getItem(ACTIVE_DEMO_KEY);
          const restored = scenarios.find((item) => item.id === selected);
          if (restored) {
            setActive(restored);
            setView("scenario");
          }
        })
        .catch(() => setStorageError(true));
    });
  }, [reload]);

  async function loadScenario(id: JudgeScenarioId) {
    const source = JUDGE_DEMO_SCENARIOS.find((item) => item.id === id);
    if (!source) return;
    try {
      const stored = await loadJudgeDemoScenario(cloneJudgeScenario(source));
      await reload();
      localStorage.setItem(ACTIVE_DEMO_KEY, id);
      setActive(stored);
      setView("scenario");
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }

  async function reset() {
    if (!window.confirm(t("resetConfirm"))) return;
    try {
      await resetJudgeDemoScenarios();
      localStorage.removeItem(ACTIVE_DEMO_KEY);
      setActive(null);
      setLoaded([]);
      setView("landing");
      setNotice(t("resetDone"));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }

  function exportCsv(scenario: JudgeDemoScenario) {
    const csv = createECCsv(
      scenario.measurements,
      [scenario.source],
      [scenario.device],
    );
    const url = URL.createObjectURL(
      new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `jalrakshak-${scenario.source.sourceCode.toLowerCase()}-evidence.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={view === "landing" ? onBack : () => setView(view === "report" ? "scenario" : "landing")}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 font-bold text-teal-950 shadow-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          {view === "landing" ? t("backHome") : view === "report" ? t("reportBack") : t("allScenarios")}
        </button>
        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full px-3 py-2 text-xs font-black ${online ? "bg-teal-50 text-teal-900" : "bg-amber-100 text-amber-950"}`}>
            {online ? t("locallyStored") : `Offline · ${t("locallyStored")}`}
          </span>
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700"
          >
            <RotateCcw className="h-4 w-4" /> {t("resetScenarios")}
          </button>
        </div>
      </div>

      {storageError && (
        <p role="alert" className="no-print rounded-2xl border border-red-300 bg-red-50 p-4 font-bold text-red-900">
          This browser could not save the isolated demo snapshot. Check browser storage and retry.
        </p>
      )}
      {notice && <p role="status" className="no-print rounded-xl bg-teal-50 p-3 font-bold text-teal-900">{notice}</p>}

      {view === "landing" && (
        <DemoLanding t={t} loaded={loaded} onLoad={loadScenario} />
      )}
      {view === "scenario" && active && (
        <ScenarioView
          t={t}
          locale={locale}
          scenario={active}
          onReport={() => setView("report")}
          onExport={() => exportCsv(active)}
        />
      )}
      {view === "report" && active && (
        <InvestigationReport t={t} locale={locale} scenario={active} />
      )}
    </div>
  );
}

function DemoLanding({
  t,
  loaded,
  onLoad,
}: {
  t: (key: DemoTranslationKey) => string;
  loaded: JudgeDemoScenario[];
  onLoad: (id: JudgeScenarioId) => void;
}) {
  const loadedIds = new Set(loaded.map((item) => item.id));
  return (
    <section className="space-y-6">
      <header className="rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-card sm:p-10">
        <span className="inline-flex rounded-full bg-violet-100 px-3 py-2 text-xs font-black uppercase tracking-wider text-violet-900">
          {t("syntheticBadge")}
        </span>
        <h1 className="mt-5 text-4xl font-black tracking-tight text-teal-950 sm:text-6xl">{t("title")}</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-700">{t("subtitle")}</p>
        <p className="mt-5 max-w-3xl rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-950">
          {t("syntheticNotice")}
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        {JUDGE_DEMO_SCENARIOS.map((scenario) => {
          const keys = scenarioKeys[scenario.id];
          const current = scenario.measurements.at(-1);
          return (
            <article key={scenario.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <span className="text-sm font-black tracking-[0.2em] text-teal-700">0{scenario.sequence}</span>
                {loadedIds.has(scenario.id) && <CheckCircle2 aria-label={t("locallyStored")} className="h-5 w-5 text-teal-700" />}
              </div>
              <h2 className="mt-4 text-2xl font-black text-teal-950">{t(keys.title)}</h2>
              <p className="mt-2 min-h-12 leading-6 text-slate-600">{t(keys.body)}</p>
              <div className="mt-5 flex items-end justify-between rounded-2xl bg-slate-50 p-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{scenario.source.sourceCode}</p>
                  <p className="mt-1 text-2xl font-black text-slate-900">{formatEC(current?.representativeRawEcUsCm)}</p>
                </div>
                <MiniPreview scenario={scenario} />
              </div>
              <button
                type="button"
                onClick={() => onLoad(scenario.id)}
                className="mt-5 min-h-12 w-full rounded-xl bg-teal-800 px-5 font-black text-white"
              >
                {loadedIds.has(scenario.id) ? t("exploreScenario") : t("loadScenario")}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function MiniPreview({ scenario }: { scenario: JudgeDemoScenario }) {
  const values = scenario.measurements.flatMap((item) =>
    Number.isFinite(item.representativeRawEcUsCm) ? [item.representativeRawEcUsCm as number] : [],
  );
  if (scenario.id === "disagreement") return <TriangleAlert className="h-10 w-10 text-amber-600" />;
  const low = Math.min(...values);
  const high = Math.max(...values);
  const span = Math.max(high - low, 1);
  const points = values.map((value, index) => `${index * (60 / Math.max(values.length - 1, 1))},${28 - ((value - low) / span) * 24}`).join(" ");
  return <svg width="64" height="32" aria-hidden="true"><polyline points={points} fill="none" stroke="#0f766e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function ScenarioView({
  t,
  locale,
  scenario,
  onReport,
  onExport,
}: {
  t: (key: DemoTranslationKey) => string;
  locale: Locale;
  scenario: JudgeDemoScenario;
  onReport: () => void;
  onExport: () => void;
}) {
  const records = [...scenario.measurements].sort((a, b) => a.measuredAt.localeCompare(b.measuredAt));
  const current = records.at(-1)!;
  const result = compareECWithHistory(current, records);
  const keys = scenarioKeys[scenario.id];
  const quality = getMeasurementQualityCopy(locale, current.measurementQuality);
  const resultCopy = getResultCopy(t, result);
  return (
    <section className="space-y-5" data-testid="judge-scenario-detail">
      <header className="rounded-[2rem] bg-white p-6 shadow-card sm:p-8">
        <span className="inline-flex rounded-full bg-violet-100 px-3 py-2 text-xs font-black uppercase tracking-wider text-violet-900">{t("syntheticBadge")}</span>
        <p className="mt-5 text-sm font-black tracking-[0.2em] text-teal-700">0{scenario.sequence} · {scenario.source.sourceCode}</p>
        <h1 className="mt-2 text-4xl font-black text-teal-950">{t(keys.title)}</h1>
        <p className="mt-3 max-w-3xl text-lg leading-7 text-slate-700">{t(keys.body)}</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
        <article className="rounded-3xl bg-white p-5 shadow-card sm:p-7">
          <h2 className="text-xl font-black text-teal-950">{t("sourceHistory")}</h2>
          <p className="mt-1 text-sm text-slate-600">{scenario.source.name} · {scenario.source.village}</p>
          <div className="mt-5"><DemoHistoryChart t={t} records={records} /></div>
        </article>
        <div className="space-y-4">
          <article className="rounded-3xl bg-white p-5 shadow-card">
            <p className="text-xs font-black uppercase tracking-wide text-teal-700">{t("measurementQuality")}</p>
            <h2 className="mt-2 text-2xl font-black text-slate-900">{quality.label}</h2>
            <p className="mt-2 leading-6 text-slate-600">{quality.body}</p>
          </article>
          <article className="rounded-3xl border border-teal-200 bg-teal-50 p-5">
            <p className="text-xs font-black uppercase tracking-wide text-teal-800">{t("whyItMatters")}</p>
            <h2 className="mt-2 text-2xl font-black text-teal-950">{resultCopy.title}</h2>
            <p className="mt-2 leading-6 text-teal-950">{resultCopy.body}</p>
            {result.historicalMedianUsCm !== undefined && (
              <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
                <Metric label={t("baseline")} value={formatEC(result.historicalMedianUsCm)} />
                <Metric label={t("absoluteChange")} value={formatEC(result.absoluteDifferenceUsCm)} />
                <Metric label={t("percentageChange")} value={`${result.percentageDifference?.toFixed(1)}%`} />
              </dl>
            )}
          </article>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label={t("sourceHistory")}>
        {records.map((record, index) => (
          <article key={record.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">{index === records.length - 1 ? t("latest") : `${t("visit")} ${index + 1}`}</p>
              <span className="rounded-full bg-violet-50 px-2 py-1 text-[10px] font-black text-violet-900">{t("syntheticBadge")}</span>
            </div>
            <p className="mt-3 text-2xl font-black text-teal-950">{formatEC(record.representativeRawEcUsCm)}</p>
            <p className="mt-1 text-sm text-slate-600">{record.temperatureC.toFixed(1)} °C · {getMeasurementQualityCopy(locale, record.measurementQuality).label}</p>
          </article>
        ))}
      </div>

      {scenario.id === "disagreement" && (
        <article className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-950">
          <h2 className="flex items-center gap-2 text-xl font-black"><TriangleAlert className="h-5 w-5" />{t("thirdReading")}</h2>
          <p className="mt-2 leading-6">{t("thirdReadingBody")}</p>
        </article>
      )}

      <details className="rounded-2xl border border-slate-200 bg-white p-5">
        <summary className="cursor-pointer font-black text-teal-950">{t("provisionalRule")}</summary>
        <p className="mt-3 leading-6 text-slate-700">{t("ruleBody")}</p>
      </details>
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-black text-teal-950">{t("calibration")}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-700">{t("calibrationBody")}</p>
        <p className="mt-2 text-sm font-bold text-slate-700">{scenario.device.deviceId} / {scenario.device.probeId} · {scenario.device.lastCalibrationDate} · {scenario.device.calibrationStandardUsCm} µS/cm</p>
      </div>
      <p className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-950">{SCIENCE_COPY[locale]}</p>
      <p className="rounded-2xl bg-slate-100 p-4 text-sm font-bold leading-6 text-slate-700">{t("offlineBody")}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={onReport} className="min-h-14 rounded-2xl bg-teal-800 px-5 font-black text-white"><FileText className="mr-2 inline h-5 w-5" />{t("generateReport")}</button>
        <button type="button" onClick={onExport} className="min-h-14 rounded-2xl border border-teal-700 bg-white px-5 font-black text-teal-900"><Download className="mr-2 inline h-5 w-5" />{t("exportCsv")}</button>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-white/70 p-3"><dt className="text-xs font-bold text-slate-600">{label}</dt><dd className="mt-1 font-black text-slate-900">{value}</dd></div>;
}

function getResultCopy(t: (key: DemoTranslationKey) => string, result: ECChangeResult) {
  if (result.status === "CHANGE_OBSERVED") return { title: t("changeObserved"), body: t("changeResult") };
  if (result.status === "NO_UNUSUAL_EC_CHANGE_OBSERVED") return { title: t("noUnusual"), body: t("stableResult") };
  if (result.status === "INSUFFICIENT_HISTORY") return { title: t("baselineMissing"), body: t("insufficientResult") };
  return { title: t("qualityBlocked"), body: t("disagreementResult") };
}

const SCIENCE_COPY = {
  en: SCIENTIFIC_REPORT_LIMITATION,
  hi: "EC किसी विशेष संदूषक की पहचान या पीने के पानी की सुरक्षा तय नहीं करता। किसी चिंताजनक बदलाव के लिए माप सत्यापन और जहाँ आवश्यक हो, प्रयोगशाला पुष्टि चाहिए।",
} as const;

function DemoHistoryChart({
  t,
  records,
}: {
  t: (key: DemoTranslationKey) => string;
  records: ECMeasurementRecord[];
}) {
  const width = 720, height = 260, left = 54, right = 24, top = 28, bottom = 48;
  const anchor = records.at(-1)!;
  const points = records.map((record, index) => ({
    record,
    index,
    value: Number.isFinite(record.representativeRawEcUsCm) ? record.representativeRawEcUsCm : undefined,
    comparable: getECComparisonEligibility(anchor, record).comparable,
  }));
  const values = points.flatMap((point) => point.value === undefined ? [] : [point.value]);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 1;
  const span = Math.max(max - min, 20);
  const low = Math.max(0, min - span * 0.15), high = max + span * 0.15;
  const x = (index: number) => records.length === 1 ? width / 2 : left + (index / (records.length - 1)) * (width - left - right);
  const y = (value: number) => top + ((high - value) / (high - low)) * (height - top - bottom);
  const comparable = points.filter((point) => point.comparable && point.value !== undefined);
  const path = comparable.map((point, index) => `${index ? "L" : "M"}${x(point.index)},${y(point.value!)}`).join(" ");
  return (
    <figure>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={t("chartLabel")} className="w-full rounded-2xl bg-slate-50">
        <title>{t("chartLabel")}</title>
        {[0, 0.5, 1].map((part) => {
          const yy = top + part * (height - top - bottom);
          const value = high - part * (high - low);
          return <g key={part}><line x1={left} x2={width - right} y1={yy} y2={yy} stroke="#cbd5e1" strokeDasharray="4 5" /><text x={left - 8} y={yy + 4} textAnchor="end" fontSize="11" fill="#475569">{Math.round(value)}</text></g>;
        })}
        <text x="14" y="18" fontSize="11" fontWeight="700" fill="#475569">EC (µS/cm)</text>
        {path && <path d={path} fill="none" stroke="#0f766e" strokeWidth="4" strokeLinejoin="round" />}
        {points.map((point) => point.value === undefined ? (
          <g key={point.record.id} stroke="#d97706" strokeWidth="4"><line x1={x(point.index) - 6} x2={x(point.index) + 6} y1={height - bottom - 8} y2={height - bottom + 4} /><line x1={x(point.index) + 6} x2={x(point.index) - 6} y1={height - bottom - 8} y2={height - bottom + 4} /></g>
        ) : (
          <g key={point.record.id}>
            <circle cx={x(point.index)} cy={y(point.value)} r="8" fill={point.comparable ? "#0f766e" : "#94a3b8"} stroke="white" strokeWidth="3"><title>{`${t("visit")} ${point.index + 1}: ${formatEC(point.value)}`}</title></circle>
            <text x={x(point.index)} y={height - 17} textAnchor="middle" fontSize="11" fill="#475569">V{point.index + 1}</text>
          </g>
        ))}
      </svg>
      <figcaption className="mt-3 flex flex-wrap gap-4 text-xs font-bold text-slate-700">
        <span className="inline-flex items-center gap-2"><span className="h-1 w-6 rounded bg-teal-700" />{t("comparable")}</span>
        <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-slate-400" />{t("excluded")}</span>
      </figcaption>
    </figure>
  );
}

function InvestigationReport({
  t,
  locale,
  scenario,
}: {
  t: (key: DemoTranslationKey) => string;
  locale: Locale;
  scenario: JudgeDemoScenario;
}) {
  const report = useMemo(() => buildInvestigationReport(scenario), [scenario]);
  return (
    <section className="judge-report rounded-[2rem] bg-white p-5 shadow-card sm:p-9">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5">
        <div><p className="text-sm font-black uppercase tracking-[0.2em] text-teal-700">JalRakshak</p><h1 className="mt-2 text-3xl font-black text-teal-950">{t("reportTitle")}</h1><p className="mt-2 font-bold text-red-800">{t("reportNotCertificate")}</p></div>
        <span className="rounded-full bg-violet-100 px-3 py-2 text-xs font-black text-violet-900">{t("syntheticBadge")}</span>
      </div>
      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
        <Metric label={t("reportId")} value={report.reportId} />
        <Metric label={t("generated")} value={new Date(report.generatedAt).toLocaleString(locale === "hi" ? "hi-IN" : "en-IN")} />
        <Metric label={t("sourceContext")} value={`${scenario.source.sourceCode} · ${scenario.source.name}`} />
        <Metric label={t("deviceProbe")} value={`${scenario.device.deviceId} / ${scenario.device.probeId}`} />
        <Metric label={t("calibrationState")} value={`${t("recorded")} · ${scenario.device.lastCalibrationDate} · ${scenario.device.calibrationStandardUsCm} µS/cm`} />
        <Metric label={t("origin")} value="SYNTHETIC_DEMO" />
      </dl>
      <div className="mt-7 overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead><tr className="border-b-2 border-teal-900 text-slate-700"><th className="p-2">{t("visit")}</th><th className="p-2">{t("generated")}</th><th className="p-2">{t("rawReadings")}</th><th className="p-2">{t("representative")}</th><th className="p-2">{t("temperature")}</th><th className="p-2">{t("quality")}</th><th className="p-2">{t("comparisonUse")}</th></tr></thead>
          <tbody>{report.visits.map(({ record, includedInComparison, exclusionReason }, index) => <tr key={record.id} className="border-b border-slate-200"><td className="p-2 font-bold">{index + 1}</td><td className="p-2">{new Date(record.measuredAt).toLocaleDateString(locale === "hi" ? "hi-IN" : "en-IN")}</td><td className="p-2">{formatEC(record.reading1RawEcUsCm)} / {formatEC(record.reading2RawEcUsCm)}{record.reading3RawEcUsCm !== undefined ? ` / ${formatEC(record.reading3RawEcUsCm)}` : ""}</td><td className="p-2 font-bold">{formatEC(record.representativeRawEcUsCm)}</td><td className="p-2">{record.temperatureC.toFixed(1)} °C</td><td className="p-2">{getMeasurementQualityCopy(locale, record.measurementQuality).label}</td><td className="p-2">{includedInComparison ? t("included") : exclusionReasonText(locale, exclusionReason)}</td></tr>)}</tbody>
        </table>
      </div>
      <div className="mt-6 rounded-2xl bg-teal-50 p-5"><h2 className="font-black text-teal-950">{getResultCopy(t, report.comparison).title}</h2><p className="mt-2 text-sm leading-6 text-teal-950">{getResultCopy(t, report.comparison).body}</p></div>
      <div className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 p-5"><h2 className="font-black text-amber-950">{t("scientificLimitations")}</h2><p className="mt-2 text-sm leading-6 text-amber-950">{SCIENCE_COPY[locale]}</p></div>
      <button type="button" onClick={() => window.print()} className="no-print mt-6 min-h-14 w-full rounded-2xl bg-teal-800 px-5 font-black text-white"><Printer className="mr-2 inline h-5 w-5" />{t("printReport")}</button>
    </section>
  );
}

function exclusionReasonText(
  locale: Locale,
  reason?: ECComparisonExclusionReason,
) {
  const text: Record<Locale, Record<ECComparisonExclusionReason, string>> = {
    en: {
      INVALID_MEASUREMENT: "Not included: invalid measurement",
      MEASUREMENT_DISAGREEMENT: "Not included: measurement disagreement",
      MISSING_CALIBRATION: "Not included: calibration metadata missing",
      DIFFERENT_SOURCE: "Not included: different source",
      DIFFERENT_PROVENANCE: "Not included: different data provenance",
      DIFFERENT_DEVICE: "Not included: different device or probe",
      DIFFERENT_SAMPLING_METHOD: "Not included: different measurement method",
      TEMPERATURE_OUTSIDE_ENVELOPE: "Not included: temperature context differs",
    },
    hi: {
      INVALID_MEASUREMENT: "शामिल नहीं: अमान्य माप",
      MEASUREMENT_DISAGREEMENT: "शामिल नहीं: मापों में असहमति",
      MISSING_CALIBRATION: "शामिल नहीं: कैलिब्रेशन जानकारी गायब",
      DIFFERENT_SOURCE: "शामिल नहीं: अलग स्रोत",
      DIFFERENT_PROVENANCE: "शामिल नहीं: अलग डेटा मूल",
      DIFFERENT_DEVICE: "शामिल नहीं: अलग डिवाइस या प्रोब",
      DIFFERENT_SAMPLING_METHOD: "शामिल नहीं: अलग माप विधि",
      TEMPERATURE_OUTSIDE_ENVELOPE: "शामिल नहीं: तापमान संदर्भ अलग",
    },
  };
  return reason ? text[locale][reason] : "—";
}
