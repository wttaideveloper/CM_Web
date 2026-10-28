import assert from "node:assert/strict";
import test from "node:test";

// @ts-expect-error Node's native TypeScript test runner loads this module by its .ts filename.
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
