import assert from "node:assert/strict";
import test from "node:test";
import { getGroupChatMessageNotificationGroupId, groupChatInvitationQueryKey, groupChatMembershipRemovalRefreshQueryKey, groupChatPostingRefreshQueryKey } from "./group-chat/group-chat-notification.ts";

const groupId = "11111111-1111-4111-8111-111111111111";

test("resolves only authorized-shape Group message notifications", () => {
  const base = { id: "notification-1", notification_type: "group_message", title: "New message", body: "", data: {}, is_read: false, created_at: "2026-10-26T10:00:00.000Z", received_at: "2026-10-26T10:00:01.000Z", raw: null, source: "socket" as const };
  assert.equal(getGroupChatMessageNotificationGroupId({ ...base, metadata: { category: "group_message", conversation_id: groupId } }), groupId);
  assert.equal(getGroupChatMessageNotificationGroupId({ ...base, metadata: { category: "other", conversation_id: groupId } }), null);
  assert.equal(getGroupChatMessageNotificationGroupId({ ...base, metadata: { category: "group_message", conversation_id: "not-a-uuid" } }), null);
  assert.equal(getGroupChatMessageNotificationGroupId({ ...base, metadata: { category: "group_message" }, data: { conversation_id: groupId } }), groupId);
});

test("scopes personal Group invitation queries by authenticated user and tenant", () => {
  assert.deepEqual(groupChatInvitationQueryKey("user-1", "tenant-a"), ["group-chat", "invitations", "user-1", "tenant-a"]);
  assert.notDeepEqual(groupChatInvitationQueryKey("user-1", "tenant-a"), groupChatInvitationQueryKey("user-2", "tenant-a"));
  assert.notDeepEqual(groupChatInvitationQueryKey("user-1", "tenant-a"), groupChatInvitationQueryKey("user-1", "tenant-b"));
});

test("scopes the proactive posting-permission suspension by Group, user, and tenant", () => {
  assert.deepEqual(groupChatPostingRefreshQueryKey(groupId, "user-1", "tenant-a"), ["group-chat", "posting-permission-refresh", groupId, "user-1", "tenant-a"]);
  assert.notDeepEqual(groupChatPostingRefreshQueryKey(groupId, "user-1", "tenant-a"), groupChatPostingRefreshQueryKey("22222222-2222-4222-8222-222222222222", "user-1", "tenant-a"));
});

test("scopes selected-Group removal revalidation by Group, user, and tenant", () => {
  assert.deepEqual(groupChatMembershipRemovalRefreshQueryKey(groupId, "user-1", "tenant-a"), ["group-chat", "membership-removal-refresh", groupId, "user-1", "tenant-a"]);
  assert.notDeepEqual(groupChatMembershipRemovalRefreshQueryKey(groupId, "user-1", "tenant-a"), groupChatMembershipRemovalRefreshQueryKey(groupId, "user-2", "tenant-a"));
  assert.notDeepEqual(groupChatMembershipRemovalRefreshQueryKey(groupId, "user-1", "tenant-a"), groupChatMembershipRemovalRefreshQueryKey(groupId, "user-1", "tenant-b"));
});
