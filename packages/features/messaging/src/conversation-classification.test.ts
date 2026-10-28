import assert from "node:assert/strict";
import test from "node:test";
import {
  filterDirectChatConversations,
  isDirectChatConversation,
  isKnownDirectChatConversationId,
} from "./conversation-classification.ts";

test("allows standard Direct Chat conversations", () => {
  assert.equal(isDirectChatConversation({ conversation_type: "standard" }), true);
});

test("excludes explicitly classified Group Chat conversations", () => {
  assert.equal(isDirectChatConversation({ conversation_type: "group", group_kind: "program" }), false);
  assert.equal(isDirectChatConversation({ conversation_type: " GROUP " }), false);
});

test("preserves legacy behavior for missing and unknown classifications", () => {
  assert.equal(isDirectChatConversation({}), true);
  assert.equal(isDirectChatConversation({ conversation_type: null }), true);
  assert.equal(isDirectChatConversation({ conversation_type: "other" }), true);
});

test("filters active, archived, and search results by authoritative classification", () => {
  const conversations = [
    { id: "direct", conversation_type: "standard" },
    { id: "group", conversation_type: "group", group_kind: "program" },
    { id: "legacy", conversation_type: undefined },
  ];

  assert.deepEqual(filterDirectChatConversations(conversations).map((item) => item.id), [
    "direct",
    "legacy",
  ]);
});

test("blocks a known Group Chat ID but preserves unknown-ID compatibility", () => {
  const known = [
    { id: "group", conversation_type: "group" },
    { id: "direct", conversation_type: "standard" },
  ];

  assert.equal(isKnownDirectChatConversationId("group", known), false);
  assert.equal(isKnownDirectChatConversationId("direct", known), true);
  assert.equal(isKnownDirectChatConversationId("legacy", known), true);
});
