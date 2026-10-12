/** Review moderation state returned by the Events Reviews API. */
export type ReviewModerationStatus = "pending" | "approved" | "rejected";

/** Supported whole number star ratings. */
export type EventStarRating = 1 | 2 | 3 | 4 | 5;

/** Normalized review item for Enterprise Event moderation. */
export interface EventReview {
  id: string;
  event_id: string | null;
  event_title: string | null;
  rating: EventStarRating | null;
  comment: string | null;
  participant_name: string;
  participant_email: string | null;
  verified: boolean;
  moderation_status: ReviewModerationStatus;
  created_at: string | null;
  updated_at: string | null;
}

/** Summary calculated from approved Event reviews. */
export interface EventRatingSummary {
  averageRating: number | null;
  averageRatingDisplay: string;
  totalReviewsCount: number;
  pendingReviewsCount: number;
  starBreakdown: Record<EventStarRating, number>;
}

/** Parsed managed review page and status counts. */
export interface EventReviewsManageResponse {
  reviews: EventReview[];
  counts: { pending: number; approved: number; rejected: number; all: number };
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/** One moderation or deletion audit record. */
export interface EventReviewAuditEntry {
  id: string;
  module: string;
  review_id: string;
  item_id: string;
  item_name: string | null;
  from_status: string | null;
  to_status: string;
  actor_name?: string | null;
  actor_user_id: string | null;
  actor_role: string | null;
  created_at: string | null;
}

/** Filters supported by the enterprise Event review queue. */
export interface EnterpriseEventReviewsParams {
  eventId?: string;
  status?: ReviewModerationStatus | "all";
  rating?: EventStarRating | "all";
  q?: string;
  page?: number;
  pageSize?: number;
}
