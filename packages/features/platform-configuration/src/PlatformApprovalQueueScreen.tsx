"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import EventApprovalReviewPanel from "./EventApprovalReview";
import { EnterpriseDisplayName } from "./EventOwnershipNames";
import { approveEvent, eventApprovalErrorMessage, getEventApprovalHistory, getEventApprovalReview, rejectEvent, requestEventChanges, type EventApprovalDecision, type EventApprovalHistoryResponse, type EventAuditRecord } from "./event-approval.service";
import type { EventApprovalReview } from "./event-approval-review.types";
import {
  eventApprovalListQueryKey,
  getEventApprovalList,
  platformEventApprovalErrorMessage,
  type EventApprovalListItem,
  type EventApprovalStatus,
} from "./event-approval-queries";

type ApprovalType = "events";
type Status = EventApprovalStatus;
type ApprovalMutationVariables = { eventId: string; action: EventApprovalDecision; reason?: string };

function formatDate(value: string | null | undefined): string {
  const match = value && /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))))
    : "Not provided";
}

function approvalStatusLabel(status: Status): string {
  if (status === "pending_approval") return "Pending Approval";
  if (status === "needs_revision") return "Requested Changes";
  return "Approved";
}

function eventStatusLabel(status: string | undefined): string {
  if (!status) return "Status unavailable";
  return status.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatAuditDateTime(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(parsed);
}

function auditDescription(record: EventAuditRecord): string {
  const before = record.before.status;
  const after = record.after.status;
  if (before === "draft" && after === "pending_approval") return "Submitted for approval";
  if (before === "pending_approval" && after === "needs_revision") return "Changes requested";
  if (before === "needs_revision" && after === "pending_approval") return "Resubmitted for approval";
  if (before === "pending_approval" && after === "rejected") return "Event rejected";
  if (before === "pending_approval" && after === "approved") return "Event approved";
  return "Status changed";
}

/** Displays the generic Platform approval workspace with the currently available Event approval type. */
export default function PlatformApprovalQueueScreen() {
  return <Queue />;
}

function Queue() {
  const client = useQueryClient();
  const [approvalType, setApprovalType] = useState<ApprovalType>("events");
  const [status, setStatus] = useState<Status>("pending_approval");
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [pages, setPages] = useState<Record<Status, number>>({ pending_approval: 1, needs_revision: 1, approved: 1 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(input.trim());
      setPages({ pending_approval: 1, needs_revision: 1, approved: 1 });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [input]);

  const pending = useQuery({
    queryKey: eventApprovalListQueryKey("pending_approval", pages.pending_approval, search),
    queryFn: () => getEventApprovalList("pending_approval", pages.pending_approval, search),
  });
  const approved = useQuery({
    queryKey: eventApprovalListQueryKey("approved", pages.approved, search),
    queryFn: () => getEventApprovalList("approved", pages.approved, search),
  });
  const requestedChanges = useQuery({
    queryKey: eventApprovalListQueryKey("needs_revision", pages.needs_revision, search),
    queryFn: () => getEventApprovalList("needs_revision", pages.needs_revision, search),
  });
  const active = status === "pending_approval" ? pending : status === "needs_revision" ? requestedChanges : approved;
  const list = active.data;
  const label = approvalStatusLabel(status);
  const reviewQuery = useQuery({
    queryKey: ["platform", "event-approval-detail", selectedId],
    queryFn: () => getEventApprovalReview(selectedId ?? ""),
    enabled: Boolean(selectedId),
  });
  const approval = useMutation({
    mutationFn: ({ eventId, action, reason }: ApprovalMutationVariables) => {
      if (action === "approve") return approveEvent(eventId);
      if (action === "request_changes") return requestEventChanges(eventId, reason ?? "");
      return rejectEvent(eventId, reason);
    },
    onSuccess: async (_, variables) => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["platform", "event-approval-list", "pending_approval"] }),
        client.invalidateQueries({ queryKey: ["platform", "event-approval-list", "needs_revision"] }),
        client.invalidateQueries({ queryKey: ["platform", "event-approval-list", "approved"] }),
        client.invalidateQueries({ queryKey: ["platform", "event-approval-detail", variables.eventId] }),
        client.invalidateQueries({ queryKey: ["platform", "event-approval-history", variables.eventId] }),
      ]);
      setSelectedId(null);
      setSuccess(variables.action === "approve" ? "Event approved successfully." : variables.action === "request_changes" ? "Changes requested successfully." : "Event rejected successfully.");
    },
  });

  const switchStatus = (next: Status) => {
    setStatus(next);
    setSelectedId(null);
    setSuccess(null);
  };
  const emptyTitle = status === "pending_approval" ? "No events awaiting approval" : status === "needs_revision" ? "No events with requested changes" : "No approved events";
  const emptyText = status === "pending_approval" ? "Submitted events will appear here when they need review." : status === "needs_revision" ? "Events with requested changes will appear here until they are resubmitted." : "Events approved and awaiting publication will appear here.";

  return (
    <section className="mx-auto w-full max-w-6xl">
      <p className="text-xs font-bold uppercase tracking-[.18em] text-[#7f9d94]">SUPER ADMIN · APPROVALS</p>
      <div className="mt-2">
        <h1 className="text-3xl font-bold text-[#06201c]">Approval Queue</h1>
        <p className="mt-2 text-sm text-[#52736a]">Review and manage pending platform approvals.</p>
      </div>

      <div role="tablist" aria-label="Approval types" className="mt-7 flex gap-2 border-b border-[#d7e5df]">
        <button id="approval-type-events-tab" type="button" role="tab" aria-selected={approvalType === "events"} aria-controls="approval-type-events-panel" onClick={() => setApprovalType("events")} className="border-b-2 border-[#1f6a58] px-4 py-3 font-bold text-[#1f6a58] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f6a58] focus-visible:ring-offset-2">Events</button>
      </div>

      {approvalType === "events" ? <section id="approval-type-events-panel" role="tabpanel" aria-labelledby="approval-type-events-tab">
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.14em] text-[#7f9d94]">EVENT APPROVALS</p>
            <h2 className="mt-1 text-xl font-bold text-[#06201c]">Event approvals</h2>
            <p className="mt-1 text-sm text-[#52736a]">{status === "pending_approval" ? "Review events submitted by enterprises for approval." : status === "needs_revision" ? "Review Events waiting for Enterprise Admin revisions." : "Events approved and awaiting publication."}</p>
          </div>
          {list ? <p className="font-bold text-[#1f6a58]">{list.pagination.total} {label}</p> : null}
        </div>

        <div role="tablist" aria-label="Event approval status" className="mt-5 flex gap-2 border-b border-[#d7e5df]">
          <StatusTab id="event-pending-tab" active={status === "pending_approval"} onClick={() => switchStatus("pending_approval")}>Pending Approval</StatusTab>
          <StatusTab id="event-requested-changes-tab" active={status === "needs_revision"} onClick={() => switchStatus("needs_revision")}>Requested Changes</StatusTab>
          <StatusTab id="event-approved-tab" active={status === "approved"} onClick={() => switchStatus("approved")}>Approved</StatusTab>
        </div>
        <label className="mt-5 block max-w-md">
          <span className="sr-only">Search events</span>
          <input type="search" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Search events..." className="h-11 w-full rounded-xl border border-[#d7e5df] px-4 outline-none focus:border-[#1f6a58] focus:ring-2 focus:ring-[#1f6a58]/20" />
        </label>
        {success ? <p role="status" className="mt-5 rounded-xl bg-[#e9f4ee] p-4 font-semibold text-[#1f6a58]">{success}</p> : null}

        <div id="event-approval-events" role="tabpanel" aria-labelledby={status === "pending_approval" ? "event-pending-tab" : status === "needs_revision" ? "event-requested-changes-tab" : "event-approved-tab"}>
          {active.isLoading ? <div role="status" className="mt-6 space-y-3">{[1, 2, 3].map((number) => <div key={number} className="h-32 animate-pulse rounded-2xl bg-[#edf3f0]" />)}</div> : null}
          {active.isError ? <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm"><p role="alert" className="font-semibold text-[#b42318]">{platformEventApprovalErrorMessage(active.error, `Unable to load ${label.toLowerCase()} events.`)}</p><button type="button" onClick={() => void active.refetch()} className="mt-3 font-semibold text-[#1f6a58] underline">Retry</button></div> : null}
          {!active.isLoading && !active.isError && list?.items.length === 0 ? <div className="mt-6 rounded-2xl bg-white p-10 text-center shadow-sm"><p className="font-bold">{emptyTitle}</p><p className="mt-2 text-sm text-[#52736a]">{emptyText}</p></div> : null}
          {!active.isLoading && !active.isError && list?.items.length ? <>
            <div className="mt-6 space-y-4">{list.items.map((event) => <ApprovalEventCard key={event.id} event={event} label={label} onReview={() => setSelectedId(event.id)} />)}</div>
            {selectedId ? <ReviewPanel selectedId={selectedId} reviewQuery={reviewQuery} approval={approval} onClose={() => setSelectedId(null)} /> : null}
            {list.pagination.total_pages > 1 ? <nav aria-label={`${label} Event pages`} className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><button type="button" disabled={list.pagination.page <= 1} onClick={() => setPages((current) => ({ ...current, [status]: current[status] - 1 }))}>Previous</button><span>Page {list.pagination.page} of {list.pagination.total_pages}</span><button type="button" disabled={list.pagination.page >= list.pagination.total_pages} onClick={() => setPages((current) => ({ ...current, [status]: current[status] + 1 }))}>Next</button></nav> : null}
          </> : null}
        </div>
      </section> : null}
    </section>
  );
}

function StatusTab({ id, active, onClick, children }: { id: string; active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button id={id} type="button" role="tab" aria-selected={active} aria-controls="event-approval-events" onClick={onClick} className={active ? "border-b-2 border-[#1f6a58] px-4 py-3 font-bold text-[#1f6a58] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f6a58] focus-visible:ring-offset-2" : "px-4 py-3 font-bold text-[#52736a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f6a58] focus-visible:ring-offset-2"}>{children}</button>;
}

function ApprovalEventCard({ event, label, onReview }: { event: EventApprovalListItem; label: string; onReview: () => void }) {
  const [imageFailed, setImageFailed] = useState(false);
  const primaryImage = event.primary_image?.trim() ?? "";
  const hasPrimaryImage = primaryImage.length > 0 && !imageFailed;

  return <article className="rounded-2xl border border-[#e1ebe6] bg-white p-4 shadow-sm sm:p-5">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 gap-4">
        <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-[#1f6a58] to-[#8ac7a7]">
          {hasPrimaryImage ? <><img src={primaryImage} alt="" aria-hidden="true" onError={() => setImageFailed(true)} className="h-full w-full object-cover object-center" /><div aria-hidden="true" className="absolute inset-0 bg-[#06201c]/25" /></> : <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.3)_0_1px,transparent_1px)] bg-[length:20px_20px]" />}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-bold text-[#06201c]">{event.title}</h3><span className={event.status === "approved" ? "rounded-full bg-[#e9f4ee] px-3 py-1 text-xs font-bold text-[#1f6a58]" : "rounded-full bg-[#fff4d6] px-3 py-1 text-xs font-bold text-[#8a5a00]"}>{label}</span></div>
          <dl className="mt-3 grid gap-x-6 gap-y-3 text-sm text-[#52736a] sm:grid-cols-2">
            <ApprovalField label="Enterprise"><EnterpriseDisplayName enterpriseId={event.enterprise_id} eventEnterpriseName={event.enterprise_name} /></ApprovalField>
            <ApprovalField label="Category">{event.category}</ApprovalField>
            <ApprovalField label="Schedule">{formatDate(event.start_date)} — {formatDate(event.end_date)}</ApprovalField>
            <ApprovalField label="Location">{event.venue?.name || event.venue?.city || "Not provided"}</ApprovalField>
          </dl>
        </div>
      </div>
      <button type="button" onClick={onReview} className="h-10 shrink-0 rounded-full border border-[#1f6a58] px-4 text-sm font-bold text-[#1f6a58] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f6a58] focus-visible:ring-offset-2">Review</button>
    </div>
  </article>;
}

function ApprovalField({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="min-w-0"><dt className="font-semibold text-[#06201c]">{label}</dt><dd className="mt-0.5 break-words">{children}</dd></div>;
}

function ReviewPanel({ selectedId, reviewQuery, approval, onClose }: { selectedId: string; reviewQuery: { data?: EventApprovalReview; error?: unknown; isLoading: boolean; isError: boolean; refetch: () => Promise<unknown> }; approval: { isPending: boolean; isError: boolean; error?: unknown; mutate: (variables: ApprovalMutationVariables) => void }; onClose: () => void }) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const historyQuery = useQuery({ queryKey: ["platform", "event-approval-history", selectedId], queryFn: () => getEventApprovalHistory(selectedId), enabled: historyOpen, retry: 1 });
  return <section aria-labelledby="event-review-title" className="mt-6 rounded-2xl border border-[#e1ebe6] bg-white p-6 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#7f9d94]">READ-ONLY EVENT REVIEW</p><h2 id="event-review-title" className="mt-1 text-xl font-bold text-[#06201c]">{reviewQuery.data?.title ?? "Event review"}</h2></div><button type="button" onClick={onClose} className="font-semibold text-[#1f6a58] underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f6a58] focus-visible:ring-offset-2">Close</button></div>{reviewQuery.isLoading ? <div role="status" className="mt-5 space-y-3"><div className="h-8 animate-pulse rounded bg-[#edf3f0]" /><div className="h-24 animate-pulse rounded bg-[#edf3f0]" /></div> : reviewQuery.isError ? <div className="mt-5"><p role="alert" className="font-semibold text-[#b42318]">Unable to load event details.</p><button type="button" onClick={() => void reviewQuery.refetch()} className="mt-3 font-semibold text-[#1f6a58] underline">Retry</button></div> : reviewQuery.data ? <><EventApprovalReviewPanel event={reviewQuery.data} approvalPending={approval.isPending} approvalError={approval.isError ? "Unable to apply this Event approval decision. Please try again." : null} onDecision={(action, reason) => approval.mutate({ eventId: selectedId, action, reason })} /><section className="mt-6 border-t border-[#e1ebe6] pt-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold text-[#06201c]">Approval History</h3><p className="mt-1 text-sm text-[#52736a]">Backend audit history for this Event.</p></div><button type="button" onClick={() => setHistoryOpen((open) => !open)} className="h-10 rounded-full border border-[#1f6a58] px-4 text-sm font-bold text-[#1f6a58]">{historyOpen ? "Hide history" : "Show history"}</button></div>{historyOpen ? <ApprovalHistory query={historyQuery} /> : null}</section></> : null}</section>;
}

function ApprovalHistory({ query }: { query: { data?: EventApprovalHistoryResponse; error?: unknown; isLoading: boolean; isError: boolean; refetch: () => Promise<unknown> } }) {
  if (query.isLoading) return <p role="status" className="mt-4 text-sm text-[#52736a]">Loading approval history...</p>;
  if (query.isError) return <div className="mt-4"><p role="alert" className="text-sm font-semibold text-[#b42318]">Unable to load approval history.</p><button type="button" onClick={() => void query.refetch()} className="mt-2 text-sm font-semibold text-[#1f6a58] underline">Retry</button></div>;
  if (!query.data || query.data.length === 0) return <p className="mt-4 text-sm text-[#52736a]">No approval history is available.</p>;
  const records = [...query.data].sort((first, second) => Date.parse(second.created_at) - Date.parse(first.created_at));
  return <ol className="mt-4 space-y-3 border-l-2 border-[#d7e5df] pl-4">{records.map((record) => <li key={record.id} className="relative"><span aria-hidden="true" className="absolute -left-[22px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-[#1f6a58]" /><p className="font-bold text-[#06201c]">{auditDescription(record)}</p>{auditDescription(record) === "Status changed" ? <p className="mt-1 text-sm text-[#52736a]">{eventStatusLabel(record.before.status)} → {eventStatusLabel(record.after.status)}</p> : null}{record.notes ? <p className="mt-1 text-sm text-[#31594d]">Reason: {record.notes}</p> : null}{record.changed_by ? <p className="mt-1 text-sm text-[#52736a]">Reviewer: {record.changed_by}</p> : null}<p className="mt-1 text-xs font-semibold text-[#7f9d94]">{formatAuditDateTime(record.created_at)}</p></li>)}</ol>;
}
