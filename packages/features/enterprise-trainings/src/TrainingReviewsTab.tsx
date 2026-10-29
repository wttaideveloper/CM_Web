"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { getTrainingReviewsAudit, listEnterpriseReviewsManage, listTrainingReviews } from "./trainings.service";
import { normalizeUtcDate } from "./training-reviews.service";
import type { ReviewModerationStatus, TrainingReview, TrainingReviewAuditEntry, TrainingStarRating } from "./training-reviews.types";
import { TrainingRatingSummaryCard } from "./TrainingRatingSummaryCard";
import { ReviewModerationAuditModal } from "./ReviewModerationAuditModal";

type ReviewSortOrder = "newest" | "oldest";

export type ReviewStatusFilter = ReviewModerationStatus | "all" | "deleted";
export const REVIEW_STATUS_OPTIONS: readonly ReviewStatusFilter[] = ["all", "approved", "pending", "rejected", "deleted"];
const reviewStatusLabel = (status: ReviewStatusFilter): string => status === "all" ? "All" : status === "approved" ? "Published" : status[0].toUpperCase() + status.slice(1);
const REVIEW_STATUS_CLASS: Record<ReviewModerationStatus, string> = {
  pending: "bg-[#fff4d6] text-[#805900]",
  approved: "bg-[#e8f6ee] text-[#1f6a58]",
  rejected: "bg-[#f0f3f2] text-[#52736a]",
};

function formatReviewDate(value: string | null): string {
  const normalized = normalizeUtcDate(value);
  if (!normalized) return "Date unavailable";
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function auditActorLabel(entry: TrainingReviewAuditEntry): string {
  const role = entry.actor_role?.toLocaleLowerCase().replace(/[\s-]+/g, "_") ?? "";
  const roleLabel = role.includes("super_admin") || role.includes("platform_admin") ? "Super Admin" : entry.actor_role ?? "Staff";
  const name = entry.actor_name && !entry.actor_name.includes("@") ? entry.actor_name : null;
  return [roleLabel, name].filter(Boolean).join(" · ");
}

function compareNewestFirst(left: TrainingReview, right: TrainingReview, order: ReviewSortOrder): number {
  const leftTime = left.created_at ? Date.parse(left.created_at) : Number.NEGATIVE_INFINITY;
  const rightTime = right.created_at ? Date.parse(right.created_at) : Number.NEGATIVE_INFINITY;
  const safeLeft = Number.isFinite(leftTime) ? leftTime : Number.NEGATIVE_INFINITY;
  const safeRight = Number.isFinite(rightTime) ? rightTime : Number.NEGATIVE_INFINITY;
  if (safeLeft === safeRight) return 0;
  return order === "newest" ? (safeRight > safeLeft ? 1 : -1) : (safeLeft > safeRight ? 1 : -1);
}

/** Renders read-only Training reviews, rating metrics, filters, and moderation history. */
export function TrainingReviewsTab({ trainingId, reviewId, openAuditOnLoad = false, initialStatus }: { trainingId: string; reviewId?: string; openAuditOnLoad?: boolean; initialStatus?: ReviewStatusFilter | null }) {
  const [statusFilter, setStatusFilter] = useState<ReviewStatusFilter>(() => (initialStatus && REVIEW_STATUS_OPTIONS.includes(initialStatus) ? initialStatus : "approved"));
  const [ratingFilter, setRatingFilter] = useState<TrainingStarRating | "all">("all");
  const [sortOrder, setSortOrder] = useState<ReviewSortOrder>("newest");
  const [expandedComments, setExpandedComments] = useState<Set<string>>(() => new Set());
  const [showAudit, setShowAudit] = useState(false);
  useEffect(() => {
    if (openAuditOnLoad) setShowAudit(true);
  }, [openAuditOnLoad]);

  useEffect(() => {
    if (initialStatus && REVIEW_STATUS_OPTIONS.includes(initialStatus)) {
      setStatusFilter(initialStatus);
    }
  }, [initialStatus]);

  const reviewsQuery = useQuery({
    queryKey: ["training-reviews", "manage", trainingId, "all", 1, 100],
    queryFn: () => listEnterpriseReviewsManage({ trainingId, status: "all", page: 1, pageSize: 100 }),
    enabled: Boolean(trainingId),
    staleTime: 15_000,
    refetchOnMount: "always",
    retry: 1,
  });
  const approvedReviewsQuery = useQuery({
    queryKey: ["trainings", trainingId, "reviews", "approved-summary"],
    queryFn: () => listTrainingReviews(trainingId),
    enabled: Boolean(trainingId),
    staleTime: 15_000,
    refetchOnMount: "always",
    retry: 1,
  });
  const auditQuery = useQuery({
    queryKey: ["training-reviews", "audit", trainingId ?? "all"],
    queryFn: () => getTrainingReviewsAudit(trainingId),
    enabled: Boolean(trainingId),
    staleTime: 15_000,
    refetchOnMount: "always",
    retry: 1,
  });
  const reviews = reviewsQuery.data?.reviews ?? [];
  const latestAuditByReviewId = useMemo(() => {
    const latest = new Map<string, NonNullable<typeof auditQuery.data>[number]>();
    for (const entry of auditQuery.data ?? []) if (!latest.has(entry.review_id)) latest.set(entry.review_id, entry);
    return latest;
  }, [auditQuery.data]);
  const deletedReviews = useMemo(() => (auditQuery.data ?? []).filter((entry) => entry.to_status.trim().toLocaleLowerCase() === "deleted"), [auditQuery.data]);
  const counts = reviewsQuery.data?.counts ?? { pending: 0, approved: 0, rejected: 0, all: 0 };
  useEffect(() => {
    if (initialStatus === "deleted") {
      setStatusFilter("deleted");
    }
    if (!reviewId || reviewsQuery.isLoading) return;
    const notifiedReview = reviews.find((review) => review.id === reviewId);
    if (notifiedReview) {
      setStatusFilter(notifiedReview.moderation_status);
    } else if (deletedReviews.some((entry) => entry.review_id === reviewId || entry.id === reviewId) || initialStatus === "deleted") {
      setStatusFilter("deleted");
    }
    if (typeof document !== "undefined") document.getElementById(`training-review-${reviewId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [reviewId, reviewsQuery.isLoading, reviewsQuery.data, reviews, deletedReviews, initialStatus]);
  const summaryReviews = approvedReviewsQuery.data ?? reviews;
  const filteredReviews = useMemo(() => reviews
    .filter((review) => statusFilter !== "deleted" && (statusFilter === "all" || review.moderation_status === statusFilter))
    .filter((review) => ratingFilter === "all" || review.rating === ratingFilter)
    .sort((left, right) => compareNewestFirst(left, right, sortOrder)), [reviews, statusFilter, ratingFilter, sortOrder]);

  return (
    <>
    <section className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-[#06201c]">Reviews</h2>
        <button type="button" onClick={() => setShowAudit(true)} className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#1f6a58] hover:bg-[#f4faf7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1f6a58]">Moderation History</button>
      </div>
      {reviewsQuery.isLoading ? <div className="mt-4 animate-pulse rounded-xl bg-[#f4faf7] p-6 text-sm text-[#52736a]" aria-live="polite" aria-busy="true">Loading Training reviews…</div> : null}
      {reviewsQuery.isError ? <div role="alert" className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[#b42318]"><p>{(reviewsQuery.error as Error).message}</p><button type="button" onClick={() => void reviewsQuery.refetch()} className="font-bold underline">Retry</button></div> : null}
      {!reviewsQuery.isLoading && !reviewsQuery.isError ? <>
        <div className="mt-4"><TrainingRatingSummaryCard reviews={summaryReviews} pendingCount={counts.pending} /></div>
        <div className="mt-4 flex flex-wrap items-center gap-2" role="tablist" aria-label="Filter reviews by moderation status">
          {REVIEW_STATUS_OPTIONS.map((status) => <button key={status} type="button" role="tab" aria-selected={statusFilter === status} onClick={() => setStatusFilter(status)} className={`rounded-full px-3 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1f6a58] ${statusFilter === status ? "border border-[#1f6a58] bg-[#e8f6ee] text-[#1f6a58]" : "border border-[#d7e5df] text-[#52736a] hover:bg-[#f4faf7]"}`}>{status === "deleted" ? "Deleted" : reviewStatusLabel(status)} ({status === "deleted" ? deletedReviews.length : counts[status] ?? 0})</button>)}
          <label className="ml-auto flex items-center gap-2 text-sm font-semibold text-[#52736a]">Rating<select value={ratingFilter} onChange={(event) => setRatingFilter(event.target.value === "all" ? "all" : Number(event.target.value) as TrainingStarRating)} className="h-10 rounded-xl border border-[#d7e5df] bg-white px-3 text-sm text-[#06201c]"><option value="all">All ratings</option>{([5, 4, 3, 2, 1] as const).map((rating) => <option key={rating} value={rating}>{rating} ★</option>)}</select></label>
          <label className="flex items-center gap-2 text-sm font-semibold text-[#52736a]">Sort<select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as ReviewSortOrder)} className="h-10 rounded-xl border border-[#d7e5df] bg-white px-3 text-sm text-[#06201c]"><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label>
        </div>
        {statusFilter === "deleted" ? deletedReviews.length === 0 ? <p className="mt-4 text-sm text-[#52736a]">No deleted Training reviews.</p> : <ul className="mt-4 grid gap-3">{deletedReviews.map((entry) => <DeletedTrainingReview key={entry.id} entry={entry} isFocused={entry.review_id === reviewId || entry.id === reviewId} />)}</ul> : filteredReviews.length === 0 ? <p className="mt-4 text-sm text-[#52736a]">{reviews.length === 0 ? "No reviews have been submitted for this Training yet." : "No reviews match these filters."}</p> : <ul className="mt-4 grid gap-3">{filteredReviews.map((review) => {
          const isExpanded = expandedComments.has(review.id);
          const latestAudit = latestAuditByReviewId.get(review.id);
          const truncated = Boolean(review.comment && review.comment.length > 240 && !isExpanded);
          const comment = review.comment ? truncated ? `${review.comment.slice(0, 240).trimEnd()}…` : review.comment : null;
          return <li key={review.id} id={`training-review-${review.id}`} className={`rounded-xl border p-4 transition-all duration-300 ${review.id === reviewId ? "border-[#1f6a58] bg-[#effaf4] ring-2 ring-[#1f6a58] ring-offset-2" : "border-[#e1ebe6] bg-[#f9fcfa]"}`}>
            <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="font-bold text-[#06201c]">{review.participant_name ?? "Anonymous"}{review.verified ? <span className="ml-2 rounded-full bg-[#e8f6ee] px-2 py-0.5 text-[11px] font-semibold text-[#1f6a58]">Verified</span> : null}{review.id === reviewId ? <span className="ml-2 rounded-full bg-[#1f6a58] px-2 py-0.5 text-[11px] font-bold text-white">Notified review</span> : null}</p>{review.participant_email ? <p className="mt-0.5 text-xs text-[#52736a]">{review.participant_email}</p> : null}<span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${REVIEW_STATUS_CLASS[review.moderation_status]}`}>{reviewStatusLabel(review.moderation_status)}</span></div><div className="flex shrink-0 items-center gap-2"><span className="rounded-full bg-[#e8f6ee] px-3 py-1 text-xs font-bold text-[#1f6a58]">{review.rating === null ? "Rating unavailable" : `${review.rating} ★`}</span></div></div>
            {latestAudit ? <><p className="mt-2 text-xs font-semibold text-[#52736a]">Latest action: {latestAudit.to_status.replace(/[_-]+/g, " ")} by {auditActorLabel(latestAudit)}</p>{latestAudit.reason ? <p className="mt-1 rounded-lg bg-[#fff8e8] px-3 py-2 text-xs text-[#805900]">Reason: {latestAudit.reason}</p> : null}</> : null}
            {comment ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#3c5d54]">{comment}{review.comment && review.comment.length > 240 ? <button type="button" onClick={() => setExpandedComments((current) => { const next = new Set(current); if (next.has(review.id)) next.delete(review.id); else next.add(review.id); return next; })} className="ml-1 font-semibold text-[#1f6a58] underline">{isExpanded ? "Show less" : "Read more"}</button> : null}</p> : null}
            <time className="mt-2 block text-xs text-[#7f9d94]">{formatReviewDate(review.created_at)}</time>
          </li>;
        })}</ul>}
      </> : null}</section>
  {showAudit ? <ReviewModerationAuditModal trainingId={trainingId} reviewId={reviewId} onClose={() => setShowAudit(false)} /> : null}
    </>
  );
}

function DeletedTrainingReview({ entry, isFocused }: { entry: TrainingReviewAuditEntry; isFocused?: boolean }) {
  const previousStatus = entry.from_status?.replace(/[_-]+/g, " ") || "Not recorded";
  const normalized = normalizeUtcDate(entry.created_at);
  const date = normalized ? new Date(normalized) : null;
  const dateText = date && Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date) : "Date unavailable";
  const customer = entry.customer_name && !entry.customer_name.includes("@") ? entry.customer_name : "Customer";
  return <li id={`training-review-${entry.review_id}`} data-audit-id={`training-review-${entry.id}`} className={`rounded-xl border p-4 transition-all duration-300 ${isFocused ? "border-[#1f6a58] bg-[#effaf4] ring-2 ring-[#1f6a58] ring-offset-2" : "border-[#e1ebe6] bg-[#f9fcfa]"}`}><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="font-bold text-[#06201c]">{customer}{isFocused ? <span className="ml-2 rounded-full bg-[#1f6a58] px-2 py-0.5 text-[11px] font-bold text-white">Notified review</span> : null}</p><p className="mt-1 text-sm font-semibold text-[#1f6a58]">{entry.item_name ?? "Training"}</p><p className="mt-1 break-all text-xs text-[#7f9d94]">Review ID: {entry.review_id}</p><p className="mt-2 text-xs text-[#52736a]">Deleted by {auditActorLabel(entry)} · {dateText}</p><p className="mt-1 text-xs text-[#7f9d94]">Previous status: {previousStatus}</p>{entry.reason ? <p className="mt-2 rounded-lg bg-[#fff8e8] px-3 py-2 text-sm text-[#805900]">Reason: {entry.reason}</p> : null}</div><span className="rounded-full bg-[#f1f4f3] px-3 py-1 text-xs font-bold text-[#6b7f79]">Deleted</span></div>{entry.rating != null ? <p className="mt-3 text-xs font-semibold text-[#52736a]">Rating: {entry.rating} ★</p> : null}{entry.comment ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#3c5d54]">{entry.comment}</p> : null}</li>;
}
