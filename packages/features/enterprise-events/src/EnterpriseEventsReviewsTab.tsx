"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isInternalUserRole, useAuth } from "@ihp/auth";
import { deleteEventReview, listEnterpriseEventReviewsManage, moderateEventReview } from "./events.service";
import { EventReviewModerationAuditModal } from "./EventReviewModerationAuditModal";
import { normalizeUtcDate } from "./event-reviews.service";
import type { EventStarRating, ReviewModerationStatus } from "./event-reviews.types";

type QueueStatus = ReviewModerationStatus | "all";
const statuses: readonly QueueStatus[] = ["pending", "approved", "rejected", "all"];
const badge: Record<ReviewModerationStatus, string> = { pending: "bg-[#fff4d6] text-[#805900]", approved: "bg-[#e8f6ee] text-[#1f6a58]", rejected: "bg-[#fff1ef] text-[#a52a20]" };
function dateLabel(value: string | null) { const normalized = normalizeUtcDate(value); if (!normalized) return "Date unavailable"; const date = new Date(normalized); return Number.isNaN(date.getTime()) ? "Date unavailable" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date); }
function statusOptions(status: ReviewModerationStatus): ReviewModerationStatus[] { return status === "pending" ? ["approved", "rejected"] : status === "approved" ? ["rejected", "pending"] : ["approved", "pending"]; }
function label(status: ReviewModerationStatus) { return status === "approved" ? "Approve" : status === "rejected" ? "Reject" : "Move to Pending"; }

/** Enterprise-wide paginated review management for Events. */
export function EnterpriseEventsReviewsTab() {
  const client = useQueryClient();
  const { roles } = useAuth();
  const canModerate = Boolean(roles && !isInternalUserRole(roles.tenantRole));
  const [status, setStatus] = useState<QueueStatus>("pending");
  const [rating, setRating] = useState<EventStarRating | "all">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showAudit, setShowAudit] = useState(false);
  const queue = useQuery({ queryKey: ["event-reviews", "manage", "enterprise", status, rating, search, page], queryFn: () => listEnterpriseEventReviewsManage({ status, rating, q: search, page, pageSize: 20 }), staleTime: 15_000, retry: 1 });
  const refresh = () => { void client.invalidateQueries({ queryKey: ["event-reviews", "manage"] }); void client.invalidateQueries({ queryKey: ["event-reviews", "audit"] }); void client.invalidateQueries({ queryKey: ["events", "list"] }); };
  const moderate = useMutation({ mutationFn: ({ id, next }: { id: string; next: ReviewModerationStatus }) => moderateEventReview(id, next), onSuccess: refresh });
  const remove = useMutation({ mutationFn: deleteEventReview, onSuccess: refresh });
  const data = queue.data;
  const counts = data?.counts ?? { pending: 0, approved: 0, rejected: 0, all: 0 };
  const pageCount = data?.total_pages ?? (data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1);
  const change = (id: string, next: ReviewModerationStatus) => { if (next === "rejected" && !window.confirm("Reject this Event review?")) return; moderate.mutate({ id, next }); };

  return <section className="mt-6 rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-bold text-[#06201c]">Event reviews</h3>{canModerate ? <button type="button" onClick={() => setShowAudit(true)} className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#1f6a58]">Moderation History</button> : null}</div>
    <div className="mt-4 flex flex-wrap items-center gap-2" role="tablist" aria-label="Filter Event reviews">{statuses.map((item) => <button key={item} type="button" role="tab" aria-selected={status === item} onClick={() => { setStatus(item); setPage(1); }} className={`rounded-full border px-3 py-2 text-sm font-semibold ${status === item ? "border-[#1f6a58] bg-[#e8f6ee] text-[#1f6a58]" : "border-[#d7e5df] text-[#52736a]"}`}>{item[0].toUpperCase() + item.slice(1)}{item !== "all" ? ` (${counts[item]})` : ""}</button>)}
      <label className="ml-auto flex items-center gap-2 text-sm">Rating<select value={rating} onChange={(e) => { setRating(e.target.value === "all" ? "all" : Number(e.target.value) as EventStarRating); setPage(1); }} className="h-10 rounded-xl border border-[#d7e5df] bg-white px-3"><option value="all">All ratings</option>{([5, 4, 3, 2, 1] as const).map((n) => <option key={n} value={n}>{n} ★</option>)}</select></label>
      <label className="flex items-center gap-2 text-sm">Search<input type="search" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Review comments" className="h-10 w-48 rounded-xl border border-[#d7e5df] px-3" /></label>
    </div>
    {queue.isLoading ? <p aria-live="polite" className="mt-4 animate-pulse rounded-xl bg-[#f4faf7] p-5 text-sm">Loading Event reviews…</p> : null}
    {queue.isError ? <p role="alert" className="mt-4 text-sm text-[#b42318]">{(queue.error as Error).message} <button type="button" onClick={() => void queue.refetch()} className="font-bold underline">Retry</button></p> : null}
    {!queue.isLoading && !queue.isError && !data?.reviews.length ? <p className="mt-4 text-sm text-[#52736a]">No Event reviews match these filters.</p> : null}
    {data?.reviews.length ? <div className="mt-4 grid gap-3">{data.reviews.map((review) => <article key={review.id} className="rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="font-bold text-[#06201c]">{review.participant_name}{review.verified ? <span className="ml-2 rounded-full bg-[#e8f6ee] px-2 py-0.5 text-[11px] text-[#1f6a58]">Verified</span> : null}</p>{canModerate && review.participant_email ? <p className="mt-0.5 text-xs text-[#52736a]">{review.participant_email}</p> : null}<p className="mt-1 text-sm text-[#52736a]"><Link className="font-semibold text-[#1f6a58] underline" href={review.event_id ? `/admin/events/${review.event_id}` : "/admin/events"}>{review.event_title ?? "View Event"}</Link> · {dateLabel(review.created_at)}</p></div><div className="flex items-center gap-2"><span className="rounded-full bg-[#e8f6ee] px-3 py-1 text-xs font-bold text-[#1f6a58]">{review.rating ? `${review.rating} ★` : "Rating unavailable"}</span><span className={`rounded-full px-3 py-1 text-xs font-bold ${badge[review.moderation_status]}`}>{review.moderation_status}</span></div></div>{review.comment ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#3c5d54]">{review.comment}</p> : null}{canModerate ? <div className="mt-3 flex flex-wrap gap-2 border-t border-[#e1ebe6] pt-3">{statusOptions(review.moderation_status).map((next) => <button key={next} type="button" disabled={moderate.isPending || remove.isPending} onClick={() => change(review.id, next)} className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-xs font-bold text-[#1f6a58] disabled:opacity-50">{label(next)}</button>)}<button type="button" disabled={moderate.isPending || remove.isPending} onClick={() => { if (window.confirm("Permanently delete this Event review? This cannot be undone.")) remove.mutate(review.id); }} className="rounded-full border border-[#e1c9c6] px-3 py-1.5 text-xs font-bold text-[#a52a20]">Delete</button></div> : null}</article>)}</div> : null}
    {data && data.total_pages > 1 ? <nav aria-label="Review pagination" className="mt-4 flex items-center justify-between"><span className="text-sm text-[#52736a]">Page {page} of {pageCount}</span><span className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="rounded-full border px-3 py-1.5 text-sm disabled:opacity-50">Previous</button><button type="button" disabled={page >= pageCount} onClick={() => setPage((current) => current + 1)} className="rounded-full border px-3 py-1.5 text-sm disabled:opacity-50">Next</button></span></nav> : null}
    {showAudit && canModerate ? <EventReviewModerationAuditModal onClose={() => setShowAudit(false)} /> : null}
  </section>;
}
