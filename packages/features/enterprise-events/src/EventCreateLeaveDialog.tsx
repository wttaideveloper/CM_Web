"use client";

import { useEffect, useRef } from "react";

type Props = { open: boolean; onStay: () => void; onLeave: () => void };

/** Confirms leaving a dirty Event create workflow without using a browser confirm dialog. */
export default function EventCreateLeaveDialog({ open, onStay, onLeave }: Props) {
  const stayRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    stayRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onStay();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onStay, open]);

  if (!open) return null;
  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#06201c]/50 p-4" role="presentation">
    <div role="dialog" aria-modal="true" aria-labelledby="event-leave-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
      <h2 id="event-leave-title" className="text-xl font-bold text-[#06201c]">Leave Event creation?</h2>
      <p className="mt-2 text-sm leading-6 text-[#52736a]">Your entered information will be lost.</p>
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button ref={stayRef} type="button" onClick={onStay} className="h-11 rounded-full border border-[#d7e5df] px-5 text-sm font-bold text-[#52736a] focus:outline-none focus:ring-2 focus:ring-[#1f6a58] focus:ring-offset-2">Stay</button>
        <button type="button" onClick={onLeave} className="h-11 rounded-full bg-[#b42318] px-5 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-[#b42318] focus:ring-offset-2">Leave</button>
      </div>
    </div>
  </div>;
}
