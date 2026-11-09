import assert from "node:assert/strict";
import test from "node:test";

// Node's native TypeScript test runner loads this module by its .ts filename; the app tsconfig
// enables `allowImportingTsExtensions` for that, so no error suppression is needed.
import { buildEnterpriseChatUpstreamUrl, normalizeEnterpriseChatUpstreamPath } from "./proxy-path.ts";

test("preserves the trailing slash for the Group Chat avatar upload collection", () => {
  assert.equal(normalizeEnterpriseChatUpstreamPath("/uploads"), "uploads/");
  assert.equal(buildEnterpriseChatUpstreamUrl("https://chat.wisdomtooth.tech", "/uploads"), "https://chat.wisdomtooth.tech/api/v1/uploads/");
});

test("keeps the configured HTTPS origin and query string", () => {
  assert.equal(
      buildEnterpriseChatUpstreamUrl("https://chat.wisdomtooth.tech", "/groups", "?page=1"),
    "https://chat.wisdomtooth.tech/api/v1/groups?page=1",
  );
});

test("does not change unrelated Chat paths", () => {
  assert.equal(normalizeEnterpriseChatUpstreamPath("/messages"), "messages/");
  assert.equal(normalizeEnterpriseChatUpstreamPath("/groups/group-1"), "groups/group-1");
  assert.equal(normalizeEnterpriseChatUpstreamPath("/attachments/upload"), "attachments/upload");
  assert.equal(normalizeEnterpriseChatUpstreamPath("/uploads/thumbnails"), "uploads/thumbnails");
});

import { resolveEnterpriseChatUpstreamPath } from "./proxy-path.ts";

const rawChatPath = (path: string) => `/api/chat/${path}`;
const resolveRaw = (rawPath: string) =>
  resolveEnterpriseChatUpstreamPath(
    rawPath.slice("/api/chat/".length).split("/").map((segment) => { try { return decodeURIComponent(segment); } catch { return segment; } }),
    rawPath,
  );

test("resolveEnterpriseChatUpstreamPath keeps valid message, upload, group and chat-token routes", () => {
  assert.equal(resolveRaw(rawChatPath("messages")), "messages/");
  assert.equal(resolveRaw(rawChatPath("uploads")), "uploads/");
  assert.equal(resolveRaw(rawChatPath("uploads/thumbnails")), "uploads/thumbnails");
  assert.equal(resolveRaw(rawChatPath("uploads/group-avatars/group.webp")), "uploads/group-avatars/group.webp");
  assert.equal(resolveRaw(rawChatPath("groups/group-1")), "groups/group-1");
  assert.equal(resolveRaw(rawChatPath("attachments/upload")), "attachments/upload");
  assert.equal(resolveRaw(rawChatPath("auth/chat-token")), "auth/chat-token");
  assert.equal(resolveRaw(rawChatPath("attachments/my%20file.pdf")), "attachments/my%20file.pdf");
});

test("a resolved path builds the same upstream URL and can never escape /api/v1/", () => {
  const resolved = resolveRaw(rawChatPath("uploads"));
  assert.equal(buildEnterpriseChatUpstreamUrl("http://api.internal:8000", resolved ?? "", "?page=1"), "http://api.internal:8000/api/v1/uploads/?page=1");
});

test("resolveEnterpriseChatUpstreamPath refuses traversal in plain, encoded, double-encoded, mixed-case and malformed form", () => {
  for (const value of [
    "..", "../admin", "uploads/../../admin", "..%2f..%2fadmin", "..%2F..%2Fadmin", "%2e%2e%2fadmin", "%2E%2E/admin", "%2e%2E/admin",
    "%252e%252e%252fadmin", "%252F", "..%5cadmin", "..%5Cadmin", "..\\admin", "a\\b", "%", "%zz", "%c0%af", "uploads%3fx=1", "a%00b",
  ]) {
    assert.equal(resolveRaw(rawChatPath(value)), null, value);
  }
});
