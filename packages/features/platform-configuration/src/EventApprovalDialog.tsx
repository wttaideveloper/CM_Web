"use client";

import { useEffect, useRef } from "react";

type EventApprovalDialogProps = {
  open: boolean;
  eventTitle: string;
  pending: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
};

/** Requires a deliberate, keyboard-accessible confirmation before approving an Event. */
export default function EventApprovalDialog({
  open,
  eventTitle,
  pending,
  error,
  onCancel,
  onConfirm,
}: EventApprovalDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel, open, pending]);

  if (!open) return null;
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#06201c]/45 p-4">
    <div role="dialog" aria-modal="true" aria-labelledby="approve-event-title" aria-describedby="approve-event-description" onKeyDown={(event) => {
      if (event.key !== "Tab") return;
      const first = cancelRef.current;
      const last = confirmRef.current;
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
      <h3 id="approve-event-title" className="text-xl font-bold text-[#06201c]">Approve event?</h3>
      <p id="approve-event-description" className="mt-3 text-sm text-[#52736a]"><span className="font-semibold text-[#284940]">{eventTitle}</span> will be marked as Approved. The Enterprise Admin will still need to publish the Event separately.</p>
      {error ? <p role="alert" className="mt-4 rounded-xl bg-[#fff1f0] p-3 text-sm font-semibold text-[#b42318]">{error}</p> : null}
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button ref={cancelRef} type="button" disabled={pending} onClick={onCancel} className="h-11 rounded-full border border-[#d7e5df] px-5 text-sm font-semibold text-[#52736a] disabled:cursor-not-allowed disabled:opacity-60">Cancel</button>
        <button ref={confirmRef} type="button" disabled={pending} onClick={onConfirm} className="h-11 rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white shadow-sm hover:bg-[#175245] focus:outline-none focus:ring-2 focus:ring-[#1f6a58] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60">{pending ? "Approving..." : "Approve Event"}</button>
      </div>
    </div>
  </div>;
}
