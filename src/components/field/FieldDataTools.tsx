"use client";
import { encryptBackup, decryptBackup, ENCRYPTED_BACKUP_FORMAT } from '@/field/backup-encryption';
import { workspaceKey } from "@/field/workspace";
import { useEffect, useRef, useState } from 'react';
import type { FieldData } from '@/field/model';
import type { Label, Translate } from '@/field/i18n';
import { BackupError, createBackup, MAX_BACKUP_BYTES, parseBackup, planRestore, restoreBackup, type FieldBackup } from '@/field/backup';
import { readField } from '@/field/store';

export function FieldDataTools({ t, onRestored, onTraining }: { t: Translate; onRestored: () => Promise<unknown>; onTraining: () => void }) {
  const hi=t('navHome')==='होम', label=(en:string,hindi:string)=>hi?hindi:en;
  const [encrypted,setEncrypted]=useState(false), [password,setPassword]=useState(''), [confirmation,setConfirmation]=useState(''), [restorePassword,setRestorePassword]=useState('');
  const [cryptoError,setCryptoError]=useState('');
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
    setBusy(true); setError(undefined); setMessage(undefined); setCryptoError('');
    try {
      if(encrypted && (password.length<12 || password.length>256 || password!==confirmation)) {setCryptoError(label('Use 12–256 characters and matching passwords.','12–256 अक्षर और एक जैसे पासवर्ड दें।'));return;}
      const backup = await createBackup();
      const json=JSON.stringify(backup, null, 2);
      const blob = new Blob([encrypted ? await encryptBackup(json,password) : json], { type: 'application/json' });
      if (blob.size > (encrypted ? 70*1024*1024 : MAX_BACKUP_BYTES)) throw new BackupError('backupTooLarge');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url;
      link.download = `jalrakshak-${encrypted?'encrypted-':''}field-${backup.exportedAt.replace(/[:.]/g, '-')}.json`;
      document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setLastExport(backup.exportedAt); setMessage('backupDownloaded');setPassword('');setConfirmation('');
      try { localStorage.setItem(workspaceKey('field-last-backup-download'), backup.exportedAt); } catch { /* The downloaded file is independent of preferences. */ }
    } catch (err) { fail(err); } finally { setBusy(false); }
  }
  async function choose(file?: File) {
    const token = ++selection.current.value;
    setPending(undefined); setError(undefined); setMessage(undefined);setCryptoError('');
    if (!file) return;
    setBusy(true);
    try {
      if (file.size > 70*1024*1024) throw new BackupError('backupTooLarge');
      const text=await file.text();let plain=text;
      let envelope;try {envelope=JSON.parse(text);} catch {throw new BackupError('backupInvalid');}
      if(envelope?.format===ENCRYPTED_BACKUP_FORMAT) {
        try {plain=await decryptBackup(envelope,restorePassword);} catch {setCryptoError(label('Incorrect backup password or damaged encrypted file.','बैकअप पासवर्ड गलत है या एन्क्रिप्टेड फ़ाइल खराब है।'));return;}
      }
      const backup = parseBackup(plain);setRestorePassword('');
      const { added } = planRestore(await readField('MANUAL_FIELD'), backup.data);
      if (token === selection.current.value) setPending({ backup, added });
    } catch (err) { if (token === selection.current.value) fail(err); }
    finally { if (token === selection.current.value) setBusy(false); if(input.current)input.current.value=''; }
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
    <p>{t('backupHelp')}</p>
    <p>{t('lastBackup')}: {lastExport ? new Date(lastExport).toLocaleString() : t('noBackup')}</p>
    <div className="backup-download-controls">
    <label className="backup-encryption-option"><input type="checkbox" checked={encrypted} disabled={busy} onChange={e=>setEncrypted(e.target.checked)} /> <span>{label('Encrypt download with a password','डाउनलोड को पासवर्ड से एन्क्रिप्ट करें')}</span></label>
    {encrypted && <div className="field-grid backup-password-fields"><label className="field-label">{label('Backup password','बैकअप पासवर्ड')}<input type="password" autoComplete="new-password" value={password} maxLength={256} disabled={busy} onChange={e=>setPassword(e.target.value)} /></label><label className="field-label">{label('Confirm backup password','बैकअप पासवर्ड दोहराएँ')}<input type="password" autoComplete="new-password" value={confirmation} maxLength={256} disabled={busy} onChange={e=>setConfirmation(e.target.value)} /></label><p>{label('Keep this password separately. It cannot be recovered.','पासवर्ड अलग सुरक्षित रखें। इसे वापस नहीं पाया जा सकता।')}</p></div>}
    <button className="backup-download-button" type="button" disabled={busy} onClick={() => void download()}>{t('downloadBackup')}</button>
    </div>
    <details><summary>{t('backupDetails')}</summary><p>{t('backupScope')}</p><p>{t('backupPrivacy')}</p><p>{t('backupReminder')}</p></details>
    <hr />
    <h3>{t('restoreBackup')}</h3><p>{t('restoreHelp')}</p>
    <label className="field-label">{label('Restore password (encrypted files only)','रिस्टोर पासवर्ड (केवल एन्क्रिप्टेड फ़ाइलें)')}<input type="password" autoComplete="off" value={restorePassword} disabled={busy} maxLength={256} onChange={e=>setRestorePassword(e.target.value)} /></label>
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
    {cryptoError && <p role="alert">{cryptoError}</p>}
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
