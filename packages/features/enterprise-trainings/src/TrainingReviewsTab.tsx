"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isInternalUserRole, useAuth } from "@ihp/auth";

import { moderateTrainingReview, deleteTrainingReview, listEnterpriseReviewsManage, listTrainingReviews, TrainingsApiError } from "./trainings.service";
import { normalizeUtcDate } from "./training-reviews.service";
import type { ReviewModerationStatus, TrainingReview, TrainingStarRating } from "./training-reviews.types";
import { TrainingRatingSummaryCard } from "./TrainingRatingSummaryCard";
import { ReviewModerationAuditModal } from "./ReviewModerationAuditModal";

type ReviewStatusFilter = ReviewModerationStatus | "all";
type ReviewSortOrder = "newest" | "oldest";

const REVIEW_STATUS_OPTIONS: readonly ReviewStatusFilter[] = ["pending", "approved", "rejected", "all"];
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

function getStatusLabel(status: ReviewStatusFilter): string {
  return status === "all" ? "All" : status[0].toUpperCase() + status.slice(1);
}

function statusActions(status: ReviewModerationStatus): ReviewModerationStatus[] {
  if (status === "pending") return ["approved", "rejected"];
  if (status === "approved") return ["rejected", "pending"];
  return ["approved", "pending"];
}

function actionLabel(status: ReviewModerationStatus): string {
  return status === "pending" ? "Move to Pending" : status === "approved" ? "Approve" : "Reject";
}

function compareNewestFirst(left: TrainingReview, right: TrainingReview, order: ReviewSortOrder): number {
  const leftTime = left.created_at ? Date.parse(left.created_at) : Number.NEGATIVE_INFINITY;
  const rightTime = right.created_at ? Date.parse(right.created_at) : Number.NEGATIVE_INFINITY;
  return order === "newest" ? rightTime - leftTime : leftTime - rightTime;
}

/** Renders Training reviews, rating metrics, filters, and Enterprise Admin moderation controls. */
export function TrainingReviewsTab({ trainingId, reviewId, openAuditOnLoad = false }: { trainingId: string; reviewId?: string; openAuditOnLoad?: boolean }) {
  const queryClient = useQueryClient();
  const { roles } = useAuth();
  const canModerateReviews = Boolean(roles && !isInternalUserRole(roles.tenantRole));
  const [statusFilter, setStatusFilter] = useState<ReviewStatusFilter>("all");
  const [ratingFilter, setRatingFilter] = useState<TrainingStarRating | "all">("all");
  const [sortOrder, setSortOrder] = useState<ReviewSortOrder>("newest");
  const [expandedComments, setExpandedComments] = useState<Set<string>>(() => new Set());
  const [feedback, setFeedback] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [showAudit, setShowAudit] = useState(false);
  useEffect(() => {
    if (openAuditOnLoad) setShowAudit(true);
  }, [openAuditOnLoad]);

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
  const refreshReviewData = () => {
    void queryClient.invalidateQueries({ queryKey: ["training-reviews", "manage", trainingId] });
    void queryClient.invalidateQueries({ queryKey: ["trainings", trainingId, "reviews"] });
    void queryClient.invalidateQueries({ queryKey: ["trainings", "detail", trainingId] });
    void queryClient.invalidateQueries({ queryKey: ["trainings", "list"] });
    void queryClient.invalidateQueries({ queryKey: ["training-reviews", "manage"] });
    void queryClient.invalidateQueries({ queryKey: ["training-reviews", "audit"] });
  };
  const moderateMutation = useMutation({
    mutationFn: ({ reviewId, status }: { reviewId: string; status: ReviewModerationStatus }) => moderateTrainingReview(reviewId, status),
    onSuccess: (_data, variables) => { setMutationError(null); setFeedback(`Review ${variables.status === "pending" ? "moved to pending" : variables.status}.`); refreshReviewData(); },
    onError: (error) => setMutationError(error instanceof TrainingsApiError ? error.message : "Unable to update this review."),
  });
  const deleteMutation = useMutation({
    mutationFn: (reviewId: string) => deleteTrainingReview(reviewId),
    onSuccess: () => { setMutationError(null); setFeedback("Review deleted."); refreshReviewData(); },
    onError: (error) => setMutationError(error instanceof TrainingsApiError ? error.message : "Unable to delete this review."),
  });

  const reviews = reviewsQuery.data?.reviews ?? [];
  useEffect(() => {
    if (!reviewId || reviewsQuery.isLoading) return;
    document.getElementById(`training-review-${reviewId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [reviewId, reviewsQuery.isLoading, reviewsQuery.data]);
  const counts = reviewsQuery.data?.counts ?? { pending: 0, approved: 0, rejected: 0, all: 0 };
  const summaryReviews = approvedReviewsQuery.data ?? reviews;
  const filteredReviews = useMemo(() => reviews
    .filter((review) => statusFilter === "all" || review.moderation_status === statusFilter)
    .filter((review) => ratingFilter === "all" || review.rating === ratingFilter)
    .sort((left, right) => compareNewestFirst(left, right, sortOrder)), [reviews, statusFilter, ratingFilter, sortOrder]);

  const updateStatus = (review: TrainingReview, status: ReviewModerationStatus) => {
    if (!canModerateReviews || moderateMutation.isPending || deleteMutation.isPending) return;
    if (status === "rejected" && !window.confirm(`Reject the review from ${review.participant_name}?`)) return;
    setFeedback(null);
    setMutationError(null);
    moderateMutation.mutate({ reviewId: review.id, status });
  };
  const removeReview = (review: TrainingReview) => {
    if (!canModerateReviews || moderateMutation.isPending || deleteMutation.isPending) return;
    if (!window.confirm(`Permanently delete the review from ${review.participant_name}? This cannot be undone.`)) return;
    setFeedback(null);
    setMutationError(null);
    deleteMutation.mutate(review.id);
  };

  return (
    <>
    <section className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-[#06201c]">Reviews</h2>
        {canModerateReviews ? <button type="button" onClick={() => setShowAudit(true)} className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#1f6a58] hover:bg-[#f4faf7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1f6a58]">Moderation History</button> : null}
      </div>
      {feedback ? <p role="status" className="mt-3 rounded-lg border border-[#bce8d1] bg-[#effaf4] px-3 py-2 text-sm font-semibold text-[#167550]">{feedback}</p> : null}
      {mutationError ? <p role="alert" className="mt-3 rounded-lg border border-[#f3c7c3] bg-[#fff5f4] px-3 py-2 text-sm font-semibold text-[#b42318]">{mutationError}</p> : null}
      {reviewsQuery.isLoading ? <div className="mt-4 animate-pulse rounded-xl bg-[#f4faf7] p-6 text-sm text-[#52736a]" aria-live="polite" aria-busy="true">Loading Training reviews…</div> : null}
      {reviewsQuery.isError ? <div role="alert" className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[#b42318]"><p>{(reviewsQuery.error as Error).message}</p><button type="button" onClick={() => void reviewsQuery.refetch()} className="font-bold underline">Retry</button></div> : null}
      {!reviewsQuery.isLoading && !reviewsQuery.isError ? <>
        <div className="mt-4"><TrainingRatingSummaryCard reviews={summaryReviews} pendingCount={counts.pending} /></div>
        <div className="mt-4 flex flex-wrap items-center gap-2" role="tablist" aria-label="Filter reviews by moderation status">
          {REVIEW_STATUS_OPTIONS.map((status) => <button key={status} type="button" role="tab" aria-selected={statusFilter === status} onClick={() => setStatusFilter(status)} className={`rounded-full px-3 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1f6a58] ${statusFilter === status ? "border border-[#1f6a58] bg-[#e8f6ee] text-[#1f6a58]" : "border border-[#d7e5df] text-[#52736a] hover:bg-[#f4faf7]"}`}>{getStatusLabel(status)}{status !== "all" ? ` (${counts[status]})` : ""}</button>)}
          <label className="ml-auto flex items-center gap-2 text-sm font-semibold text-[#52736a]">Rating<select value={ratingFilter} onChange={(event) => setRatingFilter(event.target.value === "all" ? "all" : Number(event.target.value) as TrainingStarRating)} className="h-10 rounded-xl border border-[#d7e5df] bg-white px-3 text-sm text-[#06201c]"><option value="all">All ratings</option>{([5, 4, 3, 2, 1] as const).map((rating) => <option key={rating} value={rating}>{rating} ★</option>)}</select></label>
          <label className="flex items-center gap-2 text-sm font-semibold text-[#52736a]">Sort<select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as ReviewSortOrder)} className="h-10 rounded-xl border border-[#d7e5df] bg-white px-3 text-sm text-[#06201c]"><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label>
        </div>
        {filteredReviews.length === 0 ? <p className="mt-4 text-sm text-[#52736a]">{reviews.length === 0 ? "No reviews have been submitted for this Training yet." : "No reviews match these filters."}</p> : <ul className="mt-4 grid gap-3">{filteredReviews.map((review) => {
          const isExpanded = expandedComments.has(review.id);
          const truncated = Boolean(review.comment && review.comment.length > 240 && !isExpanded);
          const comment = review.comment ? truncated ? `${review.comment.slice(0, 240).trimEnd()}…` : review.comment : null;
          return <li key={review.id} id={`training-review-${review.id}`} className={`rounded-xl border p-4 transition-all duration-300 ${review.id === reviewId ? "border-[#1f6a58] bg-[#effaf4] ring-2 ring-[#1f6a58] ring-offset-2" : "border-[#e1ebe6] bg-[#f9fcfa]"}`}>
            <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="font-bold text-[#06201c]">{review.participant_name}{review.verified ? <span className="ml-2 rounded-full bg-[#e8f6ee] px-2 py-0.5 text-[11px] font-semibold text-[#1f6a58]">Verified</span> : null}{review.id === reviewId ? <span className="ml-2 rounded-full bg-[#1f6a58] px-2 py-0.5 text-[11px] font-bold text-white">Notified review</span> : null}</p>{canModerateReviews && review.participant_email ? <p className="mt-0.5 text-xs text-[#52736a]">{review.participant_email}</p> : null}<span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${REVIEW_STATUS_CLASS[review.moderation_status]}`}>{getStatusLabel(review.moderation_status)}</span></div><div className="flex shrink-0 items-center gap-2"><span className="rounded-full bg-[#e8f6ee] px-3 py-1 text-xs font-bold text-[#1f6a58]">{review.rating === null ? "Rating unavailable" : `${review.rating} ★`}</span>{canModerateReviews ? <button type="button" onClick={() => removeReview(review)} disabled={deleteMutation.isPending || moderateMutation.isPending} className="rounded-full border border-[#e1c9c6] px-3 py-1 text-xs font-bold text-[#a52a20] hover:bg-[#fff1ef] hover:underline disabled:opacity-60">{deleteMutation.isPending && deleteMutation.variables === review.id ? "Deleting…" : "Delete"}</button> : null}</div></div>
            {comment ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#3c5d54]">{comment}{review.comment && review.comment.length > 240 ? <button type="button" onClick={() => setExpandedComments((current) => { const next = new Set(current); if (next.has(review.id)) next.delete(review.id); else next.add(review.id); return next; })} className="ml-1 font-semibold text-[#1f6a58] underline">{isExpanded ? "Show less" : "Read more"}</button> : null}</p> : null}
            <time className="mt-2 block text-xs text-[#7f9d94]">{formatReviewDate(review.created_at)}</time>
            {canModerateReviews ? <div className="mt-3 flex flex-wrap gap-2 border-t border-[#e1ebe6] pt-3">{statusActions(review.moderation_status).map((status) => <button key={status} type="button" onClick={() => updateStatus(review, status)} disabled={moderateMutation.isPending || deleteMutation.isPending} className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-xs font-bold text-[#1f6a58] hover:bg-[#e8f6ee] disabled:opacity-60">{moderateMutation.isPending && moderateMutation.variables?.reviewId === review.id && moderateMutation.variables.status === status ? "Saving…" : actionLabel(status)}</button>)}</div> : null}
          </li>;
        })}</ul>}
      </> : null}</section>
  {showAudit && canModerateReviews ? <ReviewModerationAuditModal trainingId={trainingId} reviewId={reviewId} onClose={() => setShowAudit(false)} /> : null}
    </>
  );
}
