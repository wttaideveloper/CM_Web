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

import { resolveChatUpstreamPath } from "./proxy-path.ts";

const raw = (path) => `/api/chat/${path}`;
const resolveRaw = (rawPath) =>
  resolveChatUpstreamPath(
    rawPath.slice("/api/chat/".length).split("/").map((segment) => { try { return decodeURIComponent(segment); } catch { return segment; } }),
    rawPath,
  );

test("resolveChatUpstreamPath keeps every valid chat route, including the messages collection slash", () => {
  assert.equal(resolveRaw(raw("messages")), "messages/");
  assert.equal(resolveRaw(raw("messages/message-id")), "messages/message-id");
  assert.equal(resolveRaw(raw("conversations/conversation-id")), "conversations/conversation-id");
  assert.equal(resolveRaw(raw("presence/online")), "presence/online");
  assert.equal(resolveRaw(raw("typing/conversation-id")), "typing/conversation-id");
  assert.equal(resolveRaw(raw("attachments/my%20file.pdf")), "attachments/my%20file.pdf");
});

test("resolveChatUpstreamPath refuses traversal in plain, encoded, double-encoded, mixed-case and malformed form", () => {
  for (const value of [
    "..", "../admin", "a/../b", "..%2f..%2fadmin", "..%2F..%2Fadmin", "%2e%2e%2fadmin", "%2E%2E/admin", "%2e%2E/admin",
    "%252e%252e%252fadmin", "%252F", "..%5cadmin", "..\\admin", "a\\b", "%", "%zz", "%c0%af", "messages%3fx=1", "a%00b",
  ]) {
    assert.equal(resolveRaw(raw(value)), null, value);
  }
});
