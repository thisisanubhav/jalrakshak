"use client";

import { useEffect, useRef } from "react";

export function ClickRipple() {
  const layer = useRef<HTMLDivElement>(null);
  const follower = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const ring = follower.current;
    if (!ring) return;
    const fine = matchMedia('(hover: hover) and (pointer: fine)');
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let x = 0, y = 0, interactive = false;
    function hide() {
      cancelAnimationFrame(frame); frame = 0;
      ring!.dataset.visible = 'false';
    }
    function move(event: PointerEvent) {
      const target = event.target;
      if (!fine.matches || motion.matches || event.pointerType !== 'mouse' || event.buttons ||
        (target instanceof Element && target.closest('input, textarea, select, [contenteditable], :disabled, [aria-disabled="true"], .maplibregl-canvas'))) { hide(); return; }
      x = event.clientX; y = event.clientY;
      interactive = target instanceof Element && !!target.closest('button, a[href], summary, [role="button"]');
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        ring!.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        ring!.dataset.interactive = String(interactive);
        ring!.dataset.visible = 'true';
      });
    }
    document.addEventListener('pointermove', move, {passive:true});
    document.documentElement.addEventListener('pointerleave', hide);
    document.addEventListener('pointerdown', hide, {passive:true});
    document.addEventListener('keydown', hide);
    document.addEventListener('visibilitychange', hide);
    window.addEventListener('blur', hide);
    window.addEventListener('scroll', hide, {passive:true,capture:true});
    fine.addEventListener('change', hide); motion.addEventListener('change', hide);
    return () => {
      hide();
      document.removeEventListener('pointermove', move);
      document.documentElement.removeEventListener('pointerleave', hide);
      document.removeEventListener('pointerdown', hide);
      document.removeEventListener('keydown', hide);
      document.removeEventListener('visibilitychange', hide);
      window.removeEventListener('blur', hide);
      window.removeEventListener('scroll', hide, true);
      fine.removeEventListener('change', hide); motion.removeEventListener('change', hide);
    };
  }, []);

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

  return <div ref={layer} className="jal-ripple-layer" aria-hidden="true"><span ref={follower} className="jal-cursor-follower" data-visible="false" /></div>;
}
