"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { formatAttendanceAuditDateTime } from "./event-detail-formatters";
import {
  batchCheckInEventParticipants,
  getEventBatchCheckInPreview,
  type EventBatchCheckInPreviewItem,
  type EventBatchCheckInResponse,
  type EventBatchCheckInStatus,
  EventsApiError,
} from "./events.service";

const COPY = {
  title: "Batch check-in",
  description: "Review backend-eligible participants, then check them in with one operation.",
  open: "Batch check-in",
  selectAll: "Select all eligible",
  clear: "Clear selection",
  select: "Select",
  participant: "Participant",
  email: "Email",
  status: "Status",
  eligibility: "Eligibility",
  checkedIn: "Checked in",
  noConfirmed: "No confirmed participants",
  noEligible: "No eligible participants",
  retry: "Retry",
  confirmTitle: "Check in selected participants?",
  confirmDescription: "This operation marks the selected attendees as checked in.",
  cancel: "Cancel",
  confirm: "Check in participants",
  checkingIn: "Checking in...",
};

const EMPTY_BATCH_CHECK_IN_PREVIEW: readonly EventBatchCheckInPreviewItem[] = [];

/** Renders the backend-authoritative batch check-in preview, selection, confirmation, and results. */
export default function EventBatchCheckInSection({ eventId, enabled, timeZone }: { eventId: string; enabled: boolean; timeZone: string }) {
  const queryClient = useQueryClient();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const confirmTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<EventBatchCheckInStatus>("confirmed");
  const [selectedRegistrationIds, setSelectedRegistrationIds] = useState<ReadonlySet<string>>(new Set());
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [result, setResult] = useState<{ selected: number; response: EventBatchCheckInResponse } | null>(null);
  const queryKey = ["events", "batch-check-in", eventId, status] as const;
  const previewQuery = useQuery({ queryKey, queryFn: () => getEventBatchCheckInPreview(eventId, status), enabled: isOpen && enabled && Boolean(eventId), staleTime: 30_000, retry: 1 });
  const previewItems = previewQuery.data ?? EMPTY_BATCH_CHECK_IN_PREVIEW;
  const eligibleItems = useMemo(() => previewItems.filter((item) => item.can_check_in), [previewItems]);
  const selectedItems = useMemo(() => eligibleItems.filter((item) => selectedRegistrationIds.has(item.registration_id)), [eligibleItems, selectedRegistrationIds]);

  useEffect(() => {
    const eligibleIds = new Set(eligibleItems.map((item) => item.registration_id));
    setSelectedRegistrationIds((current) => {
      const retainedRegistrationIds = [...current].filter((registrationId) => eligibleIds.has(registrationId));
      if (retainedRegistrationIds.length === current.size) {
        return current;
      }

      return new Set(retainedRegistrationIds);
    });
  }, [eligibleItems]);

  const batchMutation = useMutation({
    mutationFn: () => batchCheckInEventParticipants(eventId, { participants: selectedItems.map((item) => ({ registration_id: item.registration_id })) }),
    onSuccess: async (response) => {
      setResult({ selected: selectedItems.length, response });
      setSelectedRegistrationIds(new Set());
      setConfirmationOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey }),
        queryClient.invalidateQueries({ queryKey: ["event-attendance", eventId] }),
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
  const toggleSelection = (item: EventBatchCheckInPreviewItem) => {
    if (!item.can_check_in || batchMutation.isPending) return;
    setSelectedRegistrationIds((current) => {
      const next = new Set(current);
      if (next.has(item.registration_id)) next.delete(item.registration_id);
      else next.add(item.registration_id);
      return next;
    });
  };
  const selectAllEligible = () => setSelectedRegistrationIds(new Set(eligibleItems.map((item) => item.registration_id)));
  const clearSelection = () => setSelectedRegistrationIds(new Set());

  return <section className="rounded-2xl border border-[#e1ebe6] bg-white p-4 shadow-sm">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold text-[#06201c]">{COPY.title}</p><p className="mt-1 text-sm text-[#52736a]">{COPY.description}</p></div><button ref={triggerRef} type="button" onClick={() => setIsOpen((current) => !current)} disabled={!enabled || batchMutation.isPending} aria-expanded={isOpen} aria-controls="event-batch-check-in-panel" className="h-10 rounded-full border border-[#1f6a58] px-4 text-sm font-bold text-[#1f6a58] disabled:cursor-not-allowed disabled:opacity-60">{COPY.open}</button></div>
    {isOpen ? <div id="event-batch-check-in-panel" className="mt-4 border-t border-[#edf3f0] pt-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><label className="block text-sm font-semibold text-[#31594d]">Preview status<select value={status} onChange={(event) => { setStatus(event.target.value as EventBatchCheckInStatus); clearSelection(); setResult(null); }} disabled={batchMutation.isPending} className="mt-1 block h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 text-sm text-[#06201c] outline-none focus:border-[#1f6a58] sm:w-48"><option value="confirmed">Confirmed</option><option value="attended">Attended</option><option value="cancelled">Cancelled</option><option value="no_show">No show</option></select></label><div className="flex flex-wrap gap-2"><button type="button" onClick={selectAllEligible} disabled={eligibleItems.length === 0 || batchMutation.isPending} aria-label="Select all eligible participants" className="h-10 rounded-full border border-[#d7e5df] px-4 text-sm font-bold text-[#31594d] disabled:cursor-not-allowed disabled:opacity-60">{COPY.selectAll}</button><button type="button" onClick={clearSelection} disabled={selectedItems.length === 0 || batchMutation.isPending} className="h-10 rounded-full border border-[#d7e5df] px-4 text-sm font-bold text-[#31594d] disabled:cursor-not-allowed disabled:opacity-60">{COPY.clear}</button></div></div>
      <p aria-live="polite" className="mt-3 text-sm font-semibold text-[#31594d]">{selectedItems.length} selected</p>
      {previewQuery.isLoading ? <PreviewSkeleton /> : null}
      {previewQuery.isError ? <ErrorState onRetry={() => void previewQuery.refetch()} /> : null}
      {previewQuery.data && previewItems.length === 0 ? <EmptyState title={COPY.noConfirmed} description="No participants match this preview status." /> : null}
      {previewQuery.data && previewItems.length > 0 && eligibleItems.length === 0 ? <EmptyState title={COPY.noEligible} description="The backend has not marked any of these participants eligible for check-in." /> : null}
      {previewQuery.data && previewItems.length > 0 ? <PreviewList items={previewItems} selectedRegistrationIds={selectedRegistrationIds} pending={batchMutation.isPending} timeZone={timeZone} onToggle={toggleSelection} /> : null}
      {batchMutation.isError ? <p role="alert" className="mt-4 rounded-xl bg-[#fff2f0] px-4 py-3 text-sm font-semibold text-[#b42318]">{getBatchCheckInErrorMessage(batchMutation.error)}</p> : null}
      {result ? <BatchResultSummary result={result} /> : null}
      <div className="mt-4 flex flex-col gap-3 border-t border-[#edf3f0] pt-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-[#52736a]">Only participants marked eligible by the backend can be selected.</p><button ref={confirmTriggerRef} type="button" onClick={() => setConfirmationOpen(true)} disabled={selectedItems.length === 0 || batchMutation.isPending} className="h-10 rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">{batchMutation.isPending ? COPY.checkingIn : `Check in ${selectedItems.length} participant${selectedItems.length === 1 ? "" : "s"}`}</button></div>
    </div> : null}
    {confirmationOpen && typeof document !== "undefined" ? createPortal(<BatchCheckInConfirmation selectedCount={selectedItems.length} pending={batchMutation.isPending} onCancel={closeConfirmation} onConfirm={() => batchMutation.mutate()} />, document.body) : null}
  </section>;
}

function PreviewSkeleton() { return <div role="status" aria-label="Loading batch check-in participants" className="mt-4 space-y-2"><div className="h-14 animate-pulse rounded-xl bg-[#edf3f0]" /><div className="h-14 animate-pulse rounded-xl bg-[#edf3f0]" /></div>; }
function ErrorState({ onRetry }: { onRetry: () => void }) { return <div className="mt-4 rounded-xl border border-[#f3d5d1] bg-[#fff7f6] px-4 py-3"><p role="alert" className="text-sm font-semibold text-[#b42318]">Unable to load batch check-in participants.</p><button type="button" onClick={onRetry} className="mt-2 text-sm font-bold text-[#b42318] underline">{COPY.retry}</button></div>; }
function EmptyState({ title, description }: { title: string; description: string }) { return <div className="mt-4 rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] px-4 py-8 text-center"><p className="font-bold text-[#06201c]">{title}</p><p className="mt-1 text-sm text-[#52736a]">{description}</p></div>; }

function PreviewList({ items, selectedRegistrationIds, pending, timeZone, onToggle }: { items: readonly EventBatchCheckInPreviewItem[]; selectedRegistrationIds: ReadonlySet<string>; pending: boolean; timeZone: string; onToggle: (item: EventBatchCheckInPreviewItem) => void }) {
  return <><div className="mt-4 hidden overflow-x-auto lg:block"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-[#e1ebe6] text-xs uppercase tracking-[.08em] text-[#52736a]"><tr><th scope="col" className="px-3 py-3">{COPY.select}</th><th scope="col" className="px-3 py-3">{COPY.participant}</th><th scope="col" className="px-3 py-3">{COPY.email}</th><th scope="col" className="px-3 py-3">{COPY.status}</th><th scope="col" className="px-3 py-3">{COPY.eligibility}</th><th scope="col" className="px-3 py-3">{COPY.checkedIn}</th></tr></thead><tbody>{items.map((item) => <PreviewRow key={item.registration_id} item={item} checked={selectedRegistrationIds.has(item.registration_id)} pending={pending} timeZone={timeZone} onToggle={onToggle} />)}</tbody></table></div><div className="mt-4 grid gap-3 lg:hidden">{items.map((item) => <PreviewCard key={item.registration_id} item={item} checked={selectedRegistrationIds.has(item.registration_id)} pending={pending} timeZone={timeZone} onToggle={onToggle} />)}</div></>;
}
function PreviewRow({ item, checked, pending, timeZone, onToggle }: PreviewItemProps) { return <tr className="border-b border-[#edf3f0] last:border-0"><td className="px-3 py-4"><ParticipantCheckbox item={item} checked={checked} pending={pending} onToggle={onToggle} /></td><td className="px-3 py-4 font-semibold text-[#06201c]">{item.participant_name}</td><td className="px-3 py-4 text-[#52736a]">{item.participant_email}</td><td className="px-3 py-4"><StatusPill value={item.status} /></td><td className="px-3 py-4 text-[#31594d]">{item.eligibility_reason}</td><td className="px-3 py-4 text-[#52736a]">{item.checked_in_at ? formatAttendanceAuditDateTime(item.checked_in_at, timeZone) : "—"}</td></tr>; }
function PreviewCard({ item, checked, pending, timeZone, onToggle }: PreviewItemProps) { return <article className="rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] p-4"><div className="flex items-start gap-3"><ParticipantCheckbox item={item} checked={checked} pending={pending} onToggle={onToggle} /><div className="min-w-0"><p className="font-bold text-[#06201c]">{item.participant_name}</p><p className="truncate text-sm text-[#52736a]">{item.participant_email}</p></div></div><div className="mt-3 grid gap-2 text-sm"><div><span className="font-semibold text-[#31594d]">Status: </span><StatusPill value={item.status} /></div><p><span className="font-semibold text-[#31594d]">Eligibility: </span>{item.eligibility_reason}</p><p><span className="font-semibold text-[#31594d]">Checked in: </span>{item.checked_in_at ? formatAttendanceAuditDateTime(item.checked_in_at, timeZone) : "—"}</p></div></article>; }
type PreviewItemProps = { item: EventBatchCheckInPreviewItem; checked: boolean; pending: boolean; timeZone: string; onToggle: (item: EventBatchCheckInPreviewItem) => void };
function ParticipantCheckbox({ item, checked, pending, onToggle }: Omit<PreviewItemProps, "timeZone">) { const id = `batch-check-in-${item.registration_id}`; return <div><input id={id} type="checkbox" checked={checked} onChange={() => onToggle(item)} disabled={!item.can_check_in || pending} aria-describedby={`${id}-eligibility`} className="h-4 w-4 rounded border-[#9ab9ae] text-[#1f6a58] focus:ring-[#1f6a58] disabled:cursor-not-allowed" /><label htmlFor={id} className="sr-only">Select {item.participant_name} for batch check-in</label><span id={`${id}-eligibility`} className="sr-only">{item.eligibility_reason}</span></div>; }
function StatusPill({ value }: { value: string }) { return <span className="inline-flex rounded-full bg-[#edf3f0] px-2.5 py-1 text-xs font-bold text-[#31594d]">{value.replace(/_/g, " ")}</span>; }

function BatchResultSummary({ result }: { result: { selected: number; response: EventBatchCheckInResponse } }) {
  const failedResults = result.response.results.filter((item) => item.checked_in_at === null);
  return <section aria-live="polite" className="mt-4 rounded-xl border border-[#d7e5df] bg-[#f9fcfa] p-4"><p className="font-bold text-[#06201c]">Batch check-in results</p><p className="mt-1 text-sm text-[#31594d]">{result.selected} selected · {result.response.succeeded} checked in · {result.response.failed} failed</p>{result.response.results.length > 0 ? <ul className="mt-3 space-y-2 text-sm text-[#31594d]">{(result.response.failed > 0 && failedResults.length > 0 ? failedResults : result.response.results).map((item) => <li key={item.registration_id}><span className="font-semibold text-[#06201c]">{item.participant_name}</span> — {item.message || item.status}</li>)}</ul> : null}</section>;
}

function BatchCheckInConfirmation({ selectedCount, pending, onCancel, onConfirm }: { selectedCount: number; pending: boolean; onCancel: () => void; onConfirm: () => void }) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => { cancelRef.current?.focus(); const onEscape = (event: KeyboardEvent) => { if (event.key === "Escape" && !pending) onCancel(); }; document.addEventListener("keydown", onEscape); return () => document.removeEventListener("keydown", onEscape); }, [onCancel, pending]);
  return <div className="fixed inset-0 z-[120] flex items-end bg-[#06201c]/35 p-0 sm:items-center sm:justify-center sm:p-5" role="presentation"><div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="batch-check-in-confirmation-title" aria-describedby="batch-check-in-confirmation-description" onKeyDown={(event) => trapDialogFocus(event, dialogRef.current)} className="w-full rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-2xl"><h2 id="batch-check-in-confirmation-title" className="text-lg font-bold text-[#06201c]">{COPY.confirmTitle}</h2><p id="batch-check-in-confirmation-description" className="mt-2 text-sm leading-6 text-[#52736a]">Check in {selectedCount} participant{selectedCount === 1 ? "" : "s"}? {COPY.confirmDescription}</p><div className="mt-6 flex justify-end gap-3"><button ref={cancelRef} type="button" onClick={onCancel} disabled={pending} className="h-10 rounded-full border border-[#d7e5df] px-4 text-sm font-semibold text-[#52736a] disabled:opacity-60">{COPY.cancel}</button><button type="button" onClick={onConfirm} disabled={pending || selectedCount === 0} className="h-10 rounded-full bg-[#1f6a58] px-4 text-sm font-bold text-white disabled:opacity-60">{pending ? COPY.checkingIn : COPY.confirm}</button></div></div></div>;
}
function trapDialogFocus(event: React.KeyboardEvent<HTMLDivElement>, dialog: HTMLDivElement | null) { if (event.key !== "Tab") return; const elements = Array.from(dialog?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])') ?? []); const currentIndex = elements.findIndex((element) => element === document.activeElement); const nextIndex = event.shiftKey ? (currentIndex - 1 + elements.length) % elements.length : (currentIndex + 1) % elements.length; elements[nextIndex]?.focus(); event.preventDefault(); }
function getBatchCheckInErrorMessage(error: Error) { if (!(error instanceof EventsApiError)) return "Unable to check in the selected participants. Please try again."; if (error.status === 401 || error.status === 403) return "You do not have permission to check in these participants."; if (error.status === 404) return "This Event or one of its registrations is no longer available."; if (error.status === 409) return "Some selected participants can no longer be checked in. Refresh the preview and try again."; if (error.status === 422) return "The selected participants were not accepted for batch check-in."; return "Unable to check in the selected participants. Please try again."; }
