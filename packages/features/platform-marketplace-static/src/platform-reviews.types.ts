/** Supported review modules in the platform moderation queue. */
export type ReviewModule = "training" | "event" | "product" | "service";

/** Review moderation states returned by the backend. */
export type ReviewModerationStatus = "pending" | "approved" | "rejected";

/** Whole number review ratings. */
export type StarRating = 1 | 2 | 3 | 4 | 5;

/** Normalized review row shown to Platform Admins. */
export interface PlatformReviewQueueItem {
  review_id: string;
  item_id: string;
  item_name: string;
  module: ReviewModule;
  business_name: string;
  tenant_id: string | null;
  rating: StarRating | null;
  comment: string | null;
  reviewer_name: string;
  reviewer_email: string | null;
  is_verified: boolean;
  moderation_status: ReviewModerationStatus;
  reason?: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/** Normalized paginated review queue response. */
export interface PlatformReviewsManageResponse {
  items: PlatformReviewQueueItem[];
  counts: { pending: number; approved: number; rejected: number; all: number };
  pagination: { page: number; page_size: number; total: number; total_pages: number };
}

/** Moderation audit record returned by the review service. */
export interface PlatformReviewAuditEntry {
  id: string;
  module: ReviewModule;
  review_id: string;
  item_id: string;
  item_name: string | null;
  business_name: string | null;
  customer_name: string | null;
  rating: StarRating | null;
  comment: string | null;
  from_status: string | null;
  to_status: string;
  actor_name: string | null;
  actor_user_id: string | null;
  actor_role: string | null;
  created_at: string | null;
  reason?: string | null;
}

/** Search and pagination arguments for platform review management. */
export interface PlatformReviewsParams {
  module: ReviewModule;
  status?: ReviewModerationStatus | "all";
  rating?: StarRating | "all";
  q?: string;
  itemId?: string;
  tenantId?: string;
  page?: number;
  pageSize?: number;
}
