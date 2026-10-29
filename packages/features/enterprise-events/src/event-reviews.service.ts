import type { EventRatingSummary, EventReview, EventReviewsManageResponse, EventStarRating, ReviewModerationStatus } from "./event-reviews.types";

const RATINGS: readonly EventStarRating[] = [1, 2, 3, 4, 5];
const STATUSES: readonly ReviewModerationStatus[] = ["pending", "approved", "rejected"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Validates an Event review's whole number rating. */
export function validateRating(rating: unknown): asserts rating is EventStarRating {
  if (typeof rating !== "number" || !Number.isInteger(rating) || !RATINGS.includes(rating as EventStarRating)) throw new Error("Choose a whole-number rating from 1 to 5 stars.");
}

/** Validates an optional Event review comment. */
export function validateComment(comment: unknown): void {
  if (comment == null) return;
  if (typeof comment !== "string") throw new Error("Review comments must be text.");
  if (comment.length > 2000) throw new Error("Review comments must be 2,000 characters or fewer.");
}

/** Prevents reviewer email addresses from being presented as names. */
export function sanitizeAttendeeDisplayName(name: unknown, _email?: unknown): string {
  if (typeof name !== "string" || !name.trim() || name.includes("@")) return "Attendee";
  return name.trim();
}

/** Returns whether the registration status permits submitting an Event review. */
export function isAttendeeEligibleToReview(status: string | null | undefined): boolean {
  return ["confirmed", "attended"].includes(status?.trim().toLowerCase() ?? "");
}

/** Adds an explicit UTC zone to server timestamps that omit one. */
export function normalizeUtcDate(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const timestamp = value.trim();
  return /^\d{4}-\d{2}-\d{2}T/.test(timestamp) && !/(?:Z|[+-]\d{2}:?\d{2})$/i.test(timestamp) ? `${timestamp}Z` : timestamp;
}

/** Calculates approved-only average and star distribution. */
export function calculateEventRatingSummary(reviews: readonly EventReview[]): EventRatingSummary {
  const approved = reviews.filter((review): review is EventReview & { rating: EventStarRating } => review.moderation_status === "approved" && review.rating !== null);
  const starBreakdown: Record<EventStarRating, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  approved.forEach(({ rating }) => { starBreakdown[rating] += 1; });
  const averageRating = approved.length ? Math.round(approved.reduce((sum, review) => sum + review.rating, 0) / approved.length * 10) / 10 : null;
  return { averageRating, averageRatingDisplay: averageRating && averageRating > 0 ? `${averageRating.toFixed(1)} ★` : "No ratings yet", totalReviewsCount: approved.length, pendingReviewsCount: reviews.filter((review) => review.moderation_status === "pending").length, starBreakdown };
}

/** Normalizes public and managed Event review API response shapes. */
export function parseEventReview(value: unknown): EventReview {
  if (!isRecord(value)) throw new Error("Event Reviews API returned an invalid review.");
  const idValue = value.id ?? value.review_id;
  const id = typeof idValue === "string" ? idValue.trim() : "";
  if (!id) throw new Error("Event Reviews API returned a review without an ID.");
  const rawRating = value.rating;
  const rating = typeof rawRating === "number" && Number.isInteger(rawRating) && RATINGS.includes(rawRating as EventStarRating) ? rawRating as EventStarRating : null;
  const rawStatus = value.moderation_status ?? value.status;
  const moderationStatus = typeof rawStatus === "string" && STATUSES.includes(rawStatus as ReviewModerationStatus) ? rawStatus as ReviewModerationStatus : "approved";
  const rawName = value.participant_name ?? value.reviewer_name ?? value.author;
  const rawEmail = value.participant_email ?? value.reviewer_email;
  return {
    id,
    event_id: typeof (value.event_id ?? value.item_id) === "string" ? String(value.event_id ?? value.item_id) : null,
    event_title: typeof (value.event_title ?? value.item_name) === "string" ? String(value.event_title ?? value.item_name) : null,
    rating,
    comment: typeof value.comment === "string" ? value.comment : null,
    participant_name: sanitizeAttendeeDisplayName(rawName, rawEmail),
    participant_email: typeof rawEmail === "string" ? rawEmail : null,
    verified: value.verified === true || value.is_verified === true,
    moderation_status: moderationStatus,
    created_at: normalizeUtcDate(typeof value.created_at === "string" ? value.created_at : null),
    updated_at: normalizeUtcDate(typeof value.updated_at === "string" ? value.updated_at : null),
  };
}

/** Parses a managed Event review queue page. */
export function parseManagedEventReviews(value: unknown, pageFallback = 1, pageSizeFallback = 20): EventReviewsManageResponse {
  if (!isRecord(value) || !Array.isArray(value.items)) throw new Error("Event Reviews API returned an invalid managed response.");
  const reviews = value.items.map(parseEventReview);
  const counts = isRecord(value.counts) ? value.counts : {};
  const pagination = isRecord(value.pagination) ? value.pagination : {};
  const numberOr = (candidate: unknown, fallback: number) => typeof candidate === "number" && Number.isFinite(candidate) ? candidate : fallback;
  const pending = numberOr(counts.pending, reviews.filter((review) => review.moderation_status === "pending").length);
  const approved = numberOr(counts.approved, reviews.filter((review) => review.moderation_status === "approved").length);
  const rejected = numberOr(counts.rejected, reviews.filter((review) => review.moderation_status === "rejected").length);
  return { reviews, counts: { pending, approved, rejected, all: pending + approved + rejected }, total: numberOr(pagination.total, reviews.length), page: numberOr(pagination.page, pageFallback), page_size: numberOr(pagination.page_size, pageSizeFallback), total_pages: numberOr(pagination.total_pages, 1) };
}
