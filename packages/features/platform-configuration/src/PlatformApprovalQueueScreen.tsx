"use client";

import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import EventApprovalReviewPanel from "./EventApprovalReview";
import { EnterpriseDisplayName } from "./EventOwnershipNames";
import { approveEvent, getEventApprovalReview } from "./event-approval.service";
import { isRecord, type EventApprovalReview } from "./event-approval-review.types";

type Status = "pending_approval" | "approved";
type Item = Pick<EventApprovalReview, "id" | "enterprise_id" | "enterprise_name" | "title" | "category" | "start_date" | "end_date" | "venue" | "status">;
type List = { items: Item[]; pagination: { total: number; page: number; page_size: number; total_pages: number } };

async function getEvents(status: Status, page: number, search: string): Promise<List> {
  const parameters = new URLSearchParams({ status, page: String(page), page_size: "20" });
  if (search) parameters.set("search", search);
  const response = await fetch("/api/v1/events/?" + parameters.toString(), { credentials: "include" });
  if (!response.ok) throw new Error();
  const value = await response.json();
  if (!isRecord(value) || !Array.isArray(value.items) || !isRecord(value.pagination) || typeof value.pagination.total !== "number" || typeof value.pagination.page !== "number" || typeof value.pagination.page_size !== "number" || typeof value.pagination.total_pages !== "number" || !value.items.every((item) => isRecord(item) && typeof item.id === "string" && typeof item.enterprise_id === "string" && typeof item.title === "string" && typeof item.category === "string" && item.status === status)) throw new Error();
  return value as List;
}

function date(value: string | null | undefined): string {
  const match = value && /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))) : "Not provided";
}

/** Displays backend-authoritative pending and currently approved Event collections. */
export default function PlatformApprovalQueueScreen() {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } }));
  return <QueryClientProvider client={client}><Queue /></QueryClientProvider>;
}

function Queue() {
  const client = useQueryClient();
  const [status, setStatus] = useState<Status>("pending_approval");
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [pages, setPages] = useState<Record<Status, number>>({ pending_approval: 1, approved: 1 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => { setSearch(input.trim()); setPages({ pending_approval: 1, approved: 1 }); }, 300);
    return () => window.clearTimeout(timer);
  }, [input]);

  const pending = useQuery({ queryKey: ["platform", "event-approval-list", "pending_approval", pages.pending_approval, search], queryFn: () => getEvents("pending_approval", pages.pending_approval, search) });
  const approved = useQuery({ queryKey: ["platform", "event-approval-list", "approved", pages.approved, search], queryFn: () => getEvents("approved", pages.approved, search) });
  const active = status === "pending_approval" ? pending : approved;
  const list = active.data;
  const label = status === "pending_approval" ? "Pending Approval" : "Approved";
  const reviewQuery = useQuery({
    queryKey: ["platform", "event-approval-detail", selectedId],
    queryFn: () => getEventApprovalReview(selectedId ?? ""),
    enabled: Boolean(selectedId),
  });

  const approval = useMutation({
    mutationFn: approveEvent,
    onSuccess: async (_, eventId) => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["platform", "event-approval-list", "pending_approval"] }),
        client.invalidateQueries({ queryKey: ["platform", "event-approval-list", "approved"] }),
        client.invalidateQueries({ queryKey: ["platform", "event-approval-detail", eventId] }),
      ]);
      setSelectedId(null);
      setSuccess("Event approved successfully.");
    },
  });

  const switchStatus = (next: Status) => { setStatus(next); setSelectedId(null); setSuccess(null); };
  const emptyTitle = status === "pending_approval" ? "No events awaiting approval" : "No approved events";
  const emptyText = status === "pending_approval" ? "Submitted events will appear here when they need review." : "Events approved and awaiting publication will appear here.";

  return <section className="mx-auto w-full max-w-6xl">
    <p className="text-xs font-bold uppercase tracking-[.18em] text-[#7f9d94]">SUPER ADMIN · APPROVALS</p>
    <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-3xl font-bold text-[#06201c]">Approval Queue</h1><p className="mt-2 text-sm text-[#52736a]">{status === "pending_approval" ? "Review events submitted by enterprises for approval." : "Events approved and awaiting publication."}</p></div>{list ? <p className="font-bold text-[#1f6a58]">{list.pagination.total} {status === "pending_approval" ? "Pending" : "Approved"}</p> : null}</div>
    <div role="tablist" aria-label="Event approval status" className="mt-7 flex gap-2 border-b border-[#d7e5df]"><button id="pending-tab" type="button" role="tab" aria-selected={status === "pending_approval"} aria-controls="approval-events" onClick={() => switchStatus("pending_approval")} onKeyDown={(event) => { if (event.key === "ArrowRight") switchStatus("approved"); }} className={status === "pending_approval" ? "border-b-2 border-[#1f6a58] px-4 py-3 font-bold text-[#1f6a58]" : "px-4 py-3 font-bold text-[#52736a]"}>Pending Approval</button><button id="approved-tab" type="button" role="tab" aria-selected={status === "approved"} aria-controls="approval-events" onClick={() => switchStatus("approved")} onKeyDown={(event) => { if (event.key === "ArrowLeft") switchStatus("pending_approval"); }} className={status === "approved" ? "border-b-2 border-[#1f6a58] px-4 py-3 font-bold text-[#1f6a58]" : "px-4 py-3 font-bold text-[#52736a]"}>Approved</button></div>
    <label className="mt-5 block max-w-md"><span className="sr-only">Search events</span><input type="search" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Search events..." className="h-11 w-full rounded-xl border border-[#d7e5df] px-4" /></label>
    {success ? <p role="status" className="mt-5 rounded-xl bg-[#e9f4ee] p-4 font-semibold text-[#1f6a58]">{success}</p> : null}
    <div id="approval-events" role="tabpanel" aria-labelledby={status === "pending_approval" ? "pending-tab" : "approved-tab"}>
      {active.isLoading ? <div role="status" className="mt-6 space-y-3">{[1, 2, 3].map((number) => <div key={number} className="h-32 animate-pulse rounded-2xl bg-[#edf3f0]" />)}</div> : null}
      {active.isError ? <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm"><p role="alert" className="font-semibold text-[#b42318]">Unable to load {label.toLowerCase()} events.</p><button type="button" onClick={() => active.refetch()} className="mt-3 font-semibold text-[#1f6a58] underline">Retry</button></div> : null}
      {!active.isLoading && !active.isError && list?.items.length === 0 ? <div className="mt-6 rounded-2xl bg-white p-10 text-center shadow-sm"><p className="font-bold">{emptyTitle}</p><p className="mt-2 text-sm text-[#52736a]">{emptyText}</p></div> : null}
      {!active.isLoading && !active.isError && list?.items.length ? <><div className="mt-6 space-y-4">{list.items.map((event) => <article key={event.id} className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm"><div className="flex flex-col gap-4 sm:flex-row sm:justify-between"><div><div className="flex flex-wrap gap-2"><h2 className="text-lg font-bold">{event.title}</h2><span className={status === "approved" ? "rounded-full bg-[#e9f4ee] px-3 py-1 text-xs font-bold text-[#1f6a58]" : "rounded-full bg-[#fff4d6] px-3 py-1 text-xs font-bold text-[#8a5a00]"}>{label}</span></div><dl className="mt-3 grid gap-2 text-sm text-[#52736a] sm:grid-cols-2"><div><dt className="font-semibold text-[#06201c]">Enterprise</dt><dd><EnterpriseDisplayName enterpriseId={event.enterprise_id} eventEnterpriseName={event.enterprise_name} /></dd></div><div><dt className="font-semibold text-[#06201c]">Category</dt><dd>{event.category}</dd></div><div><dt className="font-semibold text-[#06201c]">Schedule</dt><dd>{date(event.start_date)} — {date(event.end_date)}</dd></div><div><dt className="font-semibold text-[#06201c]">Location</dt><dd>{event.venue?.name || event.venue?.city || "Not provided"}</dd></div></dl></div><button type="button" onClick={() => setSelectedId(event.id)} className="h-10 rounded-full border border-[#1f6a58] px-4 text-sm font-bold text-[#1f6a58]">Review</button></div></article>)}</div>
        {selectedId ? <section aria-labelledby="event-review-title" className="mt-6 rounded-2xl border border-[#e1ebe6] bg-white p-6 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#7f9d94]">READ-ONLY EVENT REVIEW</p><h2 id="event-review-title" className="mt-1 text-xl font-bold text-[#06201c]">{reviewQuery.data?.title ?? "Event review"}</h2></div><button type="button" onClick={() => setSelectedId(null)} className="font-semibold text-[#1f6a58] underline">Close</button></div>{reviewQuery.isLoading ? <div role="status" className="mt-5 space-y-3"><div className="h-8 animate-pulse rounded bg-[#edf3f0]" /><div className="h-24 animate-pulse rounded bg-[#edf3f0]" /></div> : reviewQuery.isError ? <div className="mt-5"><p role="alert" className="font-semibold text-[#b42318]">Unable to load event details.</p><button type="button" onClick={() => void reviewQuery.refetch()} className="mt-3 font-semibold text-[#1f6a58] underline">Retry</button></div> : reviewQuery.data ? <EventApprovalReviewPanel event={reviewQuery.data} approvalPending={approval.isPending} approvalError={approval.isError ? "Unable to approve this Event. Please try again." : null} onApprove={() => approval.mutate(reviewQuery.data.id)} /> : null}</section> : null}
        {list.pagination.total_pages > 1 ? <nav aria-label={label + " Event pages"} className="mt-6 flex justify-between"><button type="button" disabled={list.pagination.page <= 1} onClick={() => setPages((current) => ({ ...current, [status]: current[status] - 1 }))}>Previous</button><span>Page {list.pagination.page} of {list.pagination.total_pages}</span><button type="button" disabled={list.pagination.page >= list.pagination.total_pages} onClick={() => setPages((current) => ({ ...current, [status]: current[status] + 1 }))}>Next</button></nav> : null}
      </> : null}
    </div>
  </section>;
}
