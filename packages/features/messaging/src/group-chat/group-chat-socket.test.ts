import assert from "node:assert/strict";
import test from "node:test";
import {
  deduplicateGroupChatSocketMessages,
  getGroupChatSocketInvalidationTargets,
  isGroupChatSocketEventForGroup,
  normalizeGroupChatSocketEvent,
} from "./group-chat-socket.ts";
import type { GroupChatSocketMessage } from "./group-chat-socket.ts";

const groupId = "11111111-1111-4111-8111-111111111111";
const secondGroupId = "22222222-2222-4222-8222-222222222222";
const messageId = "33333333-3333-4333-8333-333333333333";
const senderId = "44444444-4444-4444-8444-444444444444";
const userId = "55555555-5555-4555-8555-555555555555";

const envelope = (extra: Record<string, unknown> = {}) => ({ conversation_type: "group", conversation_id: groupId, ...extra });
const message = (extra: Record<string, unknown> = {}) => ({ id: messageId, conversation_id: groupId, sender_id: senderId, created_at: "2026-10-26T10:00:00.000Z", content: "synthetic test content", ...extra });

test("normalizes documented new-message payloads without requiring sender_name", () => {
  const event = normalizeGroupChatSocketEvent("new_message", envelope({ message: message() }), groupId);
  assert.equal(event?.event, "new_message");
  assert.equal(event && "message" in event ? event.message.sender_name : undefined, undefined);
  assert.equal(event && "message" in event ? event.message.sender_id : undefined, senderId);
});

test("rejects missing or wrong conversation_type and wrong group envelopes", () => {
  assert.equal(normalizeGroupChatSocketEvent("new_message", { conversation_id: groupId, message: message() }, groupId), null);
  assert.equal(normalizeGroupChatSocketEvent("new_message", { ...envelope({ conversation_type: "direct", message: message() }) }, groupId), null);
  assert.equal(normalizeGroupChatSocketEvent("new_message", envelope({ conversation_id: secondGroupId, message: message({ conversation_id: secondGroupId }) }), groupId), null);
  assert.equal(normalizeGroupChatSocketEvent("new_message", envelope({ message: message({ conversation_id: secondGroupId }) }), groupId), null);
});

test("rejects malformed message and member identifiers", () => {
  assert.equal(normalizeGroupChatSocketEvent("new_message", envelope({ message: message({ id: "not-a-uuid" }) }), groupId), null);
  assert.equal(normalizeGroupChatSocketEvent("new_message", envelope({ message: message({ sender_id: "not-a-uuid" }) }), groupId), null);
  assert.equal(normalizeGroupChatSocketEvent("member_removed", envelope({ user_id: "not-a-uuid" }), groupId), null);
  assert.equal(normalizeGroupChatSocketEvent("member_role_changed", envelope({ user_id: userId, role: " " }), groupId), null);
});

test("normalizes hidden and pinned events without reconstructing hidden content", () => {
  const hidden = normalizeGroupChatSocketEvent("message_hidden", envelope({ message_id: messageId, status: "hidden", placeholder: "Message unavailable." }), groupId);
  assert.deepEqual(hidden, { event: "message_hidden", conversation_type: "group", conversation_id: groupId, message_id: messageId, status: "hidden", placeholder: "Message unavailable." });
  assert.equal(normalizeGroupChatSocketEvent("message_hidden", envelope({ message_id: messageId, status: "visible", placeholder: null }), groupId), null);
  assert.deepEqual(normalizeGroupChatSocketEvent("message_pinned", envelope({ message_id: messageId, pinned: true }), groupId), { event: "message_pinned", conversation_type: "group", conversation_id: groupId, message_id: messageId, pinned: true });
});

test("validates reaction counts and rejects unsupported values", () => {
  const event = normalizeGroupChatSocketEvent("reaction_updated", envelope({ message_id: messageId, reactions: { "👍": 2, "❤️": 0 } }), groupId);
  assert.deepEqual(event && "reactions" in event ? event.reactions : null, { "👍": 2, "❤️": 0 });
  assert.equal(normalizeGroupChatSocketEvent("reaction_updated", envelope({ message_id: messageId, reactions: { "👍": 1.5 } }), groupId), null);
  assert.equal(normalizeGroupChatSocketEvent("reaction_updated", envelope({ message_id: messageId, reactions: { "👍": -1 } }), groupId), null);
});

test("normalizes membership, group, invitation and posting events", () => {
  assert.deepEqual(normalizeGroupChatSocketEvent("member_joined", envelope({ user_id: userId, role: "member", kind: "learner" }), groupId)?.event, "member_joined");
  assert.deepEqual(normalizeGroupChatSocketEvent("group_updated", envelope({ changed_fields: { name: "Updated Group" } }), groupId), { event: "group_updated", conversation_type: "group", conversation_id: groupId, changed_fields: { name: "Updated Group" } });
  assert.equal(normalizeGroupChatSocketEvent("group_closed", envelope({ closed_at: "2026-10-26T10:00:00.000Z" }), groupId)?.event, "group_closed");
  assert.equal(normalizeGroupChatSocketEvent("posting_muted", envelope({ until: "2026-10-26T11:00:00.000Z" }), groupId)?.event, "posting_muted");
  assert.equal(normalizeGroupChatSocketEvent("group_invitation", envelope(), groupId)?.event, "group_invitation");
});

test("rejects unknown events and malformed event-specific fields", () => {
  assert.equal(normalizeGroupChatSocketEvent("unknown_event", envelope(), groupId), null);
  assert.equal(normalizeGroupChatSocketEvent("group_updated", envelope({ changed_fields: [] }), groupId), null);
  assert.equal(normalizeGroupChatSocketEvent("group_closed", envelope({ closed_at: "not-a-date" }), groupId), null);
  assert.equal(normalizeGroupChatSocketEvent("posting_muted", envelope({ until: null }), groupId), null);
});

test("matches validated events to a group and keeps message deduplication stable", () => {
  const first = normalizeGroupChatSocketEvent("new_message", envelope({ message: message() }), groupId);
  assert.ok(first && "message" in first);
  if (!first || !("message" in first)) return;
  assert.equal(isGroupChatSocketEventForGroup(first, groupId), true);
  assert.equal(isGroupChatSocketEventForGroup(first, secondGroupId), false);
  const second = { ...first.message, id: "66666666-6666-4666-8666-666666666666" } satisfies GroupChatSocketMessage;
  assert.deepEqual(deduplicateGroupChatSocketMessages([first.message, first.message, second]).map((item) => item.id), [messageId, second.id]);
});

test("maps validated event kinds to conservative REST invalidation areas", () => {
  assert.deepEqual(getGroupChatSocketInvalidationTargets("new_message"), ["messages", "groups"]);
  assert.deepEqual(getGroupChatSocketInvalidationTargets("member_removed"), ["members", "group", "groups"]);
  assert.deepEqual(getGroupChatSocketInvalidationTargets("message_hidden"), ["messages"]);
  assert.deepEqual(getGroupChatSocketInvalidationTargets("posting_muted"), ["group", "members", "messages"]);
});
