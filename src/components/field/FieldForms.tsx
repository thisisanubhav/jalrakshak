import { useRef, useState, type FormEvent } from "react";
import { categories, defaultRule, FieldError, validateMeasurement, validateRule, type FieldMeasurement, type FieldSource, type Investigation, type InvestigationEvent, type MeasurementInput, type Rule, type Scope, transitions } from "@/field/model";
import { evaluateECRepeatability } from "@/ec/measurement-quality";
import type { Translate } from "@/field/i18n";
import { Input, Select, TextArea } from "./FieldViews";
import { useDraft } from "./useDraft";
const optionalNumber = (s: string) => s.trim() ? Number(s) : undefined;
function ErrorMessage({ error, t }: { error: unknown; t: Translate }) { return error ? <p role="alert" className="field-error">{t(error instanceof FieldError ? error.code : "storageError")}</p> : null; }
export function SourceForm({ source, scope, t, onSave, onCancel }: { source?: FieldSource; scope: Scope; t: Translate; onSave: (source: FieldSource, expected?: string) => Promise<void>; onCancel: () => void }) {
  const draft = useDraft(`field-source-${source?.id ?? scope}`, { code: source?.code ?? "", name: source?.name ?? "", village: source?.village ?? "", district: source?.district ?? "", location: source?.location ?? "", category: source?.category ?? "HANDPUMP", latitude: source?.latitude?.toString() ?? "", longitude: source?.longitude?.toString() ?? "", operator: source?.operator ?? "" });
  const [photo, setPhoto] = useState(source?.photo); const [error, setError] = useState<unknown>(); const [busy, setBusy] = useState(false); const [gpsError, setGpsError] = useState(false); const lock = useRef(false); const id = useRef("");
  const change = (key: keyof typeof draft.form, value: string) => draft.setForm(old => ({ ...old, [key]: value }));
  async function submit(e: FormEvent) {
    e.preventDefault(); if (lock.current) return; lock.current = true; setBusy(true); setError(undefined);
    try {
      id.current ||= source?.id ?? crypto.randomUUID(); const now = new Date().toISOString();
      await onSave({ ...draft.form, id: id.current, scope, code: draft.form.code.trim(), name: draft.form.name.trim(), village: draft.form.village.trim(), district: draft.form.district.trim(), category: draft.form.category as FieldSource["category"], latitude: optionalNumber(draft.form.latitude), longitude: optionalNumber(draft.form.longitude), photo, createdAt: source?.createdAt ?? now, updatedAt: now }, source?.updatedAt);
      draft.clear();
    } catch (err) { setError(err); } finally { lock.current = false; setBusy(false); }
  }
  async function loadPhoto(file?: File) {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 1_000_000) { setError(new FieldError("invalidPhoto")); return; }
    try { const value = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); }); setPhoto(value); setError(undefined); } catch (err) { setError(err); }
  }
  if (!draft.ready) return <p>{t("loading")}</p>;
  return <form onSubmit={submit} className="field-card"><h2>{t(source ? "edit" : "add")}</h2><ErrorMessage error={error || (draft.failed ? new Error() : undefined)} t={t} /><div className="field-grid">
    {(["code", "name", "village", "district", "operator", "location"] as const).map(key => <Input key={key} label={t(key)} required={key !== "location"} maxLength={key === "location" ? 500 : 200} value={draft.form[key]} onChange={e => change(key, e.target.value)} />)}
    <Select label={t("category")} value={draft.form.category} onChange={e => change("category", e.target.value)}>{categories.map(c => <option key={c} value={c}>{t(c)}</option>)}</Select>
    {(["latitude", "longitude"] as const).map(key => <Input key={key} label={t(key)} type="number" step="any" min={key === "latitude" ? -90 : -180} max={key === "latitude" ? 90 : 180} value={draft.form[key]} onChange={e => change(key, e.target.value)} />)}
  </div><button type="button" onClick={() => { if (!navigator.geolocation) { setGpsError(true); return; } navigator.geolocation.getCurrentPosition(p => { draft.setForm(old => ({ ...old, latitude: p.coords.latitude.toString(), longitude: p.coords.longitude.toString() })); setGpsError(false); }, () => setGpsError(true), { timeout: 10000 }); }}>{t("gps")}</button>{gpsError && <p role="status">{t("gpsError")}</p>}
    <Input label={t("photo")} type="file" accept="image/png,image/jpeg,image/webp" onChange={e => void loadPhoto(e.target.files?.[0])} />
    {photo && <><img src={photo} alt={draft.form.name || t("photo")} width={160} height={120} /><button type="button" onClick={() => setPhoto(undefined)}>{t("removePhoto")}</button></>}
    <p>{t("privacy")}</p><div className="field-actions"><button disabled={busy} type="submit">{t("save")}</button><button type="button" onClick={onCancel}>{t("cancel")}</button></div>
  </form>;
}
export function MeasurementForm({ sourceId, scope, investigation, previous, t, onSave }: { sourceId: string; scope: Scope; investigation?: Investigation; previous?: FieldMeasurement; t: Translate; onSave: (input: MeasurementInput, rule: Rule) => Promise<void> }) {
  const draft = useDraft(`field-measure-${scope}-${sourceId}-${investigation?.id ?? "new"}`, { submissionId: "", measuredAt: "", reading1: "", reading2: "", reading3: "", temperature: "", instrument: previous?.instrument ?? "", device: previous?.device ?? "", probe: previous?.probe ?? "", calibrationDate: previous?.calibrationDate ?? "", calibrationReference: previous?.calibrationReference ?? "", method: previous?.method ?? "DIRECT_SOURCE", operator: previous?.operator ?? "", notes: "", minimumVisits: String(previous?.rule.minimumVisits ?? defaultRule.minimumVisits), absolute: String(previous?.rule.absolute ?? defaultRule.absolute), percentage: String(previous?.rule.percentage ?? defaultRule.percentage), envelope: String(previous?.rule.temperature ?? defaultRule.temperature) });
  const [assessment, setAssessment] = useState<ReturnType<typeof evaluateECRepeatability>>(); const [error, setError] = useState<unknown>(); const [busy, setBusy] = useState(false); const lock = useRef(false); const id = useRef("");
  function change(key: keyof typeof draft.form, value: string) { draft.setForm(old => ({ ...old, [key]: value, submissionId: "" })); setAssessment(undefined); id.current = ""; }
  function payload() {
    id.current ||= draft.form.submissionId || crypto.randomUUID();
    if (!draft.form.submissionId) draft.setForm(old => ({ ...old, submissionId: id.current }));
    const f = draft.form; const date = new Date(f.measuredAt);
    if (!Number.isFinite(date.getTime())) throw new FieldError("invalidTime");
    if (!f.reading1.trim() || !f.reading2.trim()) throw new FieldError("invalidNumber");
    const input: MeasurementInput = { id: id.current, sourceId, scope, measuredAt: date.toISOString(), readings: [Number(f.reading1), Number(f.reading2), ...(f.reading3.trim() ? [Number(f.reading3)] : [])], temperature: optionalNumber(f.temperature), instrument: f.instrument.trim(), device: f.device.trim(), probe: f.probe.trim(), calibrationDate: f.calibrationDate, calibrationReference: f.calibrationReference.trim(), method: f.method as MeasurementInput["method"], operator: f.operator.trim(), notes: f.notes, investigationId: investigation?.id };
    const rule: Rule = { minimumVisits: Number(f.minimumVisits), absolute: Number(f.absolute), percentage: Number(f.percentage), temperature: Number(f.envelope) };
    validateMeasurement(input); validateRule(rule); return { input, rule };
  }
  function review(e: FormEvent) { e.preventDefault(); setError(undefined); try { setAssessment(evaluateECRepeatability(payload().input.readings)); } catch (err) { setError(err); } }
  async function save() { if (lock.current) return; lock.current = true; setBusy(true); setError(undefined); try { const { input, rule } = payload(); await onSave(input, rule); draft.clear(); } catch (err) { setError(err); } finally { lock.current = false; setBusy(false); } }
  if (!draft.ready) return <p>{t("loading")}</p>;
  return <form className="field-card" onSubmit={review}><h2>{t(investigation ? "retest" : "measure")}</h2><p>{t("ruleHelp")}</p><ErrorMessage error={error || (draft.failed ? new Error() : undefined)} t={t} />
    <div className="field-grid"><Input label={t("measuredAt")} type="datetime-local" step="1" required value={draft.form.measuredAt} onChange={e => change("measuredAt", e.target.value)} />
      {(["reading1", "reading2", "reading3", "temperature"] as const).map(key => <Input key={key} label={t(key)} type="number" step="any" min={key === "temperature" ? -20 : 0} max={key === "temperature" ? 80 : 200000} required={key === "reading1" || key === "reading2"} value={draft.form[key]} onChange={e => change(key, e.target.value)} />)}
      {(["instrument", "device", "probe", "calibrationDate", "calibrationReference", "operator"] as const).map(key => <Input key={key} label={t(key)} type={key === "calibrationDate" ? "date" : "text"} maxLength={200} required={key === "instrument" || key === "operator"} value={draft.form[key]} onChange={e => change(key, e.target.value)} />)}
      <Select label={t("method")} value={draft.form.method} onChange={e => change("method", e.target.value)}><option value="DIRECT_SOURCE">{t("DIRECT_SOURCE")}</option><option value="SAMPLE_CONTAINER">{t("SAMPLE_CONTAINER")}</option></Select>
    </div><TextArea label={t("notes")} value={draft.form.notes} onChange={e => change("notes", e.target.value)} />
    <details><summary>{t("rules")}</summary><p>{t("thresholdHelp")}</p><div className="field-grid">{([ ["minimumVisits", "minimumVisits"], ["absolute", "absolute"], ["percentage", "percentageRule"], ["envelope", "temperatureRule"] ] as const).map(([key, label]) => <Input key={key} label={t(label)} type="number" min={key === "minimumVisits" ? 3 : 0.01} step={key === "minimumVisits" ? 1 : "any"} value={draft.form[key]} onChange={e => change(key, e.target.value)} />)}</div></details>
    <button type="submit" disabled={busy}>{t("review")}</button>
    {assessment && <section role="status"><h3>{t(assessment.status === "REPEATABLE" ? "repeatable" : "disagreement")}</h3><p>{t("pairDifference")}: {assessment.agreeingReadings?.join(", ") ?? "—"} / {assessment.differenceUsCm ?? "—"} / {assessment.allowedDifferenceUsCm ?? "—"}</p>{assessment.requiresThirdReading && <p>{t("third")}</p>}<button type="button" disabled={busy} onClick={() => void save()}>{t("save")}</button></section>}
  </form>;
}
export function InvestigationForm({ investigation: i, measurements, t, onSave }: { investigation: Investigation; measurements: FieldMeasurement[]; t: Translate; onSave: (event: InvestigationEvent) => Promise<void> }) {
  const draft = useDraft(`field-event-${i.id}-${i.events.at(-1)!.id}`, { state: String(transitions[i.state][0] ?? ""), note: "", operator: "", finding: "UNDETERMINED", measurementId: "" });
  const { state, note, operator, finding, measurementId } = draft.form;
  const setState = (value: string) => draft.setForm(old => ({ ...old, state: value }));
  const setNote = (value: string) => draft.setForm(old => ({ ...old, note: value }));
  const setOperator = (value: string) => draft.setForm(old => ({ ...old, operator: value }));
  const setFinding = (value: string) => draft.setForm(old => ({ ...old, finding: value }));
  const setMeasurementId = (value: string) => draft.setForm(old => ({ ...old, measurementId: value }));
  const [error, setError] = useState<unknown>(); const [busy, setBusy] = useState(false); const lock = useRef(false);
  if (!transitions[i.state].length) return <p>{t("closedHelp")}</p>;
  async function submit(e: FormEvent) { e.preventDefault(); if (lock.current) return; lock.current = true; setBusy(true); setError(undefined); try { await onSave({ id: crypto.randomUUID(), at: new Date().toISOString(), state: state as InvestigationEvent["state"], note: note.trim(), operator: operator.trim(), finding: finding as InvestigationEvent["finding"], measurementId: measurementId || undefined }); draft.clear(); } catch (err) { setError(err); } finally { lock.current = false; setBusy(false); } }
  return <form className="field-card" onSubmit={submit}><p>{t("followupHelp")}</p><ErrorMessage error={error || (draft.failed ? new Error() : undefined)} t={t} />
    <Select label={t("nextStatus")} value={state} onChange={e => setState(e.target.value as typeof state)}>{transitions[i.state].map(s => <option key={s} value={s}>{t(s)}</option>)}</Select>
    <Select label={t("finding")} value={finding} onChange={e => setFinding(e.target.value as typeof finding)}>{(["UNDETERMINED", "MEASUREMENT_INCONSISTENCY", "PERSISTENT_CHANGE", "CHANGE_NOT_REPRODUCED"] as const).map(f => <option key={f} value={f}>{t(f)}</option>)}</Select>
    <Select label={t("linkedMeasurement")} value={measurementId} onChange={e => setMeasurementId(e.target.value)}><option value="">{t("missing")}</option>{measurements.filter(m => m.investigationId === i.id).map(m => <option key={m.id} value={m.id}>{m.measuredAt} · {m.readings.join(" / ")}</option>)}</Select>
    <Input label={t("operator")} value={operator} onChange={e => setOperator(e.target.value)} required maxLength={200} /><TextArea label={t("explanation")} value={note} onChange={e => setNote(e.target.value)} required /><button disabled={busy || !draft.ready} type="submit">{t("update")}</button>
  </form>;
}
