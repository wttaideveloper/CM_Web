"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { getEventFeedback, getEventFeedbackReport, getEventReviewsAudit, listEnterpriseEventReviewsManage, listEventReviews } from "./events.service";
import { normalizeUtcDate } from "./event-reviews.service";
import type { EventFeedbackAnswer, EventFeedbackItem, EventReview, EventReviewAuditEntry, EventStarRating, ReviewModerationStatus } from "./event-reviews.types";
import { EventRatingSummaryCard } from "./EventRatingSummaryCard";
import { EventReviewModerationAuditModal } from "./EventReviewModerationAuditModal";

export type ReviewStatusFilter = ReviewModerationStatus | "all" | "deleted";
export const STATUSES: readonly ReviewStatusFilter[] = ["all", "approved", "pending", "rejected", "deleted"];
const reviewStatusLabel = (status: ReviewStatusFilter): string => status === "all" ? "All" : status === "approved" ? "Published" : status[0].toUpperCase() + status.slice(1);
const statusClass: Record<ReviewModerationStatus, string> = { pending: "bg-[#fff4d6] text-[#805900]", approved: "bg-[#e8f6ee] text-[#1f6a58]", rejected: "bg-[#fff1ef] text-[#a52a20]" };
const localDate = (value: string | null) => { const normalized = normalizeUtcDate(value); if (!normalized) return "Date unavailable"; const date = new Date(normalized); return Number.isNaN(date.getTime()) ? "Date unavailable" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date); };
function auditActorLabel(entry: EventReviewAuditEntry): string {
  const role = entry.actor_role?.toLocaleLowerCase().replace(/[\s-]+/g, "_") ?? "";
  const roleLabel = role.includes("super_admin") || role.includes("platform_admin") ? "Super Admin" : entry.actor_role ?? "Staff";
  const name = entry.actor_name && !entry.actor_name.includes("@") ? entry.actor_name : null;
  return [roleLabel, name].filter(Boolean).join(" · ");
}

/** Renders the per-Event read-only review queue and moderation history. */
export function EventReviewsTab({ eventId, reviewId, openAuditOnLoad = false, initialStatus, initialSubview = "reviews" }: { eventId: string; reviewId?: string; openAuditOnLoad?: boolean; initialStatus?: ReviewStatusFilter | null; initialSubview?: "reviews" | "feedback" }) {
  const { t } = useTranslation("enterpriseEvents");
  const [subview, setSubview] = useState<"reviews" | "feedback">(() => reviewId || initialStatus === "deleted" ? "reviews" : initialSubview);
  const [feedbackSearch, setFeedbackSearch] = useState("");
  const [status, setStatus] = useState<ReviewStatusFilter>(() => (initialStatus && STATUSES.includes(initialStatus) ? initialStatus : "approved"));
  const [rating, setRating] = useState<EventStarRating | "all">("all");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [audit, setAudit] = useState(false);
  useEffect(() => {
    if (openAuditOnLoad) setAudit(true);
  }, [openAuditOnLoad]);
  useEffect(() => {
    if (initialStatus && STATUSES.includes(initialStatus)) {
      setStatus(initialStatus);
    }
  }, [initialStatus]);
  useEffect(() => {
    setSubview(reviewId || initialStatus === "deleted" ? "reviews" : initialSubview);
  }, [reviewId, initialStatus, initialSubview]);
  const queue = useQuery({ queryKey: ["event-reviews", "manage", eventId, "all"], queryFn: () => listEnterpriseEventReviewsManage({ eventId, status: "all", page: 1, pageSize: 100 }), enabled: Boolean(eventId), staleTime: 15_000, refetchOnMount: "always", retry: 1 });
  const auditQuery = useQuery({ queryKey: ["event-reviews", "audit", eventId ?? "all"], queryFn: () => getEventReviewsAudit(eventId), enabled: Boolean(eventId), staleTime: 15_000, refetchOnMount: "always", retry: 1 });
  const approved = useQuery({ queryKey: ["events", eventId, "reviews"], queryFn: () => listEventReviews(eventId), enabled: Boolean(eventId), staleTime: 15_000, refetchOnMount: "always", retry: 1 });
  const feedbackQuery = useQuery({ queryKey: ["event-feedback", eventId], queryFn: () => getEventFeedback(eventId), enabled: Boolean(eventId) && subview === "feedback", staleTime: 15_000, refetchOnMount: "always", refetchOnWindowFocus: true, retry: 1 });
  const feedbackReportQuery = useQuery({ queryKey: ["event-reports", "detail", eventId, "feedback", "json"], queryFn: () => getEventFeedbackReport(eventId), enabled: Boolean(eventId) && subview === "feedback", staleTime: 30_000, refetchOnMount: "always", refetchOnWindowFocus: true, retry: 1 });
  const reviews = queue.data?.reviews ?? [];
  const latestAuditByReviewId = useMemo(() => {
    const latest = new Map<string, EventReviewAuditEntry>();
    for (const entry of auditQuery.data ?? []) if (!latest.has(entry.review_id)) latest.set(entry.review_id, entry);
    return latest;
  }, [auditQuery.data]);
  const counts = queue.data?.counts ?? { pending: 0, approved: 0, rejected: 0, all: 0 };
  const deletedReviews = useMemo(() => (auditQuery.data ?? []).filter((entry) => entry.to_status.trim().toLocaleLowerCase() === "deleted"), [auditQuery.data]);
  useEffect(() => {
    if (initialStatus === "deleted") {
      setStatus("deleted");
    }
    if (!reviewId || queue.isLoading) return;
    const notifiedReview = reviews.find((review) => review.id === reviewId);
    if (notifiedReview) {
      setStatus(notifiedReview.moderation_status);
    } else if (deletedReviews.some((entry) => entry.review_id === reviewId || entry.id === reviewId) || initialStatus === "deleted") {
      setStatus("deleted");
    }
    if (typeof document !== "undefined") document.getElementById(`event-review-${reviewId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [reviewId, queue.isLoading, queue.data, reviews, deletedReviews, initialStatus]);
  const filtered = useMemo(() => reviews.filter((review) => status !== "deleted" && (status === "all" || review.moderation_status === status)).filter((review) => rating === "all" || review.rating === rating).sort((left, right) => {
    const parsedLeft = left.created_at ? Date.parse(left.created_at) : Number.NEGATIVE_INFINITY;
    const parsedRight = right.created_at ? Date.parse(right.created_at) : Number.NEGATIVE_INFINITY;
    const leftTime = Number.isFinite(parsedLeft) ? parsedLeft : Number.NEGATIVE_INFINITY;
    const rightTime = Number.isFinite(parsedRight) ? parsedRight : Number.NEGATIVE_INFINITY;
    if (leftTime === rightTime) return 0;
    return sort === "newest" ? (rightTime > leftTime ? 1 : -1) : (leftTime > rightTime ? 1 : -1);
  }), [reviews, status, rating, sort]);
  return <>
    <section className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold text-[#06201c]">{t("eventDetails.tabs.reviewsFeedback")}</h2>{subview === "reviews" ? <button type="button" onClick={() => setAudit(true)} className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#1f6a58] hover:bg-[#f4faf7]">Moderation History</button> : null}</header>
      <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label={t("eventDetails.tabs.reviewsFeedback")}>
        <button type="button" role="tab" aria-selected={subview === "reviews"} onClick={() => setSubview("reviews")} className={`rounded-full border px-4 py-2 text-sm font-semibold ${subview === "reviews" ? "border-[#1f6a58] bg-[#e8f6ee] text-[#1f6a58]" : "border-[#d7e5df] text-[#52736a]"}`}>{t("eventFeedback.publicReviews")}</button>
        <button type="button" role="tab" aria-selected={subview === "feedback"} onClick={() => setSubview("feedback")} className={`rounded-full border px-4 py-2 text-sm font-semibold ${subview === "feedback" ? "border-[#1f6a58] bg-[#e8f6ee] text-[#1f6a58]" : "border-[#d7e5df] text-[#52736a]"}`}>{t("eventFeedback.mobileAttendeeFeedback")}</button>
      </div>
      {subview === "feedback" ? <MobileFeedbackView query={feedbackQuery} reportQuery={feedbackReportQuery} search={feedbackSearch} onSearch={setFeedbackSearch} /> : <>
      {queue.isLoading ? <p aria-live="polite" className="mt-4 animate-pulse rounded-xl bg-[#f4faf7] p-5 text-sm">Loading Event reviews…</p> : null}
      {queue.isError ? <p role="alert" className="mt-4 text-sm text-[#b42318]">{(queue.error as Error).message} <button onClick={() => void queue.refetch()} className="font-bold underline">Retry</button></p> : null}
      {!queue.isLoading && !queue.isError ? <>
        <div className="mt-4"><EventRatingSummaryCard reviews={approved.data ?? reviews} pendingCount={counts.pending} /></div>
        <div className="mt-4 flex flex-wrap items-center gap-2" role="tablist" aria-label="Filter reviews by status">{STATUSES.map((item) => <button key={item} type="button" role="tab" aria-selected={status === item} onClick={() => setStatus(item)} className={`rounded-full border px-3 py-2 text-sm font-semibold ${status === item ? "border-[#1f6a58] bg-[#e8f6ee] text-[#1f6a58]" : "border-[#d7e5df] text-[#52736a]"}`}>{item === "deleted" ? "Deleted" : reviewStatusLabel(item)} ({item === "deleted" ? deletedReviews.length : counts[item] ?? 0})</button>)}
          <label className="ml-auto flex items-center gap-2 text-sm">Rating<select value={rating} onChange={(e) => setRating(e.target.value === "all" ? "all" : Number(e.target.value) as EventStarRating)} className="h-10 rounded-xl border border-[#d7e5df] bg-white px-3"><option value="all">All ratings</option>{([5, 4, 3, 2, 1] as const).map((n) => <option key={n} value={n}>{n} ★</option>)}</select></label>
          <label className="flex items-center gap-2 text-sm">Sort<select value={sort} onChange={(e) => setSort(e.target.value as "newest" | "oldest")} className="h-10 rounded-xl border border-[#d7e5df] bg-white px-3"><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label>
        </div>
        {status === "deleted" ? deletedReviews.length === 0 ? <p className="mt-4 text-sm text-[#52736a]">No deleted Event reviews.</p> : <div className="mt-4 grid gap-3">{deletedReviews.map((entry) => <DeletedEventReview key={entry.id} entry={entry} isFocused={entry.review_id === reviewId || entry.id === reviewId} />)}</div> : !filtered.length ? <p className="mt-4 text-sm text-[#52736a]">No Event reviews match these filters.</p> : <div className="mt-4 grid gap-3">{filtered.map((review) => <div key={review.id} id={`event-review-${review.id}`} className={review.id === reviewId ? "rounded-xl ring-2 ring-[#1f6a58] ring-offset-2 transition-all duration-300" : undefined}><ReviewCard review={review} latestAudit={latestAuditByReviewId.get(review.id) ?? null} expanded={expanded.has(review.id)} isFocused={review.id === reviewId} onToggle={() => setExpanded((current) => { const next = new Set(current); next.has(review.id) ? next.delete(review.id) : next.add(review.id); return next; })} /></div>)}</div>}
      </> : null}
      </>}
    </section>
    {audit ? <EventReviewModerationAuditModal eventId={eventId} reviewId={reviewId} onClose={() => setAudit(false)} /> : null}
  </>;
}

function MobileFeedbackView({ query, reportQuery, search, onSearch }: { query: ReturnType<typeof useQuery<EventFeedbackItem[], Error>>; reportQuery: ReturnType<typeof useQuery<Awaited<ReturnType<typeof getEventFeedbackReport>>, Error>>; search: string; onSearch: (value: string) => void }) {
  const { t } = useTranslation("enterpriseEvents");
  const reportItems = reportQuery.data?.data.feedbacks ?? [];
  const items = query.data?.length ? query.data : reportItems;
  const visible = items.filter((item) => `${item.participant_name} ${item.participant_email ?? ""} ${item.comment ?? ""}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const ratings = items.flatMap((item) => item.rating === null ? [] : [item.rating]);
  const average = ratings.length ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : reportQuery.data?.data.average_rating ?? null;
  const total = Math.max(reportQuery.data?.data.total_feedbacks ?? 0, items.length);
  return <div className="mt-5 space-y-5">
    <div className="grid gap-3 sm:grid-cols-2"><Metric label={t("eventFeedback.totalMobileSubmissions")} value={total} /><Metric label={t("eventFeedback.averageRating")} value={average === null ? "—" : t("eventFeedback.ratingOutOfFive", { rating: average.toFixed(1) })} /></div>
    <div className="flex flex-col gap-3 rounded-2xl border border-[#e1ebe6] bg-[#fbfdfc] p-4 sm:flex-row sm:items-end">
    <label className="block min-w-0 flex-1 text-sm font-semibold text-[#31594d]">{t("eventFeedback.searchLabel")}<input type="search" value={search} onChange={(event) => onSearch(event.target.value)} placeholder={t("eventFeedback.searchPlaceholder")} className="mt-2 h-11 w-full rounded-xl border border-[#d7e5df] bg-white px-3 font-normal outline-none transition focus:border-[#1f6a58] focus:ring-2 focus:ring-[#1f6a58]/15" /></label>
    <button type="button" disabled={query.isFetching || reportQuery.isFetching} onClick={() => { void Promise.all([query.refetch(), reportQuery.refetch()]); }} className="h-11 shrink-0 rounded-xl border border-[#cbded5] bg-white px-4 text-sm font-semibold text-[#1f6a58] transition hover:bg-[#eff8f3] disabled:cursor-wait disabled:opacity-60">{query.isFetching || reportQuery.isFetching ? t("eventFeedback.loading") : "Refresh feedback"}</button>
    </div>
    {query.isLoading ? <p role="status" className="rounded-xl bg-[#f4faf7] p-5 text-sm">{t("eventFeedback.loading")}</p> : null}
    {query.isError ? <div role="alert" className="rounded-xl border border-[#f3d5d1] bg-[#fff7f6] p-4 text-sm text-[#b42318]">{t("eventFeedback.loadError")} <button type="button" onClick={() => void query.refetch()} className="ml-2 font-semibold underline">{t("eventFeedback.retry")}</button></div> : null}
    {query.isError && reportItems.length > 0 ? <p className="rounded-lg bg-[#fff8e8] px-3 py-2 text-sm text-[#805900]">Showing the latest feedback entries from the report while the full submission list is unavailable.</p> : null}
    {!query.isLoading && !query.isError && items.length === 0 ? <p className="rounded-xl bg-[#f8fbf9] p-5 text-sm text-[#52736a]">{t("eventFeedback.empty")}</p> : null}
    {!query.isLoading && !query.isError && items.length > 0 && visible.length === 0 ? <p className="rounded-xl bg-[#f8fbf9] p-5 text-sm text-[#52736a]">{t("eventFeedback.noMatches")}</p> : null}
    <div className="grid gap-3">{visible.map((item) => <EventFeedbackCard key={item.id} item={item} />)}</div>
  </div>;
}

function Metric({ label, value }: { label: string; value: string | number }) { return <div className="rounded-2xl border border-[#e7efeb] bg-[#f8fbf9] p-5"><p className="text-xs font-bold uppercase tracking-[0.1em] text-[#6f9186]">{label}</p><p className="mt-2 text-3xl font-bold tracking-tight text-[#06201c]">{value}</p><p className="mt-1 text-xs text-[#779188]">{label.includes("rating") ? "Average attendee rating" : "Feedback received"}</p></div>; }

/** Displays one attendee feedback submission in Event feedback views. */
export function EventFeedbackCard({ item }: { item: EventFeedbackItem }) {
  const { t } = useTranslation("enterpriseEvents");
  const dateValue = normalizeUtcDate(item.created_at);
  const date = dateValue ? new Date(dateValue) : null;
  const formattedDate = date && Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date) : "Date unavailable";
  const attendeeName = item.participant_name?.trim() || "Attendee";
  const initials = attendeeName.split(/\s+/).slice(0, 2).map((part) => part.charAt(0).toLocaleUpperCase()).join("");
  const answers = Array.isArray(item.answers) ? item.answers : Object.entries(item.answers).map(([label, value]) => ({ label, value }));
  return <article className="overflow-hidden rounded-2xl border border-[#dfeae5] bg-white shadow-sm transition hover:border-[#c7ddd3] hover:shadow-md">
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#edf2ef] bg-[#fbfdfc] px-5 py-4">
      <div className="flex min-w-0 items-center gap-3">
        <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#e5f3ec] text-sm font-bold text-[#1f6a58]">{initials || "A"}</span>
        <div className="min-w-0"><p className="truncate font-bold text-[#06201c]">{attendeeName}</p>{item.participant_email ? <p className="mt-0.5 break-all text-sm text-[#52736a]">{item.participant_email}</p> : <p className="mt-0.5 text-xs text-[#829a92]">{t("eventFeedback.attendeeEmail")}: unavailable</p>}</div>
      </div>
      <div className="flex items-center gap-3 sm:ml-auto"><time dateTime={date && Number.isFinite(date.getTime()) ? date.toISOString() : undefined} className="text-xs text-[#718b82]">{formattedDate}</time><span aria-label={item.rating === null ? "No rating provided" : `Rating ${item.rating} out of 5`} className="whitespace-nowrap rounded-full bg-[#e8f6ee] px-3 py-1.5 text-sm font-bold text-[#1f6a58]">{item.rating === null ? "No rating" : `${item.rating} / 5`}</span></div>
    </div>
    <div className="space-y-4 px-5 py-4">
      {item.comment ? <div><p className="mb-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[#809a90]">Comment</p><p className="whitespace-pre-wrap text-sm leading-6 text-[#31594d]">{item.comment}</p></div> : <p className="text-sm italic text-[#829a92]">No written comment provided.</p>}
      {answers.length ? <section className="rounded-xl bg-[#f6faf8] p-4"><h3 className="text-sm font-bold text-[#31594d]">{t("eventFeedback.customAnswers")}</h3><dl className="mt-3 grid gap-3 sm:grid-cols-2">{answers.map((answer, index) => <AnswerRow key={`${answer.question_id ?? answer.key ?? index}`} answer={answer} index={index} />)}</dl></section> : null}
    </div>
  </article>;
}

function AnswerRow({ answer, index }: { answer: EventFeedbackAnswer; index: number }) { const label = answer.question ?? answer.label ?? answer.key ?? `Question ${index + 1}`; const value = answer.value ?? answer.answer; const text = typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? String(value) : value == null ? "—" : JSON.stringify(value); return <div><dt className="text-xs font-semibold text-[#7f9d94]">{label}</dt><dd className="mt-0.5 whitespace-pre-wrap text-sm text-[#3c5d54]">{text}</dd></div>; }

function DeletedEventReview({ entry, isFocused }: { entry: EventReviewAuditEntry; isFocused?: boolean }) {
  const previousStatus = entry.from_status?.replace(/[_-]+/g, " ") || "Not recorded";
  const normalized = normalizeUtcDate(entry.created_at);
  const date = normalized ? new Date(normalized) : null;
  const dateText = date && Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date) : "Date unavailable";
  const customer = entry.customer_name && !entry.customer_name.includes("@") ? entry.customer_name : "Customer";
  return <article id={`event-review-${entry.review_id}`} data-audit-id={`event-review-${entry.id}`} className={`rounded-xl border p-4 transition-all duration-300 ${isFocused ? "border-[#1f6a58] bg-[#effaf4] ring-2 ring-[#1f6a58] ring-offset-2" : "border-[#e1ebe6] bg-[#f9fcfa]"}`}><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="font-bold text-[#06201c]">{customer}{isFocused ? <span className="ml-2 rounded-full bg-[#1f6a58] px-2 py-0.5 text-[11px] font-bold text-white">Notified review</span> : null}</p><p className="mt-1 text-sm font-semibold text-[#1f6a58]">{entry.item_name ?? "Event"}</p><p className="mt-1 break-all text-xs text-[#7f9d94]">Review ID: {entry.review_id}</p><p className="mt-2 text-xs text-[#52736a]">Deleted by {auditActorLabel(entry)} · {dateText}</p><p className="mt-1 text-xs text-[#7f9d94]">Previous status: {previousStatus}</p>{entry.reason ? <p className="mt-2 rounded-lg bg-[#fff8e8] px-3 py-2 text-sm text-[#805900]">Reason: {entry.reason}</p> : null}</div><span className="rounded-full bg-[#f1f4f3] px-3 py-1 text-xs font-bold text-[#6b7f79]">Deleted</span></div>{entry.rating != null ? <p className="mt-3 text-xs font-semibold text-[#52736a]">Rating: {entry.rating} ★</p> : null}{entry.comment ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#3c5d54]">{entry.comment}</p> : null}</article>;
}

function ReviewCard({ review, latestAudit, expanded, onToggle, isFocused }: { review: EventReview; latestAudit: EventReviewAuditEntry | null; expanded: boolean; onToggle: () => void; isFocused?: boolean }) {
  const long = (review.comment?.length ?? 0) > 240;
  return <article className="rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold text-[#06201c]">{review.participant_name ?? "Anonymous"}{review.verified ? <span className="ml-2 rounded-full bg-[#e8f6ee] px-2 py-0.5 text-[11px] text-[#1f6a58]">Verified</span> : null}{isFocused ? <span className="ml-2 rounded-full bg-[#1f6a58] px-2 py-0.5 text-[11px] font-bold text-white">Notified review</span> : null}</p>{review.participant_email ? <p className="mt-0.5 text-xs text-[#52736a]">{review.participant_email}</p> : null}<time className="mt-1 block text-xs text-[#7f9d94]">{localDate(review.created_at)}</time>{latestAudit ? <><p className="mt-2 text-xs font-semibold text-[#52736a]">Latest action: {latestAudit.to_status.replace(/[_-]+/g, " ")} by {auditActorLabel(latestAudit)}</p>{latestAudit.reason ? <p className="mt-1 rounded-lg bg-[#fff8e8] px-3 py-2 text-xs text-[#805900]">Reason: {latestAudit.reason}</p> : null}</> : null}</div><div className="flex items-center gap-2"><span className="rounded-full bg-[#e8f6ee] px-3 py-1 text-xs font-bold text-[#1f6a58]">{review.rating ? `${review.rating} ★` : "Rating unavailable"}</span><span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass[review.moderation_status]}`}>{reviewStatusLabel(review.moderation_status)}</span></div></div>{review.comment ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#3c5d54]">{long && !expanded ? `${review.comment.slice(0, 240)}…` : review.comment}{long ? <button type="button" onClick={onToggle} className="ml-2 font-semibold text-[#1f6a58] underline">{expanded ? "Show less" : "Read more"}</button> : null}</p> : null}</article>;
}
