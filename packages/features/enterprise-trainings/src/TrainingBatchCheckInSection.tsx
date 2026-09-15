"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { formatDetailDateTime } from "./detail-formatters";
import { batchCheckInTrainingParticipants, getTrainingBatchCheckInPreview, TrainingsApiError, type TrainingBatchCheckInPreviewItem, type TrainingBatchCheckInResponse, type TrainingBatchCheckInStatus } from "./trainings.service";

const EMPTY_PREVIEW: readonly TrainingBatchCheckInPreviewItem[] = [];

/** Backend-eligibility batch check-in: preview, select, confirm, and results. */
export default function TrainingBatchCheckInSection({ trainingId }: { trainingId: string }) {
  const queryClient = useQueryClient();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const confirmTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<TrainingBatchCheckInStatus>("confirmed");
  const [selectedEnrolmentIds, setSelectedEnrolmentIds] = useState<ReadonlySet<string>>(new Set());
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [result, setResult] = useState<{ selected: number; response: TrainingBatchCheckInResponse } | null>(null);
  const queryKey = ["trainings", "batch-check-in", trainingId, status] as const;
  const previewQuery = useQuery({ queryKey, queryFn: () => getTrainingBatchCheckInPreview(trainingId, status), enabled: isOpen && Boolean(trainingId), staleTime: 30_000, retry: 1 });
  const previewItems = previewQuery.data ?? EMPTY_PREVIEW;
  const eligibleItems = useMemo(() => previewItems.filter((item) => item.can_check_in), [previewItems]);
  const selectedItems = useMemo(() => eligibleItems.filter((item) => selectedEnrolmentIds.has(item.enrolment_id)), [eligibleItems, selectedEnrolmentIds]);

  useEffect(() => {
    const eligibleIds = new Set(eligibleItems.map((item) => item.enrolment_id));
    setSelectedEnrolmentIds((current) => {
      const retained = [...current].filter((enrolmentId) => eligibleIds.has(enrolmentId));
      return retained.length === current.size ? current : new Set(retained);
    });
  }, [eligibleItems]);

  const batchMutation = useMutation({
    mutationFn: () => batchCheckInTrainingParticipants(trainingId, { participants: selectedItems.map((item) => ({ enrolment_id: item.enrolment_id })) }),
    onSuccess: async (response) => {
      setResult({ selected: selectedItems.length, response });
      setSelectedEnrolmentIds(new Set());
      setConfirmationOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey }),
        queryClient.invalidateQueries({ queryKey: ["trainings", trainingId, "enrolments"] }),
      ]);
    },
    onError: () => {
      setConfirmationOpen(false);
      window.requestAnimationFrame(() => confirmTriggerRef.current?.focus());
    },
  });

  const closePanel = () => {
    setIsOpen(false);
    setConfirmationOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  };
  const closeConfirmation = () => {
    setConfirmationOpen(false);
    window.requestAnimationFrame(() => confirmTriggerRef.current?.focus());
  };
  const toggleSelection = (item: TrainingBatchCheckInPreviewItem) => {
    if (!item.can_check_in || batchMutation.isPending) return;
    setSelectedEnrolmentIds((current) => {
      const next = new Set(current);
      if (next.has(item.enrolment_id)) next.delete(item.enrolment_id);
      else next.add(item.enrolment_id);
      return next;
    });
  };

  return <section className="rounded-2xl border border-[#e1ebe6] bg-white p-4 shadow-sm">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold text-[#06201c]">Batch check-in</p><p className="mt-1 text-sm text-[#52736a]">Review backend-eligible enrolments, then check them in with one operation.</p></div><div className="flex gap-2"><button ref={triggerRef} type="button" onClick={() => (isOpen ? closePanel() : setIsOpen(true))} disabled={batchMutation.isPending} aria-expanded={isOpen} aria-controls="training-batch-check-in-panel" className="h-10 rounded-full border border-[#1f6a58] px-4 text-sm font-bold text-[#1f6a58] disabled:cursor-not-allowed disabled:opacity-60">Batch check-in</button></div></div>
    {isOpen ? <div id="training-batch-check-in-panel" className="mt-4 border-t border-[#edf3f0] pt-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><label className="block text-sm font-semibold text-[#31594d]">Preview status<select value={status} onChange={(event) => { setStatus(event.target.value as TrainingBatchCheckInStatus); setSelectedEnrolmentIds(new Set()); setResult(null); }} disabled={batchMutation.isPending} className="mt-1 block h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 text-sm text-[#06201c] outline-none focus:border-[#1f6a58] sm:w-48"><option value="confirmed">Confirmed</option><option value="attended">Attended</option><option value="cancelled">Cancelled</option><option value="no_show">No show</option></select></label><div className="flex flex-wrap gap-2"><button type="button" onClick={() => setSelectedEnrolmentIds(new Set(eligibleItems.map((item) => item.enrolment_id)))} disabled={eligibleItems.length === 0 || batchMutation.isPending} className="h-10 rounded-full border border-[#d7e5df] px-4 text-sm font-bold text-[#31594d] disabled:cursor-not-allowed disabled:opacity-60">Select all eligible</button><button type="button" onClick={() => setSelectedEnrolmentIds(new Set())} disabled={selectedItems.length === 0 || batchMutation.isPending} className="h-10 rounded-full border border-[#d7e5df] px-4 text-sm font-bold text-[#31594d] disabled:cursor-not-allowed disabled:opacity-60">Clear selection</button></div></div>
      <p aria-live="polite" className="mt-3 text-sm font-semibold text-[#31594d]">{selectedItems.length} selected</p>
      {previewQuery.isLoading ? <div role="status" aria-label="Loading batch check-in enrolments" className="mt-4 space-y-2"><div className="h-14 animate-pulse rounded-xl bg-[#edf3f0]" /><div className="h-14 animate-pulse rounded-xl bg-[#edf3f0]" /></div> : null}
      {previewQuery.isError ? <div className="mt-4 rounded-xl border border-[#f3d5d1] bg-[#fff7f6] px-4 py-3"><p role="alert" className="text-sm font-semibold text-[#b42318]">Unable to load batch check-in enrolments.</p><button type="button" onClick={() => void previewQuery.refetch()} className="mt-2 text-sm font-bold text-[#b42318] underline">Retry</button></div> : null}
      {previewQuery.data && previewItems.length === 0 ? <div className="mt-4 rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] px-4 py-8 text-center"><p className="font-bold text-[#06201c]">No confirmed enrolments</p><p className="mt-1 text-sm text-[#52736a]">No enrolments match this preview status.</p></div> : null}
      {previewQuery.data && previewItems.length > 0 && eligibleItems.length === 0 ? <div className="mt-4 rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] px-4 py-8 text-center"><p className="font-bold text-[#06201c]">No eligible enrolments</p><p className="mt-1 text-sm text-[#52736a]">The backend has not marked any of these enrolments eligible for check-in.</p></div> : null}
      {previewQuery.data && previewItems.length > 0 ? <div className="mt-4 grid gap-3">{previewItems.map((item) => <PreviewCard key={item.enrolment_id} item={item} checked={selectedEnrolmentIds.has(item.enrolment_id)} pending={batchMutation.isPending} onToggle={toggleSelection} />)}</div> : null}
      {batchMutation.isError ? <p role="alert" className="mt-4 rounded-xl bg-[#fff2f0] px-4 py-3 text-sm font-semibold text-[#b42318]">{getBatchCheckInErrorMessage(batchMutation.error)}</p> : null}
      {result ? <section aria-live="polite" className="mt-4 rounded-xl border border-[#d7e5df] bg-[#f9fcfa] p-4"><p className="font-bold text-[#06201c]">Batch check-in results</p><p className="mt-1 text-sm text-[#31594d]">{result.selected} selected · {result.response.succeeded} checked in · {result.response.failed} failed</p>{result.response.results.length > 0 ? <ul className="mt-3 space-y-2 text-sm text-[#31594d]">{result.response.results.map((item) => <li key={item.enrolment_id}><span className="font-semibold text-[#06201c]">{item.participant_name}</span> — {item.message || item.status}</li>)}</ul> : null}</section> : null}
      <div className="mt-4 flex flex-col gap-3 border-t border-[#edf3f0] pt-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-[#52736a]">Only enrolments marked eligible by the backend can be selected.</p><button ref={confirmTriggerRef} type="button" onClick={() => setConfirmationOpen(true)} disabled={selectedItems.length === 0 || batchMutation.isPending} className="h-10 rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">{batchMutation.isPending ? "Checking in..." : `Check in ${selectedItems.length} participant${selectedItems.length === 1 ? "" : "s"}`}</button></div>
    </div> : null}
    {confirmationOpen && typeof document !== "undefined" ? createPortal(<BatchCheckInConfirmation selectedCount={selectedItems.length} pending={batchMutation.isPending} onCancel={closeConfirmation} onConfirm={() => batchMutation.mutate()} />, document.body) : null}
  </section>;
}

function PreviewCard({ item, checked, pending, onToggle }: { item: TrainingBatchCheckInPreviewItem; checked: boolean; pending: boolean; onToggle: (item: TrainingBatchCheckInPreviewItem) => void }) {
  const id = `training-batch-check-in-${item.enrolment_id}`;
  return <article className="rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] p-4"><div className="flex items-start gap-3"><div><input id={id} type="checkbox" checked={checked} onChange={() => onToggle(item)} disabled={!item.can_check_in || pending} aria-describedby={`${id}-eligibility`} className="h-4 w-4 rounded border-[#9ab9ae] text-[#1f6a58] focus:ring-[#1f6a58] disabled:cursor-not-allowed" /><label htmlFor={id} className="sr-only">Select {item.participant_name} for batch check-in</label><span id={`${id}-eligibility`} className="sr-only">{item.eligibility_reason}</span></div><div className="min-w-0"><p className="font-bold text-[#06201c]">{item.participant_name}</p><p className="truncate text-sm text-[#52736a]">{item.participant_email}</p></div></div><div className="mt-3 grid gap-2 text-sm"><p><span className="font-semibold text-[#31594d]">Status: </span><span className="inline-flex rounded-full bg-[#edf3f0] px-2.5 py-1 text-xs font-bold text-[#31594d]">{item.status.replace(/_/g, " ")}</span></p><p><span className="font-semibold text-[#31594d]">Eligibility: </span>{item.eligibility_reason}</p><p><span className="font-semibold text-[#31594d]">Checked in: </span>{item.checked_in_at ? formatDetailDateTime(item.checked_in_at) : "—"}</p></div></article>;
}

function BatchCheckInConfirmation({ selectedCount, pending, onCancel, onConfirm }: { selectedCount: number; pending: boolean; onCancel: () => void; onConfirm: () => void }) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => { cancelRef.current?.focus(); const onEscape = (event: KeyboardEvent) => { if (event.key === "Escape" && !pending) onCancel(); }; document.addEventListener("keydown", onEscape); return () => document.removeEventListener("keydown", onEscape); }, [onCancel, pending]);
  return <div className="fixed inset-0 z-[120] flex items-end bg-[#06201c]/35 p-0 sm:items-center sm:justify-center sm:p-5" role="presentation"><div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="training-batch-check-in-confirmation-title" aria-describedby="training-batch-check-in-confirmation-description" onKeyDown={(event) => { if (event.key !== "Tab") return; const elements = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])') ?? []); const currentIndex = elements.findIndex((element) => element === document.activeElement); const nextIndex = event.shiftKey ? (currentIndex - 1 + elements.length) % elements.length : (currentIndex + 1) % elements.length; elements[nextIndex]?.focus(); event.preventDefault(); }} className="w-full rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-2xl"><h2 id="training-batch-check-in-confirmation-title" className="text-lg font-bold text-[#06201c]">Check in selected participants?</h2><p id="training-batch-check-in-confirmation-description" className="mt-2 text-sm leading-6 text-[#52736a]">Check in {selectedCount} participant{selectedCount === 1 ? "" : "s"}? This operation marks the selected attendees as checked in.</p><div className="mt-6 flex justify-end gap-3"><button ref={cancelRef} type="button" onClick={onCancel} disabled={pending} className="h-10 rounded-full border border-[#d7e5df] px-4 text-sm font-semibold text-[#52736a] disabled:opacity-60">Cancel</button><button type="button" onClick={onConfirm} disabled={pending || selectedCount === 0} className="h-10 rounded-full bg-[#1f6a58] px-4 text-sm font-bold text-white disabled:opacity-60">{pending ? "Checking in..." : "Check in participants"}</button></div></div></div>;
}

function getBatchCheckInErrorMessage(error: Error) {
  if (!(error instanceof TrainingsApiError)) return "Unable to check in the selected participants. Please try again.";
  if (error.status === 401 || error.status === 403) return "You do not have permission to check in these participants.";
  if (error.status === 404) return "This training or one of its enrolments is no longer available.";
  if (error.status === 409) return "Some selected participants can no longer be checked in. Refresh the preview and try again.";
  if (error.status === 422) return "The selected participants were not accepted for batch check-in.";
  return "Unable to check in the selected participants. Please try again.";
}
