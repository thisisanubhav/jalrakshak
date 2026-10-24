import type { ReactNode } from "react";
import { exclusion } from "@/field/model";
import type { FieldData, FieldMeasurement, FieldSource, Investigation, Scope } from "@/field/model";
import { exclusionLabel, type Translate } from "@/field/i18n";
import { sourceReport } from "@/field/report";
export const buttonClass = "field-button";
export function Input({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label className="field-label">{label}<input {...props} /></label>;
}
export function Select({ label, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: ReactNode }) {
  return <label className="field-label">{label}<select aria-label={label} {...props}>{children}</select></label>;
}
export function TextArea({ label, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return <label className="field-label">{label}<textarea maxLength={2000} rows={3} {...props} /></label>;
}
export function Facts({ entries }: { entries: [string, ReactNode][] }) {
  return <dl className="field-facts">{entries.map(([label, value], index) => <div key={`${label}-${index}`}><dt>{label}</dt><dd>{typeof value === "number" ? Number(value.toFixed(3)) : value ?? "—"}</dd></div>)}</dl>;
}
export function SourceDetails({ source: s, t }: { source: FieldSource; t: Translate }) {
  return <Facts entries={[[t("code"), s.code], [t("name"), s.name], [t("village"), s.village], [t("district"), s.district], [t("category"), t(s.category)], [t("location"), s.location || t("missing")], [t("latitude"), s.latitude], [t("longitude"), s.longitude], [t("operator"), s.operator], [t("createdAt"), s.createdAt], [t("updatedAt"), s.updatedAt]]} />;
}
export function MeasurementDetails({ record: m, t }: { record: FieldMeasurement; t: Translate }) {
  return <article className="field-card" data-testid="field-measurement">
    <h3>{m.measuredAt}</h3><p className="field-badge">{t(m.quality.status === "REPEATABLE" ? "repeatable" : "disagreement")}</p>
    {m.quality.requiresThirdReading && <p>{t("third")}</p>}
    <p className="field-badge">{t(m.comparison.status)}</p>
    {m.comparison.reason && <p>{t(exclusionLabel(m.comparison.reason))}</p>}
    <Facts entries={[[t("reading1"), m.readings[0]], [t("reading2"), m.readings[1]], [t("reading3"), m.readings[2]], [t("representative"), m.quality.representativeRawEcUsCm], [t("pairDifference"), `${m.quality.agreeingReadings?.join(", ") ?? "—"} / ${m.quality.differenceUsCm ?? "—"} / ${m.quality.allowedDifferenceUsCm === undefined ? "—" : Number(m.quality.allowedDifferenceUsCm.toFixed(3))}`], [t("temperature"), m.temperature], [t("instrument"), m.instrument], [t("device"), m.device || t("missing")], [t("probe"), m.probe || t("missing")], [t("calibrationDate"), m.calibrationDate || t("missing")], [t("calibrationReference"), m.calibrationReference || t("missing")], [t("method"), t(m.method)], [t("operator"), m.operator], [t("notes"), m.notes || t("missing")], [t("sensorEvidence"), m.sensorCaptures?.map(c => `${c.slot + 1}: ${c.deviceId} / ${c.sessionId} / #${c.sequence} / ${c.receivedAt} / ${c.ecUsCm} µS/cm / ${c.temperatureC} °C`).join("; ") || "—"], [t("origin"), m.scope], [t("count"), `${m.comparison.count} / ${m.rule.minimumVisits}`], [t("baselineValue"), m.comparison.baseline], [t("previous"), m.comparison.previous], [t("previousDifference"), m.comparison.previousDifference], [t("difference"), m.comparison.difference], [t("percentage"), m.comparison.percentage?.toFixed(1)], [t("absolute"), m.rule.absolute], [t("percentageRule"), m.rule.percentage], [t("temperatureRule"), m.rule.temperature]]} />
    {m.comparison.excluded.length > 0 && <details><summary>{t("excluded")}</summary><ul>{m.comparison.excluded.map(e => <li key={e.id}>{e.id}: {t(exclusionLabel(e.reason))}</li>)}</ul></details>}
    <p className="field-small">{t("thresholdHelp")}</p>
  </article>;
}
export function EvidenceLog({ investigation: i, t }: { investigation: Investigation; t: Translate }) {
  return <section><h3>{t("eventLog")}</h3><ol className="field-events">{i.events.map((e, index) => <li key={e.id}>
    <strong>{t(e.state)}</strong><p><time>{e.at}</time> · {e.operator}</p>
    <p>{index === 0 && e.note === i.cause ? t(i.cause === "review" ? "reviewCause" : i.cause) : e.note}</p>
    <p>{t("finding")}: {t(e.finding)}</p>{e.measurementId && <p>{t("linkedMeasurement")}: {e.measurementId}</p>}
  </li>)}</ol></section>;
}
export function Trend({ measurements, t }: { measurements: FieldMeasurement[]; t: Translate }) {
  const visits = [...measurements].sort((a, b) => a.measuredAt.localeCompare(b.measuredAt));
  if (!visits.length) return null;
  const max = Math.max(1, ...visits.map(m => m.quality.representativeRawEcUsCm ?? 0));
  return <figure className="field-card"><figcaption>{t("trend")}</figcaption><p>{t("chartHelp")}</p>
    <svg viewBox="0 0 600 240" role="img" aria-label={t("trend")} style={{ width: "100%", height: "auto" }}>
      <title>{t("trend")}</title><desc>{t("chartHelp")}</desc><text x="8" y="16" fontSize="12">EC (µS/cm)</text>
      {[0, 0.5, 1].map(part => <g key={part}><line x1="60" x2="570" y1={200-part*160} y2={200-part*160} stroke="#94a3b8" strokeDasharray="4 5" /><text x="55" y={204-part*160} textAnchor="end" fontSize="12">{Math.round(max*part)}</text></g>)}
      {visits.map((m, i) => { const x = 70 + i / Math.max(1, visits.length - 1) * 490; const value = m.quality.representativeRawEcUsCm; const y = value === undefined ? 200 : 200 - value / max * 160; const reason = exclusion(m,m,m.rule,false); return <g key={m.id}><title>{`${m.measuredAt}: ${value ?? t("missing")} µS/cm — ${reason ? t(exclusionLabel(reason)) : t(m.comparison.status)}`}</title>{reason || value === undefined ? <path d={`M${x-5},${y-5} l10,10 m0,-10 l-10,10`} stroke="#92400e" strokeWidth="3" /> : <circle cx={x} cy={y} r="5" fill="#0d594f" />}<text x={x} y="225" textAnchor="middle" fontSize="12">{i+1}</text></g>; })}
    </svg>
    <ol>{visits.map(m => { const reason = exclusion(m,m,m.rule,false); return <li key={m.id}>{m.measuredAt}: {m.quality.representativeRawEcUsCm ?? t("missing")} µS/cm — {reason ? `${t("excluded")}: ${t(exclusionLabel(reason))}` : t(m.comparison.status)}</li>; })}</ol>
  </figure>;
}

export function FieldReport({ data, sourceId, scope, t }: { data: FieldData; sourceId: string; scope: Scope; t: Translate }) {
  const { source, measurements, investigations } = sourceReport(data, sourceId, scope);
  return <section className="judge-report field-report" data-testid="field-report"><h2>{t("reportTitle")}</h2><p>{t("generatedAt")}: {new Date().toISOString()}</p><strong>{scope === "SYNTHETIC_DEMO" ? t("synthetic") : t("manual")}</strong><p>{t("limitation")}</p><p>{t("reportScope")}</p><SourceDetails source={source} t={t} />
    <h2>{t("evidence")}</h2>{measurements.map(m => <MeasurementDetails key={m.id} record={m} t={t} />)}
    <h2>{t("investigations")}</h2>{investigations.length ? investigations.map(i => <article key={i.id} className="field-card"><h3>{i.id}</h3><p>{t("status")}: {t(i.state)}</p><EvidenceLog investigation={i} t={t} /></article>) : <p>{t("noInvestigations")}</p>}
    <p>{t("local")}</p><p>{t("closedHelp")}</p>
  </section>;
}
