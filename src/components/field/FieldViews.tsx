import type { ReactNode } from "react";
export { VisitTrend as Trend } from "./VisitTrend";
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
    {m.correctsMeasurementId&&<p>{t('correctsVisit')}: {m.correctsMeasurementId}</p>}
    {!!m.photos?.length&&<section><h4>{t('visitPhotos')}</h4><div className="visit-photo-grid">{m.photos.map(photo=><figure key={photo.id}><img src={photo.data} alt={photo.caption||t('visitPhotos')} width={320} height={240} /><figcaption>{photo.caption}</figcaption></figure>)}</div></section>}
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

export function FieldReport({ data, sourceId, scope, t }: { data: FieldData; sourceId: string; scope: Scope; t: Translate }) {
  const { source, measurements, investigations } = sourceReport(data, sourceId, scope);
  return <section className="judge-report field-report" data-testid="field-report"><h2>{t("reportTitle")}</h2><p>{t("generatedAt")}: {new Date().toISOString()}</p><strong>{scope === "SYNTHETIC_DEMO" ? t("synthetic") : t("manual")}</strong><p>{t("limitation")}</p><p>{t("reportScope")}</p><SourceDetails source={source} t={t} />
    {source.schedule&&<p>{t('visitPlan')}: {source.schedule.date} · {source.schedule.note}</p>}
    {!!source.visitReviews?.length&&<section><h2>{t('reviewLog')}</h2><ol>{source.visitReviews.map(review=><li key={review.id}>{review.measurementId} · {t(review.state)} · {review.reviewerName} · {review.at}<p>{review.note}</p></li>)}</ol></section>}
    <h2>{t("evidence")}</h2>{measurements.map(m => <MeasurementDetails key={m.id} record={m} t={t} />)}
    <h2>{t("investigations")}</h2>{investigations.length ? investigations.map(i => <article key={i.id} className="field-card"><h3>{i.id}</h3><p>{t("status")}: {t(i.state)}</p><EvidenceLog investigation={i} t={t} /></article>) : <p>{t("noInvestigations")}</p>}
    <p>{t("local")}</p><p>{t("closedHelp")}</p>
  </section>;
}
