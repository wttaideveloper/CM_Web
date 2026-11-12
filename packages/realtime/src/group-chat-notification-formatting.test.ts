import assert from "node:assert/strict";
import test from "node:test";

import { formatGroupChatNotificationDetails, getGroupChatNotificationTarget } from "./group-chat-notification-formatting.ts";

test("formats enriched Event Group notifications", () => {
  assert.deepEqual(formatGroupChatNotificationDetails({
    title: "event chat 202(users ?)",
    message: "s",
    category: "group_message",
    metadata: { type: "group_message", context_type: "event", preview: "s", sender_name: "enzo provider", attachment_type: "none" },
  }), {
    title: "enzo provider",
    message: "s",
    groupName: "event chat 202(users ?)",
    contextLabel: "Event Group",
    senderName: "enzo provider",
    attachmentLabel: null,
  });
});

test("formats enriched Training Group notifications using the same contract", () => {
  const details = formatGroupChatNotificationDetails({
    title: "Training cohort",
    message: "See you tomorrow",
    category: "group_message",
    metadata: { type: "group_message", context_type: "training", sender_name: "Provider One", preview: "See you tomorrow" },
  });
  assert.equal(details?.title, "Provider One");
  assert.equal(details?.groupName, "Training cohort");
  assert.equal(details?.contextLabel, "Training Group");
  assert.equal(details?.message, "See you tomorrow");
});

test("uses neutral Group context when the backend omits context metadata", () => {
  const details = formatGroupChatNotificationDetails({ category: "group_message", title: "Group chat", message: "Hello" });
  assert.equal(details?.contextLabel, "Group");
});

test("uses safe attachment labels when a preview is unavailable", () => {
  assert.equal(formatGroupChatNotificationDetails({ category: "group_message", title: "Group", metadata: { attachment_type: "image" } })?.message, "Image attachment");
  assert.equal(formatGroupChatNotificationDetails({ category: "group_message", title: "Group", metadata: { attachment_type: "audio" } })?.message, "Audio attachment");
  assert.equal(formatGroupChatNotificationDetails({ category: "group_message", title: "Group", metadata: { attachment_type: "document" } })?.message, "Document attachment");
  assert.equal(formatGroupChatNotificationDetails({ category: "group_message", title: "Group", metadata: { attachment_type: "video" } })?.message, "Video attachment");
});

test("keeps legacy notifications readable without inventing identity", () => {
  assert.deepEqual(formatGroupChatNotificationDetails({ title: "New message", message: "", category: "group_message", metadata: { message_id: "message-1", conversation_id: "group-1" } }), {
    title: "New message",
    message: "New message",
    groupName: null,
    contextLabel: "Group",
    senderName: null,
    attachmentLabel: null,
  });
});

test("renders notification text as plain display data and truncates long previews", () => {
  const details = formatGroupChatNotificationDetails({
    title: "<Group>",
    message: '<img src=x onerror="alert(1)">',
    category: "group_message",
    metadata: { sender_name: "<Sender>" },
  });
  assert.equal(details?.groupName, "<Group>");
  assert.equal(details?.title, "<Sender>");
  assert.equal(details?.message, '<img src=x onerror="alert(1)">');
  assert.equal(formatGroupChatNotificationDetails({ category: "group_message", message: "x".repeat(200) })?.message.length, 160);
});

test("does not format unrelated notification categories", () => {
  assert.equal(formatGroupChatNotificationDetails({ category: "event_approved", title: "Event approved", message: "Done" }), null);
});

test("builds a Groups deep link from conversation and message identifiers", () => {
  assert.equal(getGroupChatNotificationTarget({
    category: "group_message",
    metadata: { conversation_id: "group-1", message_id: "message-1" },
  }, "/admin/messages"), "/admin/messages?tab=groups&groupId=group-1&messageId=message-1");
});

test("does not build a Group deep link from a display name or an unrelated notification", () => {
  assert.equal(getGroupChatNotificationTarget({ category: "group_message", title: "Training cohort" }, "/admin/messages"), null);
  assert.equal(getGroupChatNotificationTarget({ category: "event_approved", metadata: { conversation_id: "group-1" } }, "/admin/messages"), null);
});
