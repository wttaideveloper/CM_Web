import type { GroupChatMessage, GroupChatMessageReadStatus } from "./group-chat.types";

export type GroupChatReadStateInvalidator = (queryKey: readonly unknown[]) => Promise<unknown> | unknown;

export type GroupChatReadStatusCache = Record<string, GroupChatMessageReadStatus>;
export type GroupChatReadReconciliationState = "pending" | "ready";

/** Describes only the portion of an already loaded, ordered history covered by a read-through event. */
export type GroupChatReadThroughBoundary = {
  messageId: string | null;
  loaded: boolean;
  messageIds: readonly string[];
};

/** Coalesces duplicate boundary-bearing personal-room events without suppressing legacy or changed-boundary events. */
export function shouldProcessGroupChatReadEvent(seenSignatures: Set<string>, userId: string, readThroughMessageId: string | null | undefined): boolean {
  if (!readThroughMessageId) return true;
  const signature = `${userId.trim().toLowerCase()}:${readThroughMessageId.trim().toLowerCase()}`;
  if (seenSignatures.has(signature)) return false;
  seenSignatures.add(signature);
  return true;
}

/** Receipt requests wait for the initial read reconciliation when it applies. */
export function shouldQueueGroupChatReadStatuses(state: GroupChatReadReconciliationState): boolean {
  return state === "ready";
}

/** Reconciles a selected Group after reconnect only when refreshed history reports unread work. */
export function shouldReconcileGroupChatReadAfterReconnect(
  reconnectRefreshKey: number,
  handledReconnectRefreshKey: number,
  unreadCount: number | null | undefined,
  active: boolean,
): boolean {
  return active && reconnectRefreshKey > handledReconnectRefreshKey && typeof unreadCount === "number" && unreadCount > 0;
}

/** Keeps a group_read refresh pending until a newly rendered visible message can consume it. */
export function shouldForceGroupChatReadStatusRefresh(forceRefresh: boolean, pendingRefresh: boolean): boolean {
  return forceRefresh || pendingRefresh;
}

/** Resolves a read-through ID against loaded REST order without treating an incomplete page set as complete history. */
export function resolveGroupChatReadThroughBoundary(messages: readonly Pick<GroupChatMessage, "id">[], readThroughMessageId: string | null | undefined): GroupChatReadThroughBoundary {
  const normalizedMessageId = readThroughMessageId?.trim() || null;
  if (!normalizedMessageId) return { messageId: null, loaded: false, messageIds: [] };
  const boundaryIndex = messages.findIndex((message) => message.id.toLowerCase() === normalizedMessageId.toLowerCase());
  return boundaryIndex < 0
    ? { messageId: normalizedMessageId, loaded: false, messageIds: [] }
    : { messageId: normalizedMessageId, loaded: true, messageIds: messages.slice(0, boundaryIndex + 1).map((message) => message.id) };
}

/** Scopes read-status data by authenticated account, tenant, Group and optional message. */
export function groupChatReadStatusQueryKey(groupId: string, userScope: string, tenantScope: string, messageId?: string): readonly unknown[] {
  return messageId
    ? ["group-chat", "read-status", userScope, tenantScope, groupId, messageId]
    : ["group-chat", "read-status", userScope, tenantScope, groupId];
}

/** Returns only the selected Group history and scoped receipt keys affected by group_read. */
export function groupChatReadRefreshQueryKeys(groupId: string, userScope: string, tenantScope: string): readonly (readonly unknown[])[] {
  return [
    ["group-chat", "messages", groupId],
    groupChatReadStatusQueryKey(groupId, userScope, tenantScope),
  ];
}

/** Merges one authoritative status without discarding other confirmed message states during refetch. */
export function mergeGroupChatReadStatusCache(cache: GroupChatReadStatusCache, cacheKey: string, status: GroupChatMessageReadStatus): GroupChatReadStatusCache {
  return { ...cache, [cacheKey]: status };
}

export function groupChatReadStateQueryKeys(groupId: string, userScope = "", tenantScope = ""): readonly (readonly unknown[])[] {
  return [
    ["group-chat", "messages", groupId],
    ["group-chat", "groups"],
    groupChatReadStatusQueryKey(groupId, userScope, tenantScope),
  ];
}

/** Marks the active Group as read, then refreshes only its authoritative REST-backed state. */
export async function reconcileGroupChatReadState(
  groupId: string,
  markRead: (groupId: string) => Promise<void>,
  invalidate: GroupChatReadStateInvalidator,
  userScope = "",
  tenantScope = "",
): Promise<void> {
  await markRead(groupId);
  await Promise.all(groupChatReadStateQueryKeys(groupId, userScope, tenantScope).map((queryKey) => invalidate(queryKey)));
}
