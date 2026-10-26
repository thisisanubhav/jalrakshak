'use client';
import { AiProcessingNotice } from './AiProcessingNotice';
import { useEffect, useRef, useState } from 'react';
import { fieldAccountId, fieldDatabase } from '@/field/workspace';
import { aiError, aiRequest } from '@/ai/client';
import { audioBase64, recordingWav } from '@/ai/audio';
import type { Translate } from '@/field/i18n';
type Draft = { audio?: Blob; transcript: string; note: string };

export function VoiceNotes({ draftKey, t, onApply, onProcessing }: { draftKey: string; t: Translate; onApply: (text: string) => boolean; onProcessing: (busy: boolean) => void }) {
  const hi = t('navHome') === 'होम', label = (en: string, hindi: string) => hi ? hindi : en;
  const [database] = useState(() => fieldDatabase());
  const [draft, setDraft] = useState<Draft>({ transcript: '', note: '' });
  const [savedDraft, setSavedDraft] = useState<Draft>();
  const [ready, setReady] = useState(false), [busy, setBusy] = useState(false), [recording, setRecording] = useState(false);
  const [error, setError] = useState(''), [storageError, setStorageError] = useState(false);
  const playback = useRef<HTMLAudioElement | null>(null);
  const [locale, setLocale] = useState<'en' | 'hi'>(hi ? 'hi' : 'en');
  const alive = useRef(true), recorder = useRef<MediaRecorder | null>(null), stream = useRef<MediaStream | null>(null), timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined), request = useRef<AbortController | null>(null);
  const writes = useRef(Promise.resolve());
  useEffect(() => {
    alive.current = true;
    database.teamState.get(draftKey).then(row => { if (!alive.current) return; const value = row?.value as Draft | undefined;
      if (value && (typeof value.transcript !== 'string' || value.transcript.length > 2000 || typeof value.note !== 'string' || value.note.length > 2000 || (value.audio && (!(value.audio instanceof Blob) || value.audio.size > 1_920_044)))) throw new Error('draft');
      if (value) setDraft(value); setReady(true);
    }).catch(() => { if (alive.current) setStorageError(true); });
    return () => { alive.current = false; request.current?.abort(); clearTimeout(timer.current); if (recorder.current?.state === 'recording') recorder.current.stop(); stream.current?.getTracks().forEach(track => track.stop()); };
  }, [database, draftKey]);
  useEffect(() => {
    if (!ready) return;
    writes.current = writes.current.then(() => database.teamState.put({ id: draftKey, value: draft })).then(() => { if (alive.current) {setStorageError(false);setSavedDraft(draft);} }).catch(() => { if (alive.current) setStorageError(true); });
  }, [database, draftKey, draft, ready]);
  useEffect(() => { onProcessing(busy || recording || (ready && savedDraft !== draft && !storageError)); }, [busy, recording, onProcessing, ready, savedDraft, draft, storageError]);
  useEffect(() => {
    if (!draft.audio) return;
    const url = URL.createObjectURL(draft.audio); if (playback.current) playback.current.src=url;
    return () => URL.revokeObjectURL(url);
  }, [draft.audio]);
  function stop() { clearTimeout(timer.current); if (recorder.current?.state === 'recording') recorder.current.stop(); stream.current?.getTracks().forEach(track => track.stop()); }
  async function record() {
    if (busy || recording || draft.audio) return;
    setBusy(true); setError('');
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') throw new Error('microphone');
      const input = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!alive.current) { input.getTracks().forEach(track => track.stop()); return; }
      stream.current = input;
      const media = new MediaRecorder(input); recorder.current = media; const chunks: Blob[] = [];
      media.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      media.onstop = async () => {
        input.getTracks().forEach(track => track.stop()); clearTimeout(timer.current);
        if (!alive.current) return;
        setRecording(false); setBusy(true);
        try { const audio = await recordingWav(new Blob(chunks, { type: media.mimeType })); if (alive.current) setDraft(old => ({ ...old, audio })); }
        catch { if (alive.current) setError(label('Recording could not be saved. Try again or type your notes.', 'रिकॉर्डिंग नहीं सहेजी जा सकी। दोबारा कोशिश करें या नोट लिखें।')); }
        finally { if (alive.current) setBusy(false); }
      };
      media.onerror = () => { stop(); setError(label('Microphone recording failed.', 'माइक्रोफ़ोन रिकॉर्डिंग विफल हुई।')); };
      media.start(1000); setRecording(true); timer.current = setTimeout(stop, 60_000);
    } catch { stream.current?.getTracks().forEach(track => track.stop()); setError(label('Microphone unavailable or permission denied. You can type below.', 'माइक्रोफ़ोन उपलब्ध नहीं या अनुमति नहीं मिली। नीचे लिख सकते हैं।')); }
    finally { if (alive.current) setBusy(false); }
  }
  async function run(action: 'transcribe' | 'note') {
    if (busy || recording) return;
    const controller = new AbortController(); request.current = controller; setBusy(true); setError('');
    try {
      const result = await aiRequest(action, { language: locale, ...(action === 'transcribe' ? { audio: await audioBase64(draft.audio!) } : { text: draft.transcript }) }, controller.signal);
      if (alive.current) setDraft(old => ({ ...old, [action === 'transcribe' ? 'transcript' : 'note']: result.text }));
    } catch (err) { if (alive.current && !controller.signal.aborted) setError(aiError(err, hi)); }
    finally { if (alive.current) setBusy(false); }
  }
  return <details className="voice-notes"><summary>{label('Voice notes & AI draft', 'वॉइस नोट और AI मसौदा')}</summary>
    <AiProcessingNotice hi={hi} />
    <p>{label('Record up to 60 seconds. Audio stays on this device until you choose Transcribe. Check every draft before using it.', '60 सेकंड तक रिकॉर्ड करें। टेक्स्ट बनाने तक ऑडियो इस उपकरण पर रहता है। इस्तेमाल से पहले मसौदा जाँचें।')}</p>
    <p>{label('Voice drafts are not included in backups or team sync. Stop recording before leaving this form.', 'वॉइस मसौदे बैकअप या टीम सिंक में शामिल नहीं हैं। फ़ॉर्म छोड़ने से पहले रिकॉर्डिंग रोकें।')}</p>
    {ready&&!storageError&&<p role="status">{savedDraft===draft?label('Voice draft saved on this device.', 'वॉइस मसौदा इस उपकरण पर सुरक्षित है।'):label('Saving voice draft…', 'वॉइस मसौदा सहेजा जा रहा है…')}</p>}
    {!fieldAccountId() && <p>{label('Sign in to use AI. Recording and manual notes work offline.', 'AI के लिए साइन इन करें। रिकॉर्डिंग और मैन्युअल नोट ऑफ़लाइन चलते हैं।')}</p>}
    <label>{label('Spoken language', 'बोली गई भाषा')}<select value={locale} disabled={busy || recording} onChange={e => setLocale(e.target.value as 'en' | 'hi')}><option value="en">English</option><option value="hi">हिन्दी</option></select></label>
    <div className="field-actions"><button type="button" disabled={!ready || busy || !!draft.audio} onClick={() => recording ? stop() : void record()}>{recording ? label('Stop recording', 'रिकॉर्डिंग रोकें') : label('Record voice note', 'वॉइस नोट रिकॉर्ड करें')}</button></div>
    {recording && <p role="status">{label('Recording… stops after 60 seconds.', 'रिकॉर्डिंग जारी… 60 सेकंड पर रुक जाएगी।')}</p>}
    {draft.audio && <><audio ref={playback} controls aria-label={label('Recorded voice note', 'रिकॉर्ड किया वॉइस नोट')} style={{ maxWidth: '100%' }} /><div className="field-actions"><button type="button" disabled={busy || !ready} onClick={() => void run('transcribe')}>{label('Transcribe recording', 'रिकॉर्डिंग से टेक्स्ट बनाएँ')}</button><button type="button" disabled={busy} onClick={() => setDraft(old => ({ ...old, audio: undefined }))}>{label('Delete recording', 'रिकॉर्डिंग हटाएँ')}</button></div></>}
    <label>{label('Transcript — edit before drafting', 'ट्रांसक्रिप्ट — मसौदे से पहले संपादित करें')}<textarea aria-label={label('Transcript — edit before drafting', 'ट्रांसक्रिप्ट — मसौदे से पहले संपादित करें')} maxLength={2000} value={draft.transcript} disabled={!ready || busy || recording} onChange={e => setDraft(old => ({ ...old, transcript: e.target.value }))} /></label>
    <div className="field-actions"><button type="button" disabled={!ready || busy || recording || !draft.transcript.trim()} onClick={() => void run('note')}>{label('Draft observation note', 'अवलोकन का मसौदा बनाएँ')}</button><button type="button" disabled={!ready || busy || recording || !draft.transcript.trim()} onClick={() => { if (!onApply(draft.transcript)) setError(label('Notes would exceed 2,000 characters. Shorten them first.', 'नोट 2,000 अक्षर से बड़े होंगे। पहले छोटे करें।')); }}>{label('Use transcript in notes', 'ट्रांसक्रिप्ट नोट में जोड़ें')}</button></div>
    {draft.note && <><label>{label('AI draft — review and edit', 'AI मसौदा — जाँचें और संपादित करें')}<textarea aria-label={label('AI draft — review and edit', 'AI मसौदा — जाँचें और संपादित करें')} value={draft.note} maxLength={2000} disabled={busy} onChange={e => setDraft(old => ({ ...old, note: e.target.value }))} /></label><p>{label('AI can be wrong. It does not assess drinking-water safety.', 'AI गलत हो सकता है। यह पेयजल सुरक्षा नहीं जाँचता।')}</p><button type="button" disabled={busy || !draft.note.trim()} onClick={() => { if (!onApply(draft.note)) setError(label('Notes would exceed 2,000 characters. Shorten them first.', 'नोट 2,000 अक्षर से बड़े होंगे। पहले छोटे करें।')); }}>{label('Use reviewed draft in notes', 'जाँचा मसौदा नोट में जोड़ें')}</button></>}
    {busy && <p role="status">{label('Processing… manual entries are preserved.', 'प्रोसेसिंग जारी… मैन्युअल नोट सुरक्षित हैं।')} <button type="button" onClick={() => request.current?.abort()}>{label('Cancel AI request', 'AI अनुरोध रद्द करें')}</button></p>}
    {storageError && <p role="alert">{label('Device could not save this voice draft. Keep the form open and copy any text you need.', 'उपकरण वॉइस मसौदा नहीं सहेज पाया। फ़ॉर्म खुला रखें और ज़रूरी टेक्स्ट कॉपी करें।')}</p>}
    {error && <p role="alert">{error}</p>}
  </details>;
}
