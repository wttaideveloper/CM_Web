"use client";

import { useEffect, useRef, useState } from "react";

/** Shows a compact, toggleable help tooltip for pointer, keyboard, and touch users. */
export function InfoTip({ id, label, children }: { id: string; label: string; children: string }) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (event.target instanceof Node && !containerRef.current?.contains(event.target)) setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
    };
  }, [open]);

  return <span ref={containerRef} className="relative inline-flex">
    <button type="button" aria-label={label} aria-expanded={open} aria-controls={id} onClick={() => setOpen((value) => !value)} className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[#52736a] hover:bg-[#eaf4ef] hover:text-[#1f6a58] focus:outline-none focus:ring-2 focus:ring-[#1f6a58]">
      <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none"><circle cx="10" cy="10" r="7.25" stroke="currentColor" strokeWidth="1.5" /><path d="M10 9v4m0-6h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
    </button>
    {open ? <span id={id} role="tooltip" className="absolute right-0 top-full z-50 mt-2 w-64 rounded-lg border border-[#dfe9e4] bg-white p-3 text-left text-xs font-medium leading-5 text-[#355a51] shadow-lg">{children}</span> : null}
  </span>;
}
