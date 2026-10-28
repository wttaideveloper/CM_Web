import type { GroupChatMessage } from "./group-chat.types";

/** Event names documented for Group Chat Socket.IO delivery. */
export const GROUP_CHAT_SOCKET_EVENT_NAMES = [
  "new_message",
  "group_read",
  "message_updated",
  "message_hidden",
  "message_pinned",
  "reaction_updated",
  "member_joined",
  "member_left",
  "member_removed",
  "member_role_changed",
  "group_updated",
  "group_closed",
  "group_reopened",
  "group_invitation",
  "posting_muted",
  "posting_unmuted",
] as const;

/** A documented Group Chat Socket.IO event name. */
export type GroupChatSocketEventKind = typeof GROUP_CHAT_SOCKET_EVENT_NAMES[number];

/** Group message events handled by the active Group room subscription in Phase 4C-1. */
export const GROUP_CHAT_LIVE_MESSAGE_EVENT_NAMES = [
  "message_updated",
  "message_hidden",
  "reaction_updated",
  "message_pinned",
] as const;

export type GroupChatLiveMessageEventKind = typeof GROUP_CHAT_LIVE_MESSAGE_EVENT_NAMES[number];

/** Group membership events handled by the active Group room subscription in Phase 4C-2. */
export const GROUP_CHAT_MEMBERSHIP_EVENT_NAMES = [
  "member_joined",
  "member_left",
  "member_removed",
  "member_role_changed",
] as const;

export type GroupChatMembershipEventKind = typeof GROUP_CHAT_MEMBERSHIP_EVENT_NAMES[number];

/** Group lifecycle events handled by the active Group room subscription. */
export const GROUP_CHAT_LIFECYCLE_EVENT_NAMES = [
  "group_updated",
  "group_closed",
  "group_reopened",
] as const;

export type GroupChatLifecycleEventKind = typeof GROUP_CHAT_LIFECYCLE_EVENT_NAMES[number];

/** Personal-room Group events delivered to the authenticated user without a selected Group room. */
export const GROUP_CHAT_PERSONAL_EVENT_NAMES = [
  "group_invitation",
  "member_removed",
  "posting_muted",
  "posting_unmuted",
] as const;

export type GroupChatPersonalEventKind = typeof GROUP_CHAT_PERSONAL_EVENT_NAMES[number];

/** The REST-compatible message fields that can be safely retained from a socket event. */
export type GroupChatSocketMessage = Pick<GroupChatMessage, "id" | "conversation_id" | "sender_id" | "created_at"> &
  Partial<Omit<GroupChatMessage, "id" | "conversation_id" | "sender_id" | "created_at" | "sender_name">> & {
    sender_name?: string;
  };

type GroupChatSocketEventBase = {
  conversation_type: "group";
  conversation_id: string;
};

/** A strictly normalized Group Chat socket event. */
export type GroupChatSocketEvent =
  | (GroupChatSocketEventBase & { event: "new_message"; message: GroupChatSocketMessage })
  | (GroupChatSocketEventBase & { event: "message_updated"; message: GroupChatSocketMessage })
  | (GroupChatSocketEventBase & { event: "group_read"; user_id: string; read_at: string; read_through_message_id?: string | null })
  | (GroupChatSocketEventBase & { event: "message_hidden"; message_id: string; status: GroupChatHiddenMessageStatus; placeholder: string | null })
  | (GroupChatSocketEventBase & { event: "message_pinned"; message_id: string; pinned: boolean })
  | (GroupChatSocketEventBase & { event: "reaction_updated"; message_id: string; reactions: Record<string, number> })
  | (GroupChatSocketEventBase & { event: "member_joined"; user_id: string; role: string; kind: string })
  | (GroupChatSocketEventBase & { event: "member_left"; user_id: string })
  | (GroupChatSocketEventBase & { event: "member_removed"; user_id: string })
  | (GroupChatSocketEventBase & { event: "member_role_changed"; user_id: string; role: string })
  | (GroupChatSocketEventBase & { event: "group_updated"; changed_fields?: Record<string, unknown> })
  | (GroupChatSocketEventBase & { event: "group_closed"; closed_at: string })
  | (GroupChatSocketEventBase & { event: "group_reopened" })
  | (GroupChatSocketEventBase & { event: "group_invitation" | "posting_unmuted" })
  | (GroupChatSocketEventBase & { event: "posting_muted"; until: string | null });

/** A strictly normalized event owned by the active Group message subscription. */
export type GroupChatLiveMessageEvent = Extract<GroupChatSocketEvent, { event: GroupChatLiveMessageEventKind }>;

/** A strictly normalized event owned by the active Group membership subscription. */
export type GroupChatMembershipEvent = Extract<GroupChatSocketEvent, { event: GroupChatMembershipEventKind }>;

/** A strictly normalized Group lifecycle event. */
export type GroupChatLifecycleEvent = Extract<GroupChatSocketEvent, { event: GroupChatLifecycleEventKind }>;

/** A strictly normalized personal-room Group event. */
export type GroupChatPersonalEvent = Extract<GroupChatSocketEvent, { event: GroupChatPersonalEventKind }>;

/** Safe status values already used by the Group Chat REST message model. */
export const GROUP_CHAT_HIDDEN_MESSAGE_STATUSES = ["hidden", "retracted", "removed_by_admin"] as const;

type GroupChatHiddenMessageStatus = typeof GROUP_CHAT_HIDDEN_MESSAGE_STATUSES[number];

/** REST cache areas that a future Group Chat socket consumer may invalidate. */
export type GroupChatSocketInvalidationTarget = "messages" | "group" | "members" | "groups" | "read-status";

/** The acknowledgement shape accepted for a Group room join. */
export type GroupChatJoinedRoomAcknowledgement = {
  conversation_id: string;
  room: string;
  authorized: true;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());
}

function isDateTime(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && !Number.isNaN(Date.parse(value));
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isGroupChatSocketEventKind(value: string): value is GroupChatSocketEventKind {
  return (GROUP_CHAT_SOCKET_EVENT_NAMES as readonly string[]).includes(value);
}

export function isGroupChatLiveMessageEventKind(value: string): value is GroupChatLiveMessageEventKind {
  return (GROUP_CHAT_LIVE_MESSAGE_EVENT_NAMES as readonly string[]).includes(value);
}

export function isGroupChatLiveMessageEvent(value: GroupChatSocketEvent): value is GroupChatLiveMessageEvent {
  return isGroupChatLiveMessageEventKind(value.event);
}

export function isGroupChatMembershipEventKind(value: string): value is GroupChatMembershipEventKind {
  return (GROUP_CHAT_MEMBERSHIP_EVENT_NAMES as readonly string[]).includes(value);
}

export function isGroupChatMembershipEvent(value: GroupChatSocketEvent): value is GroupChatMembershipEvent {
  return isGroupChatMembershipEventKind(value.event);
}

/** Returns whether a normalized event belongs to the Group lifecycle subscription. */
export function isGroupChatLifecycleEventKind(value: string): value is GroupChatLifecycleEventKind {
  return (GROUP_CHAT_LIFECYCLE_EVENT_NAMES as readonly string[]).includes(value);
}

/** Returns whether a validated event is a Group lifecycle event. */
export function isGroupChatLifecycleEvent(value: GroupChatSocketEvent): value is GroupChatLifecycleEvent {
  return isGroupChatLifecycleEventKind(value.event);
}

/** Returns whether a validated event belongs to the personal-room Group subscription. */
export function isGroupChatPersonalEventKind(value: string): value is GroupChatPersonalEventKind {
  return (GROUP_CHAT_PERSONAL_EVENT_NAMES as readonly string[]).includes(value);
}

/** Returns whether a validated event belongs to the personal-room Group subscription. */
export function isGroupChatPersonalEvent(value: GroupChatSocketEvent): value is GroupChatPersonalEvent {
  return isGroupChatPersonalEventKind(value.event);
}

/** Coalesces identical lifecycle packets without suppressing a changed authoritative event. */
export function shouldProcessGroupChatLifecycleEvent(signatures: Set<string>, event: GroupChatLifecycleEvent): boolean {
  const signature = JSON.stringify(event);
  if (signatures.has(signature)) return false;
  signatures.add(signature);
  return true;
}

/** Identifies only a validated removal event targeting the authenticated user. */
export function isGroupChatCurrentUserRemoval(event: GroupChatMembershipEvent, currentUserId: string): boolean {
  return event.event === "member_removed" && currentUserId.trim().length > 0 && event.user_id.trim().toLowerCase() === currentUserId.trim().toLowerCase();
}

function isSafeHiddenMessageStatus(value: unknown): value is GroupChatHiddenMessageStatus {
  return (GROUP_CHAT_HIDDEN_MESSAGE_STATUSES as readonly string[]).includes(value as string);
}

function normalizeSocketMessage(value: unknown, envelopeConversationId: string): GroupChatSocketMessage | null {
  if (!isRecord(value)) return null;
  const id = value.id;
  const conversationId = value.conversation_id;
  const senderId = value.sender_id;
  const createdAt = value.created_at;
  if (!isUuid(id) || !isUuid(conversationId) || conversationId.toLowerCase() !== envelopeConversationId.toLowerCase() || !isUuid(senderId) || !isDateTime(createdAt)) return null;

  const message: GroupChatSocketMessage = {
    id: id.trim(),
    conversation_id: conversationId.trim(),
    sender_id: senderId.trim(),
    created_at: createdAt.trim(),
  };
  if (typeof value.sender_name === "string") message.sender_name = value.sender_name;
  if (typeof value.sender_kind === "string") message.sender_kind = value.sender_kind;
  if (typeof value.message_type === "string") message.message_type = value.message_type;
  if (typeof value.status === "string") message.status = value.status;
  if (value.content === null || typeof value.content === "string") message.content = value.content;
  if (value.placeholder === null || typeof value.placeholder === "string") message.placeholder = value.placeholder;
  return message;
}

function normalizeReactionCounts(value: unknown): Record<string, number> | null {
  if (!isRecord(value)) return null;
  const entries = Object.entries(value);
  if (entries.some(([emoji, count]) => !emoji.trim() || typeof count !== "number" || !Number.isInteger(count) || count < 0)) return null;
  return Object.fromEntries(entries) as Record<string, number>;
}

function normalizeEnvelope(kind: string, value: unknown, expectedGroupId?: string): { kind: GroupChatSocketEventKind; conversationId: string; record: Record<string, unknown> } | null {
  if (!isGroupChatSocketEventKind(kind) || !isRecord(value) || value.conversation_type !== "group" || !isUuid(value.conversation_id)) return null;
  const conversationId = value.conversation_id.trim();
  if (expectedGroupId !== undefined && (!isUuid(expectedGroupId) || expectedGroupId.trim().toLowerCase() !== conversationId.toLowerCase())) return null;
  return { kind, conversationId, record: value };
}

/** Strictly validates the documented acknowledgement for the selected Group room. */
export function normalizeGroupChatJoinedRoomAcknowledgement(value: unknown, expectedGroupId: string): GroupChatJoinedRoomAcknowledgement | null {
  if (!isRecord(value) || !isUuid(expectedGroupId) || !isUuid(value.conversation_id) || value.conversation_id.trim().toLowerCase() !== expectedGroupId.trim().toLowerCase() || value.authorized !== true) return null;
  const expectedRoom = `conversation:${expectedGroupId.trim()}`;
  return value.room === expectedRoom ? { conversation_id: value.conversation_id.trim(), room: value.room, authorized: true } : null;
}

/** Strictly normalizes one documented Group Chat socket payload without changing application state. */
export function normalizeGroupChatSocketEvent(kind: string, value: unknown, expectedGroupId?: string): GroupChatSocketEvent | null {
  const envelope = normalizeEnvelope(kind, value, expectedGroupId);
  if (!envelope) return null;
  const { record, conversationId } = envelope;

  switch (envelope.kind) {
    case "new_message":
    case "message_updated": {
      const message = normalizeSocketMessage(record.message, conversationId);
      return message ? { event: envelope.kind, conversation_type: "group", conversation_id: conversationId, message } : null;
    }
    case "group_read":
      if (!isUuid(record.user_id) || !isDateTime(record.read_at)) return null;
      if (record.read_through_message_id !== undefined && record.read_through_message_id !== null && !isUuid(record.read_through_message_id)) return null;
      return {
        event: envelope.kind,
        conversation_type: "group",
        conversation_id: conversationId,
        user_id: record.user_id.trim(),
        read_at: record.read_at.trim(),
        ...(record.read_through_message_id !== undefined ? { read_through_message_id: record.read_through_message_id === null ? null : record.read_through_message_id.trim() } : {}),
      };
    case "message_hidden":
      return isUuid(record.message_id) && isSafeHiddenMessageStatus(record.status) && (record.placeholder === null || typeof record.placeholder === "string")
        ? { event: envelope.kind, conversation_type: "group", conversation_id: conversationId, message_id: record.message_id.trim(), status: record.status, placeholder: record.placeholder }
        : null;
    case "message_pinned":
      return isUuid(record.message_id) && typeof record.pinned === "boolean"
        ? { event: envelope.kind, conversation_type: "group", conversation_id: conversationId, message_id: record.message_id.trim(), pinned: record.pinned }
        : null;
    case "reaction_updated": {
      const reactions = normalizeReactionCounts(record.reactions);
      return isUuid(record.message_id) && reactions ? { event: envelope.kind, conversation_type: "group", conversation_id: conversationId, message_id: record.message_id.trim(), reactions } : null;
    }
    case "member_joined":
      return isUuid(record.user_id) && isNonEmptyString(record.role) && isNonEmptyString(record.kind)
        ? { event: envelope.kind, conversation_type: "group", conversation_id: conversationId, user_id: record.user_id.trim(), role: record.role.trim(), kind: record.kind.trim() }
        : null;
    case "member_left":
    case "member_removed":
      return isUuid(record.user_id) ? { event: envelope.kind, conversation_type: "group", conversation_id: conversationId, user_id: record.user_id.trim() } : null;
    case "member_role_changed":
      return isUuid(record.user_id) && isNonEmptyString(record.role)
        ? { event: envelope.kind, conversation_type: "group", conversation_id: conversationId, user_id: record.user_id.trim(), role: record.role.trim() }
        : null;
    case "group_updated":
      if (record.changed_fields !== undefined && !isRecord(record.changed_fields)) return null;
      return {
        event: envelope.kind,
        conversation_type: "group",
        conversation_id: conversationId,
        ...(record.changed_fields !== undefined ? { changed_fields: { ...record.changed_fields as Record<string, unknown> } } : {}),
      };
    case "group_closed":
      return isDateTime(record.closed_at) ? { event: envelope.kind, conversation_type: "group", conversation_id: conversationId, closed_at: record.closed_at.trim() } : null;
    case "posting_muted":
      return (record.until === null || isDateTime(record.until))
        ? { event: envelope.kind, conversation_type: "group", conversation_id: conversationId, until: record.until === null ? null : record.until.trim() }
        : null;
    case "group_reopened":
    case "group_invitation":
    case "posting_unmuted":
      return { event: envelope.kind, conversation_type: "group", conversation_id: conversationId };
  }
}

/** Returns whether a validated socket event belongs to the expected Group Chat. */
export function isGroupChatSocketEventForGroup(event: GroupChatSocketEvent, groupId: string): boolean {
  return isUuid(groupId) && event.conversation_id.toLowerCase() === groupId.trim().toLowerCase();
}

/** Deduplicates validated socket messages while preserving their first-seen order. */
export function deduplicateGroupChatSocketMessages(messages: readonly GroupChatSocketMessage[]): GroupChatSocketMessage[] {
  const seen = new Set<string>();
  return messages.filter((message) => {
    const key = message.id.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Maps a documented event kind to REST cache areas for a future opt-in consumer. */
export function getGroupChatSocketInvalidationTargets(kind: GroupChatSocketEventKind): readonly GroupChatSocketInvalidationTarget[] {
  switch (kind) {
    case "new_message": return ["messages", "groups"];
    case "group_read": return ["read-status"];
    case "message_updated":
    case "message_hidden":
    case "message_pinned":
    case "reaction_updated": return ["messages"];
    case "member_joined":
    case "member_left":
    case "member_removed": return ["members", "group", "groups", "read-status"];
    case "member_role_changed": return ["members", "group", "groups"];
    case "group_updated":
    case "group_closed":
    case "group_reopened": return ["group", "groups"];
    case "group_invitation": return ["groups", "group"];
    case "posting_muted":
    case "posting_unmuted": return ["group", "members", "messages"];
  }
}

/** Returns only the selected Group's REST query keys for a live message event. */
export function getGroupChatSocketQueryKeys(kind: GroupChatLiveMessageEventKind, groupId: string): readonly (readonly unknown[])[] {
  const messageKey = ["group-chat", "messages", groupId] as const;
  return kind === "message_pinned"
    ? [messageKey, ["group-chat", "pinned", groupId] as const]
    : [messageKey];
}

/** Returns the selected Group message-history keys affected by membership events that may create REST system messages. */
export function getGroupChatMembershipQueryKeys(kind: GroupChatMembershipEventKind, groupId: string): readonly (readonly unknown[])[] {
  return kind === "member_joined" || kind === "member_left" || kind === "member_removed"
    ? [["group-chat", "messages", groupId] as const]
    : [];
}

/** Returns only the selected Group lifecycle queries for the authenticated user. */
export function getGroupChatLifecycleQueryKeys(groupId: string, userScope: string): readonly (readonly unknown[])[] {
  return [
    ["group-chat", "group", groupId, userScope],
    ["group-chat", "members", groupId],
    ["group-chat", "current-member", groupId, userScope],
    ["group-chat", "groups", userScope],
  ];
}
