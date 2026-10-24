"use client";
import { workspaceKey } from "@/field/workspace";
import { useEffect, useRef, useState } from 'react';
import type { FieldData } from '@/field/model';
import type { Label, Translate } from '@/field/i18n';
import { BackupError, createBackup, MAX_BACKUP_BYTES, parseBackup, planRestore, restoreBackup, type FieldBackup } from '@/field/backup';
import { readField } from '@/field/store';

export function FieldDataTools({ t, onRestored, onTraining }: { t: Translate; onRestored: () => Promise<unknown>; onTraining: () => void }) {
  const [pending, setPending] = useState<{ backup: FieldBackup; added: FieldData }>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Label>();
  const [error, setError] = useState<Label>();
  const [lastExport, setLastExport] = useState('');
  const [persistent, setPersistent] = useState<boolean>();
  const [offlineReady, setOfflineReady] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const selection = useRef({ value: 0 });
  useEffect(() => {
    let active = true;
    const tracker = selection.current;
    Promise.resolve().then(() => {
      try { if (active) setLastExport(localStorage.getItem(workspaceKey('field-last-backup-download')) ?? ''); } catch { /* Backup remains usable without preferences. */ }
    });
    navigator.storage?.persisted?.().then(value => { if (active) setPersistent(value); }).catch(() => {});
    if ('serviceWorker' in navigator) navigator.serviceWorker.ready.then(() => { if (active) setOfflineReady(true); }).catch(() => {});
    return () => { active = false; tracker.value++; };
  }, []);
  function fail(err: unknown) { setError(err instanceof BackupError ? err.code : 'storageError'); }
  async function download() {
    setBusy(true); setError(undefined); setMessage(undefined);
    try {
      const backup = await createBackup();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      if (blob.size > MAX_BACKUP_BYTES) throw new BackupError('backupTooLarge');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url;
      link.download = `jalrakshak-field-${backup.exportedAt.replace(/[:.]/g, '-')}.json`;
      document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setLastExport(backup.exportedAt); setMessage('backupDownloaded');
      try { localStorage.setItem(workspaceKey('field-last-backup-download'), backup.exportedAt); } catch { /* The downloaded file is independent of preferences. */ }
    } catch (err) { fail(err); } finally { setBusy(false); }
  }
  async function choose(file?: File) {
    const token = ++selection.current.value;
    setPending(undefined); setError(undefined); setMessage(undefined);
    if (!file) return;
    setBusy(true);
    try {
      if (file.size > MAX_BACKUP_BYTES) throw new BackupError('backupTooLarge');
      const backup = parseBackup(await file.text());
      const { added } = planRestore(await readField('MANUAL_FIELD'), backup.data);
      if (token === selection.current.value) setPending({ backup, added });
    } catch (err) { if (token === selection.current.value) fail(err); }
    finally { if (token === selection.current.value) setBusy(false); }
  }
  async function restore() {
    if (!pending) return;
    setBusy(true); setError(undefined); setMessage(undefined);
    try {
      await restoreBackup(pending.backup); setPending(undefined);
      if (input.current) input.current.value = '';
      await onRestored(); setMessage('backupRestored');
    } catch (err) { fail(err); } finally { setBusy(false); }
  }
  async function protectStorage() {
    setError(undefined); setMessage(undefined);
    try {
      const granted = await navigator.storage?.persist?.();
      setPersistent(Boolean(granted)); setMessage(granted ? 'storageProtected' : 'storageNotGranted');
    } catch { setMessage('storageNotGranted'); }
  }
  return <section className="field-card no-print" aria-labelledby="field-data-title">
    <h2 id="field-data-title">{t('dataTools')}</h2>
    <p>{t('backupHelp')}</p><p>{t('backupPrivacy')}</p>
    <p>{t('backupReminder')}</p>
    <p>{t('lastBackup')}: {lastExport ? new Date(lastExport).toLocaleString() : t('noBackup')}</p>
    <button type="button" disabled={busy} onClick={() => void download()}>{t('downloadBackup')}</button>
    <hr />
    <h3>{t('restoreBackup')}</h3><p>{t('restoreHelp')}</p>
    <label className="field-label">{t('backupFile')}<input ref={input} type="file" accept=".json,application/json" disabled={busy} onChange={event => void choose(event.target.files?.[0])} /></label>
    {pending && <div className="field-card">
      <h4>{t('restorePreview')}</h4>
      <p>{t('backupCreated')}: {new Date(pending.backup.exportedAt).toLocaleString()}</p>
      <p>{t('sources')}: {pending.added.sources.length} · {t('backupMeasurements')}: {pending.added.measurements.length} · {t('investigations')}: {pending.added.investigations.length}</p>
      <p>{t('restoreConfirmHelp')}</p>
      <div className="field-actions"><button type="button" disabled={busy} onClick={() => void restore()}>{t('confirmRestore')}</button>
      <button type="button" disabled={busy} onClick={() => { setPending(undefined); if (input.current) input.current.value = ''; }}>{t('cancel')}</button></div>
    </div>}
    {busy && <p role="status">{t('backupWorking')}</p>}
    {error && <p role="alert">{t(error)}</p>}{message && <p role="status">{t(message)}</p>}
    <hr /><h3>{t('deviceReadiness')}</h3>
    <p>{t(offlineReady ? 'offlineReady' : 'offlinePreparing')}</p>
    <p>{t(persistent ? 'storageProtected' : 'storageNotProtected')}</p>
    <button type="button" onClick={() => void protectStorage()}>{t('protectStorage')}</button>
    <details><summary>{t('optionalTraining')}</summary><p>{t('trainingSeparated')}</p>
      <button type="button" onClick={onTraining}>{t('training')}</button>
    </details>
  </section>;
}
