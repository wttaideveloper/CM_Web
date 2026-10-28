/**
 * Query prefixes that must be reconciled after the selected Group room
 * reconnects.  These are existing Group Chat keys; this helper only keeps
 * the reconnect scope in one place.
 */
export function getGroupChatReconnectQueryKeys(
  groupId: string,
  userScope: string,
  tenantScope: string,
): readonly (readonly unknown[])[] {
  return [
    ["group-chat", "messages", groupId],
    ["group-chat", "pinned", groupId],
    ["group-chat", "group", groupId, userScope],
    ["group-chat", "members", groupId],
    ["group-chat", "current-member", groupId, userScope],
    ["group-chat", "groups", userScope],
    ["group-chat", "read-status", userScope, tenantScope, groupId],
  ];
}
