import type {
  ReviewModerationStatus,
  ReviewsManageResponse,
  TrainingRatingSummary,
  TrainingReview,
  TrainingStarRating,
} from "./training-reviews.types";

/** Maximum comment length accepted by the Training review API. */
export const MAX_TRAINING_REVIEW_COMMENT_LENGTH = 2000;

const STAR_RATINGS: readonly TrainingStarRating[] = [1, 2, 3, 4, 5];
const MODERATION_STATUSES: readonly ReviewModerationStatus[] = ["pending", "approved", "rejected"];

/** Ensures a rating is a whole number from one to five. */
export function validateRating(rating: unknown): asserts rating is TrainingStarRating {
  if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error("Choose a whole-number rating from 1 to 5 stars.");
  }
}

/** Ensures an optional review comment fits the supported length. */
export function validateComment(comment: unknown): void {
  if (comment === undefined || comment === null) return;
  if (typeof comment !== "string") throw new Error("Review comments must be text.");
  if (comment.length > MAX_TRAINING_REVIEW_COMMENT_LENGTH) {
    throw new Error("Review comments must be 2,000 characters or fewer.");
  }
}

/** Returns an ISO timestamp with an explicit UTC zone when the server omits it. */
export function normalizeUtcDate(isoString: string | null | undefined): string | null {
  if (!isoString?.trim()) return null;
  const value = isoString.trim();
  if (!/^\d{4}-\d{2}-\d{2}T/.test(value) || /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)) return value;
  return `${value}Z`;
}

/** Returns a safe display name without falling back to the reviewer's email. */
export function sanitizeReviewerDisplayName(name: unknown, _email?: unknown): string {
  if (typeof name !== "string") return "Learner";
  const trimmedName = name.trim();
  return !trimmedName || trimmedName.includes("@") ? "Learner" : trimmedName;
}

/** Determines whether a learner's enrollment permits them to review a Training. */
export function isLearnerEligibleToReview(status: string | null | undefined): boolean {
  return ["enrolled", "active", "completed", "approved"].includes(status?.trim().toLowerCase() ?? "");
}

/** Calculates approved-only average and star distribution, with a pending count. */
export function calculateRatingSummary(reviews: readonly TrainingReview[]): TrainingRatingSummary {
  const approvedReviews = reviews.filter((review): review is TrainingReview & { rating: TrainingStarRating } => review.moderation_status === "approved" && review.rating !== null);
  const starBreakdown: Record<TrainingStarRating, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const review of approvedReviews) starBreakdown[review.rating] += 1;

  const averageRating = approvedReviews.length === 0
    ? null
    : Math.round((approvedReviews.reduce((total, review) => total + review.rating, 0) / approvedReviews.length) * 10) / 10;
  return {
    averageRating,
    averageRatingDisplay: averageRating === null || averageRating <= 0 ? "No ratings yet" : `${averageRating.toFixed(1)} ★`,
    totalReviewsCount: approvedReviews.length,
    pendingReviewsCount: reviews.filter((review) => review.moderation_status === "pending").length,
    starBreakdown,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isModerationStatus(value: unknown): value is ReviewModerationStatus {
  return typeof value === "string" && MODERATION_STATUSES.includes(value as ReviewModerationStatus);
}

/** Parses and normalizes one review response, applying safe name and status defaults. */
export function parseTrainingReview(value: unknown): TrainingReview {
  if (!isRecord(value)) throw new Error("Training Reviews API returned an invalid review.");
  const idValue = value.id ?? value.review_id;
  const id = typeof idValue === "string" ? idValue.trim() : "";
  if (!id) throw new Error("Training Reviews API returned a review without an ID.");
  const rawRating = value.rating;
  const rating = typeof rawRating === "number" && Number.isInteger(rawRating) && STAR_RATINGS.includes(rawRating as TrainingStarRating)
    ? rawRating as TrainingStarRating
    : null;
  const rawEmail = value.participant_email ?? value.reviewer_email;
  const participantEmail = typeof rawEmail === "string" ? rawEmail : null;
  const rawStatus = value.moderation_status ?? value.status;
  const moderationStatus = isModerationStatus(rawStatus) ? rawStatus : "approved";
  const rawTrainingId = value.training_id ?? value.item_id;
  const rawTrainingTitle = value.training_title ?? value.item_name;
  const rawName = value.participant_name ?? value.reviewer_name ?? value.author;
  const rawVerified = value.verified ?? value.is_verified;

  return {
    id,
    training_id: typeof rawTrainingId === "string" ? rawTrainingId : null,
    ...(typeof rawTrainingTitle === "string" ? { training_title: rawTrainingTitle } : {}),
    rating,
    comment: typeof value.comment === "string" ? value.comment : null,
    participant_name: sanitizeReviewerDisplayName(rawName, participantEmail),
    participant_email: participantEmail,
    verified: rawVerified === true,
    moderation_status: moderationStatus,
    created_at: normalizeUtcDate(typeof value.created_at === "string" ? value.created_at : null),
    updated_at: normalizeUtcDate(typeof value.updated_at === "string" ? value.updated_at : null),
  };
}

/** Parses and sorts a set of reviews newest first, with missing dates last. */
export function parseTrainingReviews(value: unknown): TrainingReview[] {
  const rows = Array.isArray(value)
    ? value
    : isRecord(value) && Array.isArray(value.reviews)
      ? value.reviews
      : isRecord(value) && Array.isArray(value.items)
        ? value.items
        : isRecord(value) && isRecord(value.data) && Array.isArray(value.data.reviews)
          ? value.data.reviews
        : null;
  if (!rows) throw new Error("Training Reviews API returned an invalid reviews response.");
  return rows.map(parseTrainingReview).sort((left, right) => {
    if (!left.created_at) return right.created_at ? 1 : 0;
    if (!right.created_at) return -1;
    return Date.parse(right.created_at) - Date.parse(left.created_at);
  });
}

/** Converts the documented Reviews queue response into the Training UI model. */
export function parseManagedTrainingReviews(value: unknown, fallbackPage = 1, fallbackPageSize = 20): ReviewsManageResponse {
  if (!isRecord(value) || !Array.isArray(value.items)) {
    throw new Error("Training Reviews API returned an invalid managed reviews response.");
  }

  const reviews = parseTrainingReviews(value.items);
  const rawCounts = isRecord(value.counts) ? value.counts : {};
  const pagination = isRecord(value.pagination) ? value.pagination : {};
  const numberOr = (candidate: unknown, fallback: number): number =>
    typeof candidate === "number" && Number.isFinite(candidate) ? candidate : fallback;
  const pending = numberOr(rawCounts.pending, reviews.filter((review) => review.moderation_status === "pending").length);
  const approved = numberOr(rawCounts.approved, reviews.filter((review) => review.moderation_status === "approved").length);
  const rejected = numberOr(rawCounts.rejected, reviews.filter((review) => review.moderation_status === "rejected").length);

  return {
    reviews,
    counts: { pending, approved, rejected, all: pending + approved + rejected },
    total: numberOr(pagination.total, reviews.length),
    page: numberOr(pagination.page, fallbackPage),
    page_size: numberOr(pagination.page_size, fallbackPageSize),
  };
}
