import { strict as assert } from "node:assert";
import test from "node:test";

import { normalizeChatUpstreamPath } from "./proxy-path.ts";

test("normalizes both message collection forms to the canonical upstream path", () => {
  assert.equal(normalizeChatUpstreamPath("/messages"), "messages/");
  assert.equal(normalizeChatUpstreamPath("/messages/"), "messages/");
});

test("does not add a slash to nested message or other chat routes", () => {
  assert.equal(normalizeChatUpstreamPath("/messages/message-id"), "messages/message-id");
  assert.equal(normalizeChatUpstreamPath("/conversations/conversation-id"), "conversations/conversation-id");
  assert.equal(normalizeChatUpstreamPath("/presence/online"), "presence/online");
  assert.equal(normalizeChatUpstreamPath("/typing/conversation-id"), "typing/conversation-id");
});
