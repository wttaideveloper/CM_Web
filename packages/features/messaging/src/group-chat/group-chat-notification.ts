const GROUP_MESSAGE_CATEGORY = "group_message";
const GROUP_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Builds the authenticated user's tenant-scoped invitation query key. */
export function groupChatInvitationQueryKey(userScope: string, tenantScope: string): readonly string[] {
  return ["group-chat", "invitations", userScope, tenantScope];
}

/** Tracks a personal posting-permission event while its authoritative Group queries reconcile. */
export function groupChatPostingRefreshQueryKey(groupId: string, userScope: string, tenantScope: string): readonly string[] {
  return ["group-chat", "posting-permission-refresh", groupId, userScope, tenantScope];
}

/** Signals a selected workspace to enter its existing removal revalidation flow. */
export function groupChatMembershipRemovalRefreshQueryKey(groupId: string, userScope: string, tenantScope: string): readonly string[] {
  return ["group-chat", "membership-removal-refresh", groupId, userScope, tenantScope];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

/** Resolves only the confirmed Group message notification shape to a valid Group UUID. */
export function getGroupChatMessageNotificationGroupId(notification: { category?: unknown; metadata?: unknown; data?: unknown }): string | null {
  const metadata = isRecord(notification.metadata) ? notification.metadata : {};
  const data = isRecord(notification.data) ? notification.data : {};
  const category = readString(notification.category) ?? readString(metadata.category) ?? readString(data.category);
  if (category?.trim().toLowerCase() !== GROUP_MESSAGE_CATEGORY) return null;
  const conversationId = readString(metadata.conversation_id) ?? readString(data.conversation_id);
  return conversationId && GROUP_ID_PATTERN.test(conversationId) ? conversationId : null;
}
