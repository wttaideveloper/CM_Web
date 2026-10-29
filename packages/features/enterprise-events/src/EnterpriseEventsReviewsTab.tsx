"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ReviewCardLayout, ReviewComment, ReviewItemName, ReviewerIdentity } from "@ihp/ui";
import { useSearchParams } from "next/navigation";
import { getEventFeedback, getEventReviewsAudit, listEnterpriseEventReviewsManage, listEvents } from "./events.service";
import { EventReviewModerationAuditModal } from "./EventReviewModerationAuditModal";
import { EventFeedbackCard } from "./EventReviewsTab";
import { normalizeUtcDate } from "./event-reviews.service";
import type { EventFeedbackItem, EventReviewAuditEntry, EventStarRating, ReviewModerationStatus } from "./event-reviews.types";

type ReviewStatusFilter = ReviewModerationStatus | "all";
const statuses: readonly ReviewStatusFilter[] = ["all", "approved", "pending", "rejected"];
const REVIEW_PAGE_SIZE = 15;
const FEEDBACK_PAGE_SIZE = 15;
const reviewStatusLabel = (status: ReviewStatusFilter): string => status === "all" ? "All" : status === "approved" ? "Published" : status[0].toUpperCase() + status.slice(1);
const badge: Record<ReviewModerationStatus, string> = { pending: "bg-[#fff4d6] text-[#805900]", approved: "bg-[#e8f6ee] text-[#1f6a58]", rejected: "bg-[#fff1ef] text-[#a52a20]" };
function reviewDateLabel(createdAt: string | null, updatedAt: string | null) {
  const created = normalizeUtcDate(createdAt);
  const updated = normalizeUtcDate(updatedAt);
  const value = updated && created && Date.parse(updated) > Date.parse(created) ? updated : created ?? updated;
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}
function auditActorLabel(entry: EventReviewAuditEntry): string {
  const role = entry.actor_role?.toLocaleLowerCase().replace(/[\s-]+/g, "_") ?? "";
  const roleLabel = role.includes("super_admin") || role.includes("platform_admin") ? "Super Admin" : entry.actor_role ?? "Staff";
  const name = entry.actor_name && !entry.actor_name.includes("@") ? entry.actor_name : null;
  return [roleLabel, name].filter(Boolean).join(" · ");
}

type EnterpriseEventFeedbackItem = { item: EventFeedbackItem; eventTitle: string; eventId: string };

async function loadEnterpriseEventFeedback(): Promise<{ items: EnterpriseEventFeedbackItem[]; failedEvents: number }> {
  const pageSize = 100;
  const firstPage = await listEvents({ page: 1, page_size: pageSize });
  const remainingPages = await Promise.all(Array.from({ length: Math.max(0, firstPage.pagination.total_pages - 1) }, (_, index) =>
    listEvents({ page: index + 2, page_size: pageSize }),
  ));
  const events = [...firstPage.items, ...remainingPages.flatMap((page) => page.items)];
  const items: EnterpriseEventFeedbackItem[] = [];
  let failedEvents = 0;

  // Keep requests bounded while avoiding sequential batches that make the page
  // wait for the slowest event before starting the next wave.
  let nextEventIndex = 0;
  const workerCount = Math.min(10, events.length);
  await Promise.all(Array.from({ length: workerCount }, async () => {
    while (nextEventIndex < events.length) {
      const event = events[nextEventIndex];
      nextEventIndex += 1;
      try {
        const feedback = await getEventFeedback(event.id);
        items.push(...feedback.map((item) => ({ item, eventTitle: event.title, eventId: event.id })));
      } catch {
        failedEvents += 1;
      }
    }
  }));

  items.sort((left, right) => {
    const leftTimestamp = Date.parse(normalizeUtcDate(left.item.created_at) ?? "");
    const rightTimestamp = Date.parse(normalizeUtcDate(right.item.created_at) ?? "");
    const leftTime = Number.isFinite(leftTimestamp) ? leftTimestamp : Number.NEGATIVE_INFINITY;
    const rightTime = Number.isFinite(rightTimestamp) ? rightTimestamp : Number.NEGATIVE_INFINITY;
    return rightTime - leftTime;
  });
  return { items, failedEvents };
}

/** Enterprise-wide paginated review management for Events. */
export function EnterpriseEventsReviewsTab() {
  const searchParams = useSearchParams();
  const initialStatusParam = searchParams.get("status")?.toLowerCase();
  const initialStatus: ReviewStatusFilter =
    initialStatusParam === "pending" || initialStatusParam === "approved" || initialStatusParam === "rejected" || initialStatusParam === "all"
      ? initialStatusParam
      : "approved";
  const [status, setStatus] = useState<ReviewStatusFilter>(initialStatus);
  const [rating, setRating] = useState<EventStarRating | "all">("all");
  const [search, setSearch] = useState("");
  const [feedbackSearch, setFeedbackSearch] = useState("");
  const [feedbackPage, setFeedbackPage] = useState(1);
  const [subview, setSubview] = useState<"reviews" | "feedback">("reviews");
  const [page, setPage] = useState(1);
  const [showAudit, setShowAudit] = useState(() => searchParams.get("show_audit") === "true");

  useEffect(() => {
    if (searchParams.get("show_audit") === "true") {
      setShowAudit(true);
    }
    const requestedStatus = searchParams.get("status")?.toLowerCase();
    if (requestedStatus === "pending" || requestedStatus === "approved" || requestedStatus === "rejected" || requestedStatus === "all") {
      setStatus(requestedStatus);
    }
  }, [searchParams]);
  const queue = useQuery({ queryKey: ["event-reviews", "manage", "enterprise", status, rating, search, page], queryFn: () => listEnterpriseEventReviewsManage({ status, rating, q: search, page, pageSize: REVIEW_PAGE_SIZE }), enabled: subview === "reviews", staleTime: 30_000, retry: 1 });
  const feedbackQuery = useQuery({ queryKey: ["enterprise-event-feedback", "all"], queryFn: loadEnterpriseEventFeedback, enabled: subview === "feedback", staleTime: 60_000, refetchOnWindowFocus: true, retry: 1 });
  const auditItemIds = [...new Set((queue.data?.reviews ?? []).map((review) => review.event_id).filter((id): id is string => Boolean(id)))];
  const auditQuery = useQuery({ queryKey: ["event-reviews", "audit", "items", auditItemIds], queryFn: async () => (await Promise.all(auditItemIds.map((id) => getEventReviewsAudit(id)))).flat(), enabled: subview === "reviews" && auditItemIds.length > 0, staleTime: 30_000, retry: 1 });
  const latestAuditByReviewId = useMemo(() => {
    const latest = new Map<string, EventReviewAuditEntry>();
    for (const entry of auditQuery.data ?? []) {
      const previous = latest.get(entry.review_id);
      const entryTime = Date.parse(normalizeUtcDate(entry.created_at) ?? "");
      const previousTime = previous ? Date.parse(normalizeUtcDate(previous.created_at) ?? "") : Number.NaN;
      if (!previous || (Number.isFinite(entryTime) && (!Number.isFinite(previousTime) || entryTime > previousTime))) latest.set(entry.review_id, entry);
    }
    return latest;
  }, [auditQuery.data]);
  const data = queue.data;
  const counts = data?.counts ?? { pending: 0, approved: 0, rejected: 0, all: 0 };
  const pageCount = data?.total_pages ?? (data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1);
  const feedbackItems = feedbackQuery.data?.items ?? [];
  const filteredFeedback = feedbackItems.filter(({ item, eventTitle }) => `${item.participant_name} ${item.participant_email ?? ""} ${item.comment ?? ""} ${eventTitle}`.toLocaleLowerCase().includes(feedbackSearch.trim().toLocaleLowerCase()));
  const feedbackPageCount = Math.max(1, Math.ceil(filteredFeedback.length / FEEDBACK_PAGE_SIZE));
  const displayedFeedback = filteredFeedback.slice((feedbackPage - 1) * FEEDBACK_PAGE_SIZE, feedbackPage * FEEDBACK_PAGE_SIZE);
  useEffect(() => { setFeedbackPage(1); }, [feedbackSearch]);
  useEffect(() => { if (feedbackPage > feedbackPageCount) setFeedbackPage(feedbackPageCount); }, [feedbackPage, feedbackPageCount]);

  return <section className="mt-6 rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-bold text-[#06201c]">Event reviews &amp; feedback</h3>{subview === "reviews" ? <button type="button" onClick={() => setShowAudit(true)} className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#1f6a58]">Moderation History</button> : null}</div>
    <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Event review views">
      <button type="button" role="tab" aria-selected={subview === "reviews"} onClick={() => setSubview("reviews")} className={`rounded-full border px-4 py-2 text-sm font-semibold ${subview === "reviews" ? "border-[#1f6a58] bg-[#e8f6ee] text-[#1f6a58]" : "border-[#d7e5df] text-[#52736a]"}`}>Public Reviews</button>
      <button type="button" role="tab" aria-selected={subview === "feedback"} onClick={() => setSubview("feedback")} className={`rounded-full border px-4 py-2 text-sm font-semibold ${subview === "feedback" ? "border-[#1f6a58] bg-[#e8f6ee] text-[#1f6a58]" : "border-[#d7e5df] text-[#52736a]"}`}>Mobile Attendee Feedback{feedbackItems.length ? ` (${feedbackItems.length})` : ""}</button>
    </div>
    {subview === "reviews" ? <>
    <div className="mt-4 flex flex-wrap items-center gap-2" role="tablist" aria-label="Filter Event reviews">{statuses.map((item) => <button key={item} type="button" role="tab" aria-selected={status === item} onClick={() => { setStatus(item); setPage(1); }} className={`rounded-full border px-3 py-2 text-sm font-semibold ${status === item ? "border-[#1f6a58] bg-[#e8f6ee] text-[#1f6a58]" : "border-[#d7e5df] text-[#52736a]"}`}>{reviewStatusLabel(item)} ({counts[item] ?? 0})</button>)}
      <label className="ml-auto flex items-center gap-2 text-sm">Rating<select value={rating} onChange={(e) => { setRating(e.target.value === "all" ? "all" : Number(e.target.value) as EventStarRating); setPage(1); }} className="h-10 rounded-xl border border-[#d7e5df] bg-white px-3"><option value="all">All ratings</option>{([5, 4, 3, 2, 1] as const).map((n) => <option key={n} value={n}>{n} ★</option>)}</select></label>
      <label className="flex items-center gap-2 text-sm">Search<input type="search" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Review comments" className="h-10 w-48 rounded-xl border border-[#d7e5df] px-3" /></label>
    </div>
    <p className="mt-2 text-xs text-[#68867c]">All includes Pending, Published, and Rejected reviews. Pending shows reviews awaiting moderation.</p>
    {queue.isLoading ? <p aria-live="polite" className="mt-4 animate-pulse rounded-xl bg-[#f4faf7] p-5 text-sm">Loading Event reviews…</p> : null}
    {queue.isError ? <p role="alert" className="mt-4 text-sm text-[#b42318]">{(queue.error as Error).message} <button type="button" onClick={() => void queue.refetch()} className="font-bold underline">Retry</button></p> : null}
    {!queue.isLoading && !queue.isError && !data?.reviews.length ? <p className="mt-4 text-sm text-[#52736a]">No Event reviews match these filters.</p> : null}
      {data?.reviews.length ? <div className="mt-4 grid gap-3">{data.reviews.map((review) => { const eventName = review.event_title ?? "View Event"; const latest = latestAuditByReviewId.get(review.id); return <ReviewCardLayout key={review.id} item={<Link className="font-semibold text-[#1f6a58] underline" title={eventName} href={review.event_id ? `/admin/events/${encodeURIComponent(review.event_id)}?tab=reviews` : "/admin/events?view=reviews"}><ReviewItemName fullName={eventName}>{eventName}</ReviewItemName></Link>} reviewer={<ReviewerIdentity name={review.participant_name ?? "Anonymous"} email={review.participant_email} verified={review.verified} />} rating={<span className="rounded-full bg-[#e8f6ee] px-3 py-1 text-xs font-bold text-[#1f6a58]">{review.rating ? `${review.rating} ★` : "Rating unavailable"}</span>} status={<span className={`rounded-full px-3 py-1 text-xs font-bold ${badge[review.moderation_status]}`}>{reviewStatusLabel(review.moderation_status)}</span>} date={<time>{reviewDateLabel(review.created_at, review.updated_at)}</time>} latestAction={latest ? `Latest action: ${latest.to_status.replace(/[_-]+/g, " ").replace(/^\w/, (character) => character.toLocaleUpperCase())} by ${auditActorLabel(latest)}` : undefined}><ReviewComment comment={review.comment} /></ReviewCardLayout>; })}</div> : null}
    {data && pageCount > 1 ? <nav aria-label="Review pagination" className="mt-5 flex items-center justify-between gap-3 border-t border-[#e1ebe6] pt-4"><span aria-live="polite" className="text-sm text-[#52736a]">Page {page} of {pageCount}</span><span className="flex gap-2"><button type="button" disabled={page <= 1 || queue.isFetching} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#1f6a58] disabled:cursor-not-allowed disabled:opacity-50">Previous</button><button type="button" disabled={page >= pageCount || queue.isFetching} onClick={() => setPage((current) => Math.min(pageCount, current + 1))} className="rounded-full border border-[#1f6a58] bg-[#1f6a58] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">Next</button></span></nav> : null}
    </> : <div className="mt-4 space-y-4">
      <p className="text-sm text-[#52736a]">Feedback submitted from the mobile app across your Events.</p>
      <label className="block text-sm font-semibold text-[#31594d]">Search attendee feedback<input type="search" value={feedbackSearch} onChange={(event) => setFeedbackSearch(event.target.value)} placeholder="Search by attendee, Event, email, or comment" className="mt-2 h-11 w-full rounded-xl border border-[#d7e5df] px-3 font-normal" /></label>
      {feedbackQuery.isLoading ? <p role="status" className="rounded-xl bg-[#f4faf7] p-5 text-sm">Loading mobile attendee feedback...</p> : null}
      {feedbackQuery.isError ? <p role="alert" className="rounded-xl border border-[#f3d5d1] bg-[#fff7f6] p-4 text-sm text-[#b42318]">Unable to load Event feedback. <button type="button" onClick={() => void feedbackQuery.refetch()} className="font-semibold underline">Try again</button></p> : null}
      {feedbackQuery.data?.failedEvents ? <p role="status" className="rounded-lg bg-[#fff8e8] px-3 py-2 text-sm text-[#805900]">Feedback could not be loaded for {feedbackQuery.data.failedEvents} Event(s). Try refreshing to load them again.</p> : null}
      {!feedbackQuery.isLoading && !feedbackQuery.isError && filteredFeedback.length === 0 ? <p className="rounded-xl bg-[#f8fbf9] p-5 text-sm text-[#52736a]">{feedbackItems.length ? "No feedback matches your search." : "No mobile attendee feedback submitted yet."}</p> : null}
      <div className="grid gap-3">{displayedFeedback.map(({ item, eventTitle, eventId }) => <article key={`${eventId}-${item.id}`} className="rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] p-4"><Link className="mb-3 inline-block font-semibold text-[#1f6a58] underline" href={`/admin/events/${encodeURIComponent(eventId)}?tab=reviews&subview=feedback`}>{eventTitle}</Link><EventFeedbackCard item={item} /></article>)}</div>
      {filteredFeedback.length > FEEDBACK_PAGE_SIZE ? <nav aria-label="Event feedback pagination" className="mt-5 flex items-center justify-between gap-3 border-t border-[#e1ebe6] pt-4"><span aria-live="polite" className="text-sm text-[#52736a]">Page {feedbackPage} of {feedbackPageCount}</span><span className="flex gap-2"><button type="button" disabled={feedbackPage <= 1 || feedbackQuery.isFetching} onClick={() => setFeedbackPage((current) => Math.max(1, current - 1))} className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#1f6a58] disabled:cursor-not-allowed disabled:opacity-50">Previous</button><button type="button" disabled={feedbackPage >= feedbackPageCount || feedbackQuery.isFetching} onClick={() => setFeedbackPage((current) => Math.min(feedbackPageCount, current + 1))} className="rounded-full border border-[#1f6a58] bg-[#1f6a58] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">Next</button></span></nav> : null}
    </div>}
    {showAudit ? <EventReviewModerationAuditModal onClose={() => setShowAudit(false)} /> : null}
  </section>;
}
