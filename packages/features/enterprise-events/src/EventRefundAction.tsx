"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { EventsApiError, refundEventOrder, refundEventRegistration } from "./events.service";

type RefundTarget = "registration" | "order";
type RefundState = "refund_requested" | "refunded";

/** Confirmation-gated, backend-authoritative financial refund control for one Event record. */
export default function EventRefundAction({ eventId, target, targetId, refundState }: { eventId: string; target: RefundTarget; targetId: string; refundState?: RefundState }) {
  const queryClient = useQueryClient();
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [success, setSuccess] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: () => target === "order"
      ? refundEventOrder(eventId, targetId, reason.trim() ? { reason: reason.trim() } : {})
      : refundEventRegistration(eventId, targetId, reason.trim() ? { reason: reason.trim() } : {}),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["events", "orders", eventId] }),
        queryClient.invalidateQueries({ queryKey: ["event-registrations", eventId] }),
      ]);
      setOpen(false);
      setReason("");
      setSuccess("Refund requested successfully.");
    },
  });

  useEffect(() => { if (open) window.requestAnimationFrame(() => cancelRef.current?.focus()); }, [open]);

  if (refundState) return <span className={refundState === "refunded" ? "inline-flex rounded-full bg-[#e9f4ee] px-3 py-1.5 text-xs font-bold text-[#1f6a58]" : "inline-flex rounded-full bg-[#fff4d6] px-3 py-1.5 text-xs font-bold text-[#8a5a00]"}>{refundState === "refunded" ? "Refunded" : "Refund requested"}</span>;

  return <><button type="button" onClick={() => { setSuccess(null); setOpen(true); }} disabled={mutation.isPending} className="rounded-full border border-[#b42318] px-3 py-1.5 text-xs font-bold text-[#b42318] hover:bg-[#fff7f6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b42318] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60">Refund</button>{success ? <p role="status" className="mt-2 text-xs font-semibold text-[#1f6a58]">{success}</p> : null}{open && typeof document !== "undefined" ? createPortal(<div className="fixed inset-0 z-[120] flex items-end bg-[#06201c]/35 sm:items-center sm:justify-center sm:p-5" role="presentation"><div role="dialog" aria-modal="true" aria-labelledby="event-refund-title" aria-describedby="event-refund-description" onKeyDown={(event) => { if (event.key === "Escape" && !mutation.isPending) setOpen(false); }} className="w-full rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-2xl"><h2 id="event-refund-title" className="text-lg font-bold text-[#06201c]">Refund {target === "order" ? "order" : "registration"}?</h2><p id="event-refund-description" className="mt-2 text-sm leading-6 text-[#52736a]">This will issue a financial refund. It does not replace or imply a registration cancellation.</p><label className="mt-4 block text-sm font-semibold text-[#06201c]">Reason <span className="font-normal text-[#52736a]">(optional)</span><textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} disabled={mutation.isPending} className="mt-1 w-full rounded-xl border border-[#d7e5df] p-3 font-normal outline-none focus:border-[#1f6a58] focus:ring-2 focus:ring-[#1f6a58]/20 disabled:opacity-60" /></label>{mutation.isError ? <p role="alert" className="mt-3 text-sm font-semibold text-[#b42318]">{refundErrorMessage(mutation.error)}</p> : null}<div className="mt-6 flex justify-end gap-3"><button ref={cancelRef} type="button" onClick={() => setOpen(false)} disabled={mutation.isPending} className="h-10 rounded-full border border-[#d7e5df] px-4 text-sm font-semibold text-[#52736a] disabled:opacity-60">Cancel</button><button type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending} className="h-10 rounded-full bg-[#b42318] px-4 text-sm font-bold text-white disabled:opacity-60">{mutation.isPending ? "Refunding..." : "Refund"}</button></div></div></div>, document.body) : null}</>;
}

function refundErrorMessage(error: Error): string {
  if (!(error instanceof EventsApiError)) return "Unable to issue this refund. Please try again.";
  if (error.status === 401 || error.status === 403) return "You do not have permission to issue this refund.";
  if (error.status === 404) return "This record is no longer available for refund.";
  if (error.status === 422) return error.fieldErrors.reason?.[0] ?? error.fieldErrors.amount?.[0] ?? "This refund could not be issued.";
  return "Unable to issue this refund. Please try again.";
}
