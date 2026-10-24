import { FieldError, type FieldData, type Locale, type Scope } from "./model";
import { translate, exclusionLabel } from "./i18n";
export function sourceReport(data: FieldData, sourceId: string, scope: Scope) {
  const source = data.sources.find(s => s.id === sourceId && s.scope === scope);
  if (!source) throw new FieldError("required");
  const measurements = data.measurements.filter(m => m.sourceId === sourceId && m.scope === scope).sort((a, b) => a.measuredAt.localeCompare(b.measuredAt));
  const ids = new Set(measurements.map(m => m.id));
  const investigations = data.investigations.filter(i => i.sourceId === sourceId && i.scope === scope && ids.has(i.measurementId));
  return { source, measurements, investigations };
}
export function csvCell(value: unknown): string {
  let text = value === undefined || value === null ? "" : String(value);
  // Whitespace/control prefixes must not bypass spreadsheet formula protection.
  // eslint-disable-next-line no-control-regex -- deliberately neutralize leading control bytes
  if (typeof value === "string" && /^[\s\u0000-\u001f]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
export function fieldCsv(data: FieldData, sourceId: string, scope: Scope, locale: Locale) {
  const { source, measurements, investigations } = sourceReport(data, sourceId, scope);
  const t = translate(locale);
  const rows: unknown[][] = [["record_type", "record_id", "timestamp", "field", "value"]];
  const row = (type: string, id: string, at: string, field: string, value: unknown) => rows.push([type, id, at, field, value]);
  row("report", source.id, "", t("limitation"), t("reportScope"));
  const sourceFields = { code: source.code, name: source.name, village: source.village, district: source.district, location: source.location, category: t(source.category), latitude: source.latitude, longitude: source.longitude, operator: source.operator, createdAt: source.createdAt, updatedAt: source.updatedAt, origin: source.scope };
  for (const [key, value] of Object.entries(sourceFields)) row("source", source.id, source.updatedAt, t(key as keyof typeof sourceFields), value);
  if(source.schedule)row('schedule',source.schedule.id,source.schedule.createdAt,t('visitPlan'),JSON.stringify(source.schedule));
  for(const review of source.visitReviews??[])row('visit_review',review.measurementId,review.at,t(review.state),JSON.stringify(review));
  for (const m of measurements) {
    const fields = { measuredAt: m.measuredAt, reading1: m.readings[0], reading2: m.readings[1], reading3: m.readings[2], temperature: m.temperature, instrument: m.instrument, device: m.device, probe: m.probe, calibrationDate: m.calibrationDate, calibrationReference: m.calibrationReference, method: t(m.method), operator: m.operator, notes: m.notes, sensorEvidence: JSON.stringify(m.sensorCaptures ?? []), origin: m.scope, representative: m.quality.representativeRawEcUsCm, count: m.comparison.count, baselineValue: m.comparison.baseline, previous: m.comparison.previous, previousDifference: m.comparison.previousDifference, difference: m.comparison.difference, percentage: m.comparison.percentage, minimumVisits: m.rule.minimumVisits, absolute: m.rule.absolute, percentageRule: m.rule.percentage, temperatureRule: m.rule.temperature };
    for (const [key, value] of Object.entries(fields)) row("measurement", m.id, m.measuredAt, t(key as keyof typeof fields), value);
    row("measurement", m.id, m.measuredAt, t("quality"), t(m.quality.status === "REPEATABLE" ? "repeatable" : "disagreement"));
    row("measurement", m.id, m.measuredAt, t("pairDifference"), JSON.stringify({ pair: m.quality.agreeingReadings, difference: m.quality.differenceUsCm, allowed: m.quality.allowedDifferenceUsCm }));
    row("measurement", m.id, m.measuredAt, t("history"), t(m.comparison.status));
    if (m.comparison.reason) row("measurement", m.id, m.measuredAt, t("excluded"), t(exclusionLabel(m.comparison.reason)));
    row("measurement", m.id, m.measuredAt, t("count"), m.comparison.includedIds.join("; "));
    for (const excluded of m.comparison.excluded) row("exclusion", m.id, m.measuredAt, excluded.id, t(exclusionLabel(excluded.reason)));
    if(m.correctsMeasurementId)row('measurement',m.id,m.measuredAt,t('correctsVisit'),m.correctsMeasurementId);
    if(m.scheduleId)row('measurement',m.id,m.measuredAt,t('visitPlan'),m.scheduleId);
    for(const photo of m.photos??[])row('photo',m.id,m.measuredAt,t('visitPhotos'),JSON.stringify({id:photo.id,caption:photo.caption}));
    if (m.investigationId) row("measurement", m.id, m.measuredAt, t("investigations"), m.investigationId);
  }
  for (const investigation of investigations) {
    row("investigation", investigation.id, investigation.events[0].at, t("status"), t(investigation.state));
    row("investigation", investigation.id, investigation.events[0].at, t("cause"), t(investigation.cause === "review" ? "reviewCause" : investigation.cause));
    for (const e of investigation.events) {
      const fields = { status: t(e.state), explanation: e.note === investigation.cause ? t(investigation.cause === "review" ? "reviewCause" : investigation.cause) : e.note, operator: e.operator, linkedMeasurement: e.measurementId, finding: t(e.finding) };
      for (const [key, value] of Object.entries(fields)) row("event", `${investigation.id}/${e.id}`, e.at, t(key as keyof typeof fields), value);
    }
  }
  return "\uFEFF" + rows.map(row => row.map(csvCell).join(",")).join("\r\n");
}
