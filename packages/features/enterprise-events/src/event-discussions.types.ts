/**
 * Event Discussions TypeScript Contracts and Types.
 *
 * Adheres to Invigorate Health standards:
 * - Strict typing with no `any`
 * - RFC 9457 structured error compatibility
 * - ISO-8601 UTC timestamps
 * - Aligned with backend router paths and payload schemas
 */

export type EventDiscussionRole = "registered_participant" | "enterprise_admin" | "speaker" | "super_admin";

export type EventDiscussionModerationStatus = "published" | "pending_review" | "blocked" | "pending_moderation" | "deleted";

export type DiscussionFilter = "all" | "announcements" | "my_messages";

/** A single threaded reply within a discussion */
export interface EventDiscussionReply {
  id: string;
  event_id: string;
  parent_id: string;
  author_id: string;
  author_name: string;
  author_avatar_url?: string | null;
  author_role: EventDiscussionRole;
  content: string;
  body?: string;
  is_announcement: boolean;
  moderation_status: EventDiscussionModerationStatus;
  moderation_reason?: string | null;
  is_appeal?: boolean;
  created_at: string;
  updated_at?: string | null;
}

/** Root event discussion message thread */
export interface EventDiscussionMessage {
  id: string;
  event_id: string;
  parent_id: string | null;
  author_id: string;
  author_name: string;
  author_avatar_url?: string | null;
  author_role: EventDiscussionRole;
  content: string;
  body?: string;
  is_announcement: boolean;
  moderation_status: EventDiscussionModerationStatus;
  moderation_reason?: string | null;
  reply_count: number;
  is_appeal?: boolean;
  created_at: string;
  updated_at?: string | null;
  replies?: readonly EventDiscussionReply[];
}

/** Event discussion gating access check result from GET /discussion/access */
export interface EventDiscussionAccess {
  can_read: boolean;
  can_post: boolean;
  role: string;
  locked_reason?: "NOT_REGISTERED" | "REGISTRATION_CANCELLED" | "NOT_EVENT_ADMIN" | string | null;
  message?: string | null;
  can_access?: boolean;
  is_registered?: boolean;
  is_admin?: boolean;
  is_discussion_locked?: boolean;
  registration_status?: string;
  denial_reason?: string | null;
}

/** Flagged message review item for Enterprise Admin */
export interface EventDiscussionFlaggedItem {
  id: string;
  event_id: string;
  event_title?: string | null;
  sender_id: string;
  sender_name: string;
  content: string;
  body?: string;
  created_at: string;
  ai_flag_reason?: string;
  ai_categories?: readonly string[];
  confidence?: number;
  moderation_status: "pending_review";
  is_appeal?: boolean;
}

/** Enterprise Admin moderation action payload for POST /discussion/messages/{id}/decision */
export interface EventModerationDecisionPayload {
  action: "approve" | "delete";
  note?: string;
  reason?: string;
}

/** Moderation audit log entry from GET /discussion/moderation/history */
export interface EventModerationAuditEntry {
  id: string;
  event_id: string;
  message_id: string;
  message_content_snapshot: string;
  author_id: string;
  author_name: string;
  action: "ai_approved" | "ai_flagged" | "ai_blocked" | "admin_approved" | "admin_deleted";
  action_by: string;
  action_by_name: string;
  reason?: string | null;
  is_appeal?: boolean;
  created_at: string;
}

/** Submission payload for creating a discussion message */
export interface CreateDiscussionMessagePayload {
  content: string;
  body?: string;
  parent_id?: string | null;
  is_announcement?: boolean;
}

/** Submission payload for replying to a message */
export interface CreateDiscussionReplyPayload {
  content: string;
  body?: string;
}

/** 3-tier moderation outcome response from POST /discussion/messages */
export interface CreateDiscussionResponse {
  status: "published" | "pending_review" | "blocked" | "pending_moderation";
  message?: EventDiscussionMessage;
  reply?: EventDiscussionReply;
  message_id?: string;
  user_message?: string | null;
  display_notice?: string;
  code?: string;
  can_retry?: boolean;
  is_appeal?: boolean;
}

export interface EventDiscussionsListResponse {
  items: readonly EventDiscussionMessage[];
  pagination: {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  };
}

export interface EventFlaggedDiscussionsResponse {
  items: readonly EventDiscussionFlaggedItem[];
  total_pending: number;
}
