import { useEffect, useState } from "react";
// Draft failures are visible; they never trigger deletion of saved IndexedDB data.
export function useDraft<T extends Record<string, string>>(key: string, initial: T) {
  const [form, setForm] = useState(initial);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    queueMicrotask(() => {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed: unknown = JSON.parse(raw);
          if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid draft");
          const restored = { ...initial };
          for (const name of Object.keys(initial) as (keyof T)[]) {
            const value = (parsed as Record<string, unknown>)[name as string];
            if (typeof value !== "string" || value.length > 10000) throw new Error("Invalid draft");
            restored[name] = value as T[keyof T];
          }
          setForm(restored);
        }
      } catch { setFailed(true); }
      setReady(true);
    });
    // The form is mounted with a key matching the draft key; initial is a snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => {
    if (!ready || failed) return;
    try { localStorage.setItem(key, JSON.stringify(form)); } catch { queueMicrotask(() => setFailed(true)); }
  }, [key, form, ready, failed]);
  function clear() { try { localStorage.removeItem(key); } catch { setFailed(true); } }
  return { form, setForm, ready, failed, clear };
}
