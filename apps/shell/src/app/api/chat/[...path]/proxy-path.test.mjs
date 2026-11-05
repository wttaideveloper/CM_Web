import { strict as assert } from "node:assert";
import test from "node:test";

import { normalizeChatUpstreamPath } from "./proxy-path.ts";

test("normalizes uploads and messages collection forms to canonical upstream paths", () => {
  assert.equal(normalizeChatUpstreamPath("/uploads"), "uploads/");
  assert.equal(normalizeChatUpstreamPath("/uploads/"), "uploads/");
  assert.equal(normalizeChatUpstreamPath("/messages"), "messages/");
  assert.equal(normalizeChatUpstreamPath("/messages/"), "messages/");
});

test("does not alter nested upload, message, or other chat routes", () => {
  assert.equal(normalizeChatUpstreamPath("/uploads/thumbnails"), "uploads/thumbnails");
  assert.equal(normalizeChatUpstreamPath("/messages/message-id"), "messages/message-id");
  assert.equal(normalizeChatUpstreamPath("/conversations/conversation-id"), "conversations/conversation-id");
  assert.equal(normalizeChatUpstreamPath("/groups/group-id/messages"), "groups/group-id/messages");
  assert.equal(normalizeChatUpstreamPath("/attachments/upload"), "attachments/upload");
  assert.equal(normalizeChatUpstreamPath("/presence/online"), "presence/online");
  assert.equal(normalizeChatUpstreamPath("/typing/conversation-id"), "typing/conversation-id");
});
