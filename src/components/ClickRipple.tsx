"use client";

import { useEffect, useRef } from "react";

export function ClickRipple() {
  const layer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = layer.current;
    if (!host) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const timers = new Map<HTMLElement, ReturnType<typeof setTimeout>>();
    function remove(ring: HTMLElement) {
      clearTimeout(timers.get(ring));
      timers.delete(ring);
      ring.remove();
    }
    function clear() { for (const ring of timers.keys()) remove(ring); }
    function click(event: MouseEvent) {
      if (motion.matches || event.button !== 0 || event.detail === 0 || event.defaultPrevented) return;
      const target = event.target;
      if (target instanceof Element && target.closest('input, textarea, select, [contenteditable="true"], :disabled, [aria-disabled="true"]')) return;
      if (timers.size >= 5) remove(timers.keys().next().value!);
      const ring = document.createElement("span");
      ring.className = "jal-click-ripple";
      ring.style.left = `${event.clientX}px`;
      ring.style.top = `${event.clientY}px`;
      host!.appendChild(ring);
      timers.set(ring, setTimeout(() => remove(ring), 500));
    }
    document.addEventListener("click", click);
    motion.addEventListener("change", clear);
    return () => {
      document.removeEventListener("click", click);
      motion.removeEventListener("change", clear);
      clear();
    };
  }, []);

  return <div ref={layer} className="jal-ripple-layer" aria-hidden="true" />;
}
