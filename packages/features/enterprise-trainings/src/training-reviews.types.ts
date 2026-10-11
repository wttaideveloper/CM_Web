/** Valid moderation states for a Training review. */
export type ReviewModerationStatus = "pending" | "approved" | "rejected";

/** Whole-number Training review rating. */
export type TrainingStarRating = 1 | 2 | 3 | 4 | 5;

/** Review data returned by the Training review API. */
export interface TrainingReview {
  id: string;
  training_id: string | null;
  training_title?: string | null;
  rating: TrainingStarRating | null;
  comment: string | null;
  participant_name: string;
  participant_email: string | null;
  verified: boolean;
  moderation_status: ReviewModerationStatus;
  created_at: string | null;
  updated_at: string | null;
}

/** Approved-review rating metrics for a Training or review collection. */
export interface TrainingRatingSummary {
  averageRating: number | null;
  averageRatingDisplay: string;
  totalReviewsCount: number;
  pendingReviewsCount: number;
  starBreakdown: Record<TrainingStarRating, number>;
}

/** Paginated response from the Enterprise Training review manager. */
export interface ReviewsManageResponse {
  reviews: TrainingReview[];
  counts: { pending: number; approved: number; rejected: number; all: number };
  total: number;
  page: number;
  page_size: number;
}

/** Review moderation audit event returned by the API. */
export interface TrainingReviewAuditEntry {
  id: string;
  module: string;
  review_id: string;
  item_id: string;
  item_name: string | null;
  from_status: string | null;
  to_status: string;
  actor_user_id: string | null;
  actor_role: string | null;
  created_at: string | null;
}

/** Filters accepted by the Enterprise review manager. */
export interface EnterpriseTrainingReviewsParams {
  /** Filters the review queue to one Training UUID. */
  trainingId?: string;
  status?: ReviewModerationStatus | "all";
  page?: number;
  pageSize?: number;
  rating?: TrainingStarRating | "all";
  q?: string;
}
