/**
 * Event Discussions Production API Service.
 *
 * Implements authoritative backend API calls matching backend routes:
 * - GET  /api/v1/events/{event_id}/discussion/access
 * - GET  /api/v1/events/{event_id}/discussion/messages
 * - POST /api/v1/events/{event_id}/discussion/messages
 * - GET  /api/v1/events/{event_id}/discussion/messages/{message_id}
 * - GET  /api/v1/events/{event_id}/discussion/moderation/queue
 * - POST /api/v1/events/{event_id}/discussion/messages/{message_id}/decision
 * - GET  /api/v1/events/{event_id}/discussion/moderation/history
 * - POST /api/v1/events/{event_id}/discussion/messages/{message_id}/appeal
 */

import { authenticatedFetch } from "@ihp/auth";
import { plainTextFromHtml } from "@ihp/shared";
import type {
  CreateDiscussionMessagePayload,
  CreateDiscussionReplyPayload,
  CreateDiscussionResponse,
  DiscussionFilter,
  EventDiscussionAccess,
  EventDiscussionFlaggedItem,
  EventDiscussionMessage,
  EventDiscussionRole,
  EventDiscussionsListResponse,
  EventFlaggedDiscussionsResponse,
  EventModerationAuditEntry,
  EventModerationDecisionPayload,
} from "./event-discussions.types";

const fetch = authenticatedFetch;
const eventsBasePath = "/api/v1/events/";

/** Helper to extract structured error messages from backend responses. */
async function parseErrorResponse(response: Response, defaultMessage: string): Promise<string> {
  try {
    const data = (await response.json().catch(() => null)) as unknown;
    if (data && typeof data === "object") {
      const record = data as Record<string, unknown>;
      if (typeof record.message === "string" && record.message.trim()) {
        return record.message.trim();
      }
      if (typeof record.detail === "string" && record.detail.trim()) {
        return record.detail.trim();
      }
      if (Array.isArray(record.detail) && record.detail.length > 0) {
        const first = record.detail[0] as unknown;
        if (typeof first === "object" && first && "msg" in first && typeof (first as { msg: unknown }).msg === "string") {
          const detailObj = first as { msg: string; loc?: (string | number)[] };
          const field = Array.isArray(detailObj.loc) && detailObj.loc.length > 0 ? detailObj.loc[detailObj.loc.length - 1] : null;
          return field ? `${detailObj.msg}: ${field}` : detailObj.msg;
        }
      }
    }
  } catch {
    // Ignore JSON parse errors
  }
  return `${defaultMessage} (HTTP ${response.status})`;
}

/** Resolves author role across all backend schema variations (e.g. role, author_role, is_admin). */
export function resolveAuthorRole(raw: Record<string, unknown>): EventDiscussionRole {
  const authorObj = (raw.author && typeof raw.author === "object" ? raw.author : {}) as Record<string, unknown>;
  const senderObj = (raw.sender && typeof raw.sender === "object" ? raw.sender : {}) as Record<string, unknown>;
  const userObj = (raw.user && typeof raw.user === "object" ? raw.user : {}) as Record<string, unknown>;

  const isAnnouncement = Boolean(raw.is_announcement);
  const isAdmin = Boolean(
    raw.is_admin ||
    raw.is_enterprise_admin ||
    raw.is_organizer ||
    authorObj.is_admin ||
    senderObj.is_admin ||
    userObj.is_admin
  );
  const isSuper = Boolean(raw.is_super_admin || authorObj.is_super_admin);
  const isSpeaker = Boolean(raw.is_speaker || authorObj.is_speaker);

  const rawRole = String(
    raw.author_role ??
    raw.role ??
    raw.sender_role ??
    raw.user_role ??
    authorObj.role ??
    senderObj.role ??
    userObj.role ??
    ""
  ).toLowerCase().trim();

  if (isSuper || rawRole.includes("super")) return "super_admin";
  if (
    isAnnouncement ||
    isAdmin ||
    rawRole.includes("admin") ||
    rawRole.includes("organizer") ||
    rawRole.includes("host") ||
    rawRole === "enterprise" ||
    rawRole === "enterprise_admin"
  ) {
    return "enterprise_admin";
  }
  if (isSpeaker || rawRole.includes("speaker") || rawRole.includes("presenter")) return "speaker";
  return "registered_participant";
}

/** Resolves author name across all backend schema variations (e.g. author_name, sender_name, user_name, author.name, full_name). */
export function resolveAuthorName(raw: Record<string, unknown>, fallbackRoleLabel?: string): string {
  if (!raw || typeof raw !== "object") return fallbackRoleLabel || "Attendee";

  const authorObj = (raw.author && typeof raw.author === "object" ? raw.author : {}) as Record<string, unknown>;
  const senderObj = (raw.sender && typeof raw.sender === "object" ? raw.sender : {}) as Record<string, unknown>;
  const userObj = (raw.user && typeof raw.user === "object" ? raw.user : {}) as Record<string, unknown>;

  const candidates = [
    raw.author_name,
    raw.authorName,
    raw.sender_name,
    raw.senderName,
    raw.user_name,
    raw.userName,
    raw.full_name,
    raw.fullName,
    raw.name,
    raw.display_name,
    raw.displayName,
    authorObj.name,
    authorObj.full_name,
    authorObj.fullName,
    authorObj.display_name,
    authorObj.displayName,
    authorObj.username,
    senderObj.name,
    senderObj.full_name,
    senderObj.fullName,
    senderObj.display_name,
    senderObj.displayName,
    senderObj.username,
    userObj.name,
    userObj.full_name,
    userObj.fullName,
    userObj.display_name,
    userObj.displayName,
    userObj.username,
    raw.created_by_name,
    raw.creator_name,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  const first = String(raw.first_name || authorObj.first_name || senderObj.first_name || userObj.first_name || "").trim();
  const last = String(raw.last_name || authorObj.last_name || senderObj.last_name || userObj.last_name || "").trim();
  const combined = `${first} ${last}`.trim();
  if (combined) {
    return combined;
  }

  const emailCandidate = [
    raw.email,
    raw.author_email,
    authorObj.email,
    senderObj.email,
    userObj.email,
  ].find((e) => typeof e === "string" && e.trim());
  if (emailCandidate && typeof emailCandidate === "string") {
    const handle = emailCandidate.split("@")[0]?.trim();
    if (handle) {
      return handle.charAt(0).toUpperCase() + handle.slice(1);
    }
  }

  if (fallbackRoleLabel && fallbackRoleLabel.trim()) {
    return fallbackRoleLabel.trim();
  }

  return "Attendee";
}

/** Verifies attendee registration and discussion access eligibility. */
export async function getEventDiscussionAccess(eventId: string): Promise<EventDiscussionAccess> {
  const res = await fetch(`${eventsBasePath}${encodeURIComponent(eventId)}/discussion/access`, {
    credentials: "include",
    cache: "no-store",
  });

  if (!res.ok) {
    const message = await parseErrorResponse(res, "Failed to verify discussion access");
    throw new Error(message);
  }

  const raw = (await res.json()) as Record<string, unknown>;
  const canRead = Boolean(raw.can_read ?? raw.can_access);
  const canPost = Boolean(raw.can_post);
  const role = String(raw.role ?? "registered_participant");
  const lockedReason = (typeof raw.locked_reason === "string" ? raw.locked_reason : typeof raw.denial_reason === "string" ? raw.denial_reason : null) as EventDiscussionAccess["locked_reason"];
  const userMessage = typeof raw.message === "string" ? raw.message : null;

  return {
    can_read: canRead,
    can_post: canPost,
    role,
    locked_reason: lockedReason,
    message: userMessage,
    can_access: canRead,
    is_registered: lockedReason !== "NOT_REGISTERED" && lockedReason !== "REGISTRATION_CANCELLED",
    is_admin: role === "enterprise_admin" || role === "super_admin",
    is_discussion_locked: !canPost && canRead,
  };
}

/** Lists paginated published event discussions with optional filter. */
export async function listEventDiscussions(
  eventId: string,
  filter: DiscussionFilter = "all",
  page = 1,
  pageSize = 20,
  parentId?: string | null,
  order: "oldest" | "newest" = "newest",
): Promise<EventDiscussionsListResponse> {
  const query = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
    order,
  });
  if (filter && filter !== "all") {
    query.set("filter", filter);
  }
  if (parentId) {
    query.set("parent_id", parentId);
  }

  const url =
    filter === "my_messages"
      ? `${eventsBasePath}${encodeURIComponent(eventId)}/discussion/messages/mine?${query.toString()}`
      : `${eventsBasePath}${encodeURIComponent(eventId)}/discussion/messages?${query.toString()}`;

  let res = await fetch(url, {
    credentials: "include",
    cache: "no-store",
  });

  // If backend route /messages/mine is not mounted, fall back to ?filter=my_messages
  if (!res.ok && res.status === 404 && filter === "my_messages") {
    res = await fetch(`${eventsBasePath}${encodeURIComponent(eventId)}/discussion/messages?${query.toString()}`, {
      credentials: "include",
      cache: "no-store",
    });
  }

  if (!res.ok) {
    const message = await parseErrorResponse(res, "Failed to load discussions");
    throw new Error(message);
  }

  const data = (await res.json()) as EventDiscussionsListResponse;
  return {
    ...data,
    items: (data.items ?? []).map((item) => ({
      ...item,
      author_name: resolveAuthorName(item as unknown as Record<string, unknown>, item.author_name),
      author_role: resolveAuthorRole(item as unknown as Record<string, unknown>),
      content: plainTextFromHtml(item.content || item.body || ""),
      replies: item.replies?.map((r) => ({
        ...r,
        author_name: resolveAuthorName(r as unknown as Record<string, unknown>, r.author_name),
        author_role: resolveAuthorRole(r as unknown as Record<string, unknown>),
        content: plainTextFromHtml(r.content || r.body || ""),
      })),
    })),
  };
}

/** Lists current user's own event discussion messages via /messages/mine?status=. */
export async function listMyEventDiscussions(
  eventId: string,
  status?: string,
  page = 1,
  pageSize = 20,
): Promise<EventDiscussionsListResponse> {
  const query = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  if (status) {
    query.set("status", status);
  }

  const res = await fetch(`${eventsBasePath}${encodeURIComponent(eventId)}/discussion/messages/mine?${query.toString()}`, {
    credentials: "include",
    cache: "no-store",
  });

  if (!res.ok) {
    if (res.status === 404) {
      return listEventDiscussions(eventId, "my_messages", page, pageSize);
    }
    const message = await parseErrorResponse(res, "Failed to load your discussion messages");
    throw new Error(message);
  }

  const data = (await res.json()) as EventDiscussionsListResponse;
  return {
    ...data,
    items: (data.items ?? []).map((item) => ({
      ...item,
      author_name: resolveAuthorName(item as unknown as Record<string, unknown>, item.author_name),
      author_role: resolveAuthorRole(item as unknown as Record<string, unknown>),
      content: plainTextFromHtml(item.content || item.body || ""),
      replies: item.replies?.map((r) => ({
        ...r,
        author_name: resolveAuthorName(r as unknown as Record<string, unknown>, r.author_name),
        author_role: resolveAuthorRole(r as unknown as Record<string, unknown>),
        content: plainTextFromHtml(r.content || r.body || ""),
      })),
    })),
  };
}

/** Retrieves a single message thread and its replies for deep-linking. */
export async function getEventDiscussionThread(eventId: string, messageId: string): Promise<EventDiscussionMessage> {
  const res = await fetch(`${eventsBasePath}${encodeURIComponent(eventId)}/discussion/messages/${encodeURIComponent(messageId)}`, {
    credentials: "include",
    cache: "no-store",
  });

  if (res.status === 404) {
    throw new Error("This message is no longer available.");
  }

  if (!res.ok) {
    const message = await parseErrorResponse(res, "Failed to load discussion thread");
    throw new Error(message);
  }

  const item = (await res.json()) as EventDiscussionMessage;
  return {
    ...item,
    author_name: resolveAuthorName(item as unknown as Record<string, unknown>, item.author_name),
    author_role: resolveAuthorRole(item as unknown as Record<string, unknown>),
    content: plainTextFromHtml(item.content || item.body || ""),
    replies: (item.replies ?? []).map((r) => ({
      ...r,
      author_name: resolveAuthorName(r as unknown as Record<string, unknown>, r.author_name),
      author_role: resolveAuthorRole(r as unknown as Record<string, unknown>),
      content: plainTextFromHtml(r.content || r.body || ""),
    })),
  };
}

/** Creates a new discussion message or announcement. */
export async function createEventDiscussion(
  eventId: string,
  payload: CreateDiscussionMessagePayload,
): Promise<CreateDiscussionResponse> {
  const content = plainTextFromHtml(payload.content.trim());
  if (!content) {
    throw new Error("Message content cannot be empty.");
  }

  const res = await fetch(`${eventsBasePath}${encodeURIComponent(eventId)}/discussion/messages`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      body: content,
      content,
      parent_id: payload.parent_id ?? null,
      is_announcement: Boolean(payload.is_announcement),
    }),
  });

  if (!res.ok && res.status !== 201) {
    const message = await parseErrorResponse(res, "Failed to submit discussion message");
    throw new Error(message);
  }

  const resBody = (await res.json()) as Record<string, unknown>;
  const rawMessage = resBody.message && typeof resBody.message === "object" ? (resBody.message as Record<string, unknown>) : null;
  const rawStatus = String(rawMessage?.moderation_status ?? rawMessage?.status ?? resBody.status ?? resBody.moderation_status ?? "published").toLowerCase();
  const status = (rawStatus === "blocked" || rawStatus === "pending_review" || rawStatus === "pending_moderation" ? rawStatus : "published") as CreateDiscussionResponse["status"];
  const userMessage = (
    typeof resBody.user_message === "string" ? resBody.user_message :
    typeof resBody.display_notice === "string" ? resBody.display_notice :
    typeof resBody.message === "string" ? resBody.message :
    typeof rawMessage?.user_message === "string" ? rawMessage.user_message :
    typeof rawMessage?.moderation_reason === "string" ? rawMessage.moderation_reason :
    null
  );
  const messageId = String(rawMessage?.id ?? resBody.id ?? resBody.message_id ?? "");

  return {
    status,
    message: rawMessage
      ? {
          ...(rawMessage as unknown as EventDiscussionMessage),
          author_name: resolveAuthorName(rawMessage, typeof rawMessage.author_name === "string" ? rawMessage.author_name : undefined),
          author_role: resolveAuthorRole(rawMessage),
          content: plainTextFromHtml(String(rawMessage.content || rawMessage.body || "")),
        }
      : undefined,
    user_message: userMessage,
    display_notice: userMessage ?? undefined,
    message_id: messageId || undefined,
    can_retry: status === "blocked",
  };
}

/** Posts a reply to an existing discussion thread. */
export async function createEventDiscussionReply(
  eventId: string,
  messageId: string,
  payload: CreateDiscussionReplyPayload,
): Promise<CreateDiscussionResponse> {
  return createEventDiscussion(eventId, {
    content: payload.content,
    parent_id: messageId,
    is_announcement: false,
  });
}

/** Edits a blocked or pending moderation message. */
export async function editEventDiscussionMessage(
  eventId: string,
  messageId: string,
  content: string,
): Promise<CreateDiscussionResponse> {
  const sanitized = plainTextFromHtml(content.trim());
  if (!sanitized) {
    throw new Error("Message content cannot be empty.");
  }

  const res = await fetch(`${eventsBasePath}${encodeURIComponent(eventId)}/discussion/messages/${encodeURIComponent(messageId)}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      body: sanitized,
      content: sanitized,
    }),
  });

  if (!res.ok && res.status !== 201) {
    const message = await parseErrorResponse(res, "Failed to update discussion message");
    throw new Error(message);
  }

  const resBody = (await res.json()) as Record<string, unknown>;
  const rawMessage = resBody.message && typeof resBody.message === "object" ? (resBody.message as Record<string, unknown>) : null;
  const rawStatus = String(rawMessage?.moderation_status ?? rawMessage?.status ?? resBody.status ?? resBody.moderation_status ?? "published").toLowerCase();
  const status = (rawStatus === "blocked" || rawStatus === "pending_review" || rawStatus === "pending_moderation" ? rawStatus : "published") as CreateDiscussionResponse["status"];
  const userMessage = (
    typeof resBody.user_message === "string" ? resBody.user_message :
    typeof resBody.display_notice === "string" ? resBody.display_notice :
    typeof resBody.message === "string" ? resBody.message :
    typeof rawMessage?.user_message === "string" ? rawMessage.user_message :
    typeof rawMessage?.moderation_reason === "string" ? rawMessage.moderation_reason :
    null
  );
  const resolvedId = String(rawMessage?.id ?? resBody.id ?? resBody.message_id ?? messageId);

  return {
    status,
    message: rawMessage
      ? {
          ...(rawMessage as unknown as EventDiscussionMessage),
          author_name: resolveAuthorName(rawMessage, typeof rawMessage.author_name === "string" ? rawMessage.author_name : undefined),
          author_role: resolveAuthorRole(rawMessage),
          content: plainTextFromHtml(String(rawMessage.content || rawMessage.body || "")),
        }
      : undefined,
    user_message: userMessage,
    display_notice: userMessage ?? undefined,
    message_id: resolvedId,
    can_retry: status === "blocked",
  };
}

/** Submits an appeal for an AI-blocked message. */
export async function appealEventDiscussionMessage(
  eventId: string,
  messageId: string,
  reason?: string,
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${eventsBasePath}${encodeURIComponent(eventId)}/discussion/messages/${encodeURIComponent(messageId)}/appeal`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason: reason || "False positive appeal requested by attendee." }),
  });

  if (res.status === 409) {
    throw new Error("An appeal has already been submitted for this message.");
  }

  if (!res.ok) {
    const message = await parseErrorResponse(res, "Failed to submit appeal");
    throw new Error(message);
  }

  return { success: true, message: "Appeal submitted. Your message is now pending manual admin review." };
}

/** Lists flagged discussion messages pending Enterprise Admin review. */
export async function listEventFlaggedDiscussions(eventId: string): Promise<EventFlaggedDiscussionsResponse> {
  const res = await fetch(`${eventsBasePath}${encodeURIComponent(eventId)}/discussion/moderation/queue`, {
    credentials: "include",
    cache: "no-store",
  });

  if (!res.ok) {
    const message = await parseErrorResponse(res, "Failed to load flagged messages");
    throw new Error(message);
  }

  const rawData = (await res.json()) as Record<string, unknown> | unknown[];
  let rawList: unknown[] = [];
  let totalPending: number | undefined;

  if (Array.isArray(rawData)) {
    rawList = rawData;
    totalPending = rawData.length;
  } else if (rawData && typeof rawData === "object") {
    if (Array.isArray(rawData.items)) {
      rawList = rawData.items;
    } else if (Array.isArray(rawData.data)) {
      rawList = rawData.data;
    } else if (Array.isArray(rawData.messages)) {
      rawList = rawData.messages;
    } else if (Array.isArray(rawData.queue)) {
      rawList = rawData.queue;
    }
    if (typeof rawData.total_pending === "number") {
      totalPending = rawData.total_pending;
    } else if (typeof rawData.total === "number") {
      totalPending = rawData.total;
    } else {
      totalPending = rawList.length;
    }
  }

  const items: EventDiscussionFlaggedItem[] = rawList.map((entry, index) => {
    const raw = (entry && typeof entry === "object" ? entry : {}) as Record<string, unknown>;
    const id = String(raw.id ?? raw.message_id ?? raw._id ?? `flagged-${index}`);
    const resolvedEventId = String(raw.event_id ?? eventId);
    const senderId = String(raw.sender_id ?? raw.author_id ?? raw.user_id ?? "");
    const senderName = resolveAuthorName(raw, typeof raw.sender_name === "string" ? raw.sender_name : undefined);
    const content = plainTextFromHtml(String(raw.content ?? raw.body ?? raw.text ?? raw.message ?? ""));

    const rawCreatedAt = raw.created_at ?? raw.created ?? raw.submitted_at ?? raw.timestamp ?? raw.created_date;
    let createdAt = "";
    if (typeof rawCreatedAt === "string" && rawCreatedAt.trim()) {
      createdAt = rawCreatedAt.trim();
    } else if (typeof rawCreatedAt === "number" && Number.isFinite(rawCreatedAt)) {
      createdAt = new Date(rawCreatedAt > 1e11 ? rawCreatedAt : rawCreatedAt * 1000).toISOString();
    } else {
      createdAt = new Date().toISOString();
    }

    const flagReason = (
      typeof raw.ai_flag_reason === "string" && raw.ai_flag_reason.trim() ? raw.ai_flag_reason.trim() :
      typeof raw.reason === "string" && raw.reason.trim() ? raw.reason.trim() :
      typeof raw.flag_reason === "string" && raw.flag_reason.trim() ? raw.flag_reason.trim() :
      typeof raw.moderation_reason === "string" && raw.moderation_reason.trim() ? raw.moderation_reason.trim() :
      typeof raw.rule_violation === "string" && raw.rule_violation.trim() ? raw.rule_violation.trim() :
      typeof raw.details === "string" && raw.details.trim() ? raw.details.trim() :
      "Flagged by discussion moderation policy"
    );

    let categories: string[] = [];
    const rawCats = raw.ai_categories ?? raw.categories ?? raw.flag_categories;
    if (Array.isArray(rawCats)) {
      categories = rawCats.map((c) => String(c).trim()).filter(Boolean);
    } else if (typeof rawCats === "string" && rawCats.trim()) {
      categories = [rawCats.trim()];
    }

    const confidence = typeof raw.confidence === "number" ? raw.confidence : typeof raw.score === "number" ? raw.score : undefined;
    const isAppeal = Boolean(raw.is_appeal ?? raw.appealed ?? raw.appeal);

    return {
      id,
      event_id: resolvedEventId,
      event_title: typeof raw.event_title === "string" ? raw.event_title : null,
      sender_id: senderId,
      sender_name: senderName,
      content,
      body: content,
      created_at: createdAt,
      ai_flag_reason: flagReason,
      ai_categories: categories,
      confidence,
      moderation_status: "pending_review",
      is_appeal: isAppeal,
    };
  });

  return {
    items,
    total_pending: totalPending ?? items.length,
  };
}

/** Approves or Deletes a flagged discussion message via /decision. */
export async function moderateEventDiscussion(
  eventId: string,
  messageId: string,
  payload: EventModerationDecisionPayload,
): Promise<{ success: boolean; status: string }> {
  if (!messageId || messageId === "undefined" || messageId === "null") {
    throw new Error("Invalid message ID for moderation decision.");
  }
  const note = payload.note ?? payload.reason;
  const res = await fetch(`${eventsBasePath}${encodeURIComponent(eventId)}/discussion/messages/${encodeURIComponent(messageId)}/decision`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: payload.action,
      note,
      reason: note,
    }),
  });

  if (!res.ok) {
    const message = await parseErrorResponse(res, `Failed to ${payload.action} message`);
    throw new Error(message);
  }

  const data = (await res.json()) as { success: boolean; status: string };
  return data;
}

/** Retrieves moderation audit history for Super Admin oversight. */
export async function getEventDiscussionModerationHistory(eventId: string): Promise<readonly EventModerationAuditEntry[]> {
  const res = await fetch(`${eventsBasePath}${encodeURIComponent(eventId)}/discussion/moderation/history`, {
    credentials: "include",
    cache: "no-store",
  });

  if (!res.ok) {
    const message = await parseErrorResponse(res, "Failed to load moderation history");
    throw new Error(message);
  }

  const data = (await res.json()) as readonly EventModerationAuditEntry[];
  return data;
}
