import { useEffect, useRef, useState } from "react";
import { workspaceKey } from "@/field/workspace";
// Draft failures are visible; they never trigger deletion of saved IndexedDB data.
export function useDraft<T extends Record<string, string>>(key: string, initial: T) {
  const storageKey = workspaceKey(key);
  const [form, setForm] = useState(initial);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [restored, setRestored] = useState(false);
  const cleared = useRef(false);
  useEffect(() => {
    queueMicrotask(() => {
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const parsed: unknown = JSON.parse(raw);
          if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid draft");
          const restored = { ...initial };
          for (const name of Object.keys(initial) as (keyof T)[]) {
            const value = (parsed as Record<string, unknown>)[name as string];
            if (value === undefined) continue; // New fields use defaults in older saved drafts.
            if (typeof value !== "string" || value.length > 10000) throw new Error("Invalid draft");
            restored[name] = value as T[keyof T];
          }
          setRestored(Object.keys(initial).some(name => restored[name] !== initial[name]));
          setForm(restored);
        }
      } catch { setFailed(true); }
      setReady(true);
    });
    // The form is mounted with a key matching the draft key; initial is a snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);
  useEffect(() => {
    if (!ready || failed || cleared.current) return;
    try { localStorage.setItem(storageKey, JSON.stringify(form)); } catch { queueMicrotask(() => setFailed(true)); }
  }, [storageKey, form, ready, failed]);
  function clear() { cleared.current = true; try { localStorage.removeItem(storageKey); } catch { setFailed(true); } }
  useEffect(() => {
    if (!failed) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    addEventListener("beforeunload", warn);
    return () => removeEventListener("beforeunload", warn);
  }, [failed]);
  return { form, setForm, ready, failed, restored, clear };
}
