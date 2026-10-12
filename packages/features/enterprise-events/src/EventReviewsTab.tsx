"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isInternalUserRole, useAuth } from "@ihp/auth";
import { deleteEventReview, listEnterpriseEventReviewsManage, listEventReviews, moderateEventReview } from "./events.service";
import { normalizeUtcDate } from "./event-reviews.service";
import type { EventReview, EventStarRating, ReviewModerationStatus } from "./event-reviews.types";
import { EventRatingSummaryCard } from "./EventRatingSummaryCard";
import { EventReviewModerationAuditModal } from "./EventReviewModerationAuditModal";

type StatusFilter = ReviewModerationStatus | "all";
const STATUSES: readonly StatusFilter[] = ["pending", "approved", "rejected", "all"];
const statusClass: Record<ReviewModerationStatus, string> = { pending: "bg-[#fff4d6] text-[#805900]", approved: "bg-[#e8f6ee] text-[#1f6a58]", rejected: "bg-[#fff1ef] text-[#a52a20]" };
const localDate = (value: string | null) => { const normalized = normalizeUtcDate(value); if (!normalized) return "Date unavailable"; const date = new Date(normalized); return Number.isNaN(date.getTime()) ? "Date unavailable" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date); };
const statusActions = (status: ReviewModerationStatus): ReviewModerationStatus[] => status === "pending" ? ["approved", "rejected"] : status === "approved" ? ["rejected", "pending"] : ["approved", "pending"];
const actionText = (status: ReviewModerationStatus) => status === "approved" ? "Approve" : status === "rejected" ? "Reject" : "Move to Pending";

/** Renders the per-Event review queue and moderation controls. */
export function EventReviewsTab({ eventId, reviewId, openAuditOnLoad = false }: { eventId: string; reviewId?: string; openAuditOnLoad?: boolean }) {
  const client = useQueryClient();
  const { roles } = useAuth();
  const canModerate = Boolean(roles && !isInternalUserRole(roles.tenantRole));
  const [status, setStatus] = useState<StatusFilter>("all");
  const [rating, setRating] = useState<EventStarRating | "all">("all");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [audit, setAudit] = useState(false);
  useEffect(() => {
    if (openAuditOnLoad) setAudit(true);
  }, [openAuditOnLoad]);
  const [notice, setNotice] = useState<string | null>(null);
  const queue = useQuery({ queryKey: ["event-reviews", "manage", eventId, "all"], queryFn: () => listEnterpriseEventReviewsManage({ eventId, status: "all", page: 1, pageSize: 100 }), enabled: Boolean(eventId), staleTime: 15_000, refetchOnMount: "always", retry: 1 });
  const approved = useQuery({ queryKey: ["events", eventId, "reviews"], queryFn: () => listEventReviews(eventId), enabled: Boolean(eventId), staleTime: 15_000, refetchOnMount: "always", retry: 1 });
  const refresh = () => { void client.invalidateQueries({ queryKey: ["event-reviews", "manage"] }); void client.invalidateQueries({ queryKey: ["event-reviews", "audit"] }); void client.invalidateQueries({ queryKey: ["events", eventId, "reviews"] }); void client.invalidateQueries({ queryKey: ["events", "list"] }); void client.invalidateQueries({ queryKey: ["events", "detail", eventId] }); };
  const moderate = useMutation({ mutationFn: ({ id, next }: { id: string; next: ReviewModerationStatus }) => moderateEventReview(id, next), onSuccess: () => { setNotice("Review updated."); refresh(); }, onError: (error) => setNotice((error as Error).message) });
  const remove = useMutation({ mutationFn: deleteEventReview, onSuccess: () => { setNotice("Review deleted."); refresh(); }, onError: (error) => setNotice((error as Error).message) });
  const reviews = queue.data?.reviews ?? [];
  useEffect(() => {
    if (!reviewId || queue.isLoading) return;
    document.getElementById(`event-review-${reviewId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [reviewId, queue.isLoading, queue.data]);
  const counts = queue.data?.counts ?? { pending: 0, approved: 0, rejected: 0, all: 0 };
  const filtered = useMemo(() => reviews.filter((review) => status === "all" || review.moderation_status === status).filter((review) => rating === "all" || review.rating === rating).sort((left, right) => {
    const parsedLeft = left.created_at ? Date.parse(left.created_at) : Number.NEGATIVE_INFINITY;
    const parsedRight = right.created_at ? Date.parse(right.created_at) : Number.NEGATIVE_INFINITY;
    const leftTime = Number.isFinite(parsedLeft) ? parsedLeft : Number.NEGATIVE_INFINITY;
    const rightTime = Number.isFinite(parsedRight) ? parsedRight : Number.NEGATIVE_INFINITY;
    if (leftTime === rightTime) return 0;
    return sort === "newest" ? (rightTime > leftTime ? 1 : -1) : (leftTime > rightTime ? 1 : -1);
  }), [reviews, status, rating, sort]);
  const changeStatus = (review: EventReview, next: ReviewModerationStatus) => { if (next === "rejected" && !window.confirm(`Reject the review from ${review.participant_name}?`)) return; setNotice(null); moderate.mutate({ id: review.id, next }); };
  const deleteReview = (review: EventReview) => { if (window.confirm(`Permanently delete the review from ${review.participant_name}? This cannot be undone.`)) { setNotice(null); remove.mutate(review.id); } };

  return <>
    <section className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold text-[#06201c]">Reviews</h2>{canModerate ? <button type="button" onClick={() => setAudit(true)} className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#1f6a58] hover:bg-[#f4faf7]">Moderation History</button> : null}</header>
      {notice ? <p role="status" className="mt-3 rounded-lg border border-[#bce8d1] bg-[#effaf4] px-3 py-2 text-sm">{notice}</p> : null}
      {queue.isLoading ? <p aria-live="polite" className="mt-4 animate-pulse rounded-xl bg-[#f4faf7] p-5 text-sm">Loading Event reviews…</p> : null}
      {queue.isError ? <p role="alert" className="mt-4 text-sm text-[#b42318]">{(queue.error as Error).message} <button onClick={() => void queue.refetch()} className="font-bold underline">Retry</button></p> : null}
      {!queue.isLoading && !queue.isError ? <>
        <div className="mt-4"><EventRatingSummaryCard reviews={approved.data ?? reviews} pendingCount={counts.pending} /></div>
        <div className="mt-4 flex flex-wrap items-center gap-2" role="tablist" aria-label="Filter reviews by status">{STATUSES.map((item) => <button key={item} type="button" role="tab" aria-selected={status === item} onClick={() => setStatus(item)} className={`rounded-full border px-3 py-2 text-sm font-semibold ${status === item ? "border-[#1f6a58] bg-[#e8f6ee] text-[#1f6a58]" : "border-[#d7e5df] text-[#52736a]"}`}>{item[0].toUpperCase() + item.slice(1)}{item !== "all" ? ` (${counts[item]})` : ""}</button>)}
          <label className="ml-auto flex items-center gap-2 text-sm">Rating<select value={rating} onChange={(e) => setRating(e.target.value === "all" ? "all" : Number(e.target.value) as EventStarRating)} className="h-10 rounded-xl border border-[#d7e5df] bg-white px-3"><option value="all">All ratings</option>{([5, 4, 3, 2, 1] as const).map((n) => <option key={n} value={n}>{n} ★</option>)}</select></label>
          <label className="flex items-center gap-2 text-sm">Sort<select value={sort} onChange={(e) => setSort(e.target.value as "newest" | "oldest")} className="h-10 rounded-xl border border-[#d7e5df] bg-white px-3"><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label>
        </div>
        {!filtered.length ? <p className="mt-4 text-sm text-[#52736a]">No Event reviews match these filters.</p> : <div className="mt-4 grid gap-3">{filtered.map((review) => <div key={review.id} id={`event-review-${review.id}`} className={review.id === reviewId ? "rounded-xl ring-2 ring-[#1f6a58] ring-offset-2 transition-all duration-300" : undefined}><ReviewCard review={review} canModerate={canModerate} expanded={expanded.has(review.id)} busy={moderate.isPending || remove.isPending} isFocused={review.id === reviewId} onToggle={() => setExpanded((current) => { const next = new Set(current); next.has(review.id) ? next.delete(review.id) : next.add(review.id); return next; })} onStatus={(next) => changeStatus(review, next)} onDelete={() => deleteReview(review)} /></div>)}</div>}
      </> : null}
    </section>
    {audit && canModerate ? <EventReviewModerationAuditModal eventId={eventId} reviewId={reviewId} onClose={() => setAudit(false)} /> : null}
  </>;
}

function ReviewCard({ review, canModerate, expanded, busy, onToggle, onStatus, onDelete, isFocused }: { review: EventReview; canModerate: boolean; expanded: boolean; busy: boolean; onToggle: () => void; onStatus: (status: ReviewModerationStatus) => void; onDelete: () => void; isFocused?: boolean }) {
  const long = (review.comment?.length ?? 0) > 240;
  return <article className="rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold text-[#06201c]">{review.participant_name}{review.verified ? <span className="ml-2 rounded-full bg-[#e8f6ee] px-2 py-0.5 text-[11px] text-[#1f6a58]">Verified</span> : null}{isFocused ? <span className="ml-2 rounded-full bg-[#1f6a58] px-2 py-0.5 text-[11px] font-bold text-white">Notified review</span> : null}</p>{canModerate && review.participant_email ? <p className="mt-0.5 text-xs text-[#52736a]">{review.participant_email}</p> : null}<time className="mt-1 block text-xs text-[#7f9d94]">{localDate(review.created_at)}</time></div><div className="flex items-center gap-2"><span className="rounded-full bg-[#e8f6ee] px-3 py-1 text-xs font-bold text-[#1f6a58]">{review.rating ? `${review.rating} ★` : "Rating unavailable"}</span><span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass[review.moderation_status]}`}>{review.moderation_status}</span></div></div>{review.comment ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#3c5d54]">{long && !expanded ? `${review.comment.slice(0, 240)}…` : review.comment}{long ? <button type="button" onClick={onToggle} className="ml-2 font-semibold text-[#1f6a58] underline">{expanded ? "Show less" : "Read more"}</button> : null}</p> : null}{canModerate ? <div className="mt-3 flex flex-wrap gap-2 border-t border-[#e1ebe6] pt-3">{statusActions(review.moderation_status).map((next) => <button key={next} type="button" disabled={busy} onClick={() => onStatus(next)} className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-xs font-bold text-[#1f6a58] hover:bg-[#e8f6ee] disabled:opacity-50">{actionText(next)}</button>)}<button type="button" disabled={busy} onClick={onDelete} className="rounded-full border border-[#e1c9c6] px-3 py-1.5 text-xs font-bold text-[#a52a20] disabled:opacity-50">Delete</button></div> : null}</article>;
}
