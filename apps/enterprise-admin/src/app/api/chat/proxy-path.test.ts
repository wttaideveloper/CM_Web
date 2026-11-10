import assert from "node:assert/strict";
import test from "node:test";

// @ts-expect-error Node's native TypeScript test runner loads this module by its .ts filename.
import { buildEnterpriseChatTokenUpstreamUrl, buildEnterpriseChatUpstreamUrl, DEFAULT_ENTERPRISE_CHAT_PROXY_TARGET, normalizeEnterpriseChatUpstreamPath, resolveEnterpriseChatProxyTarget } from "./proxy-path.ts";

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

test("routes Chat-token requests through the configured origin exactly once", () => {
  const proxyTarget = resolveEnterpriseChatProxyTarget(
    "https://marketplace-api.wisdomtoothstage.tech/",
    "https://unused.example/api/v1",
  );

  assert.equal(proxyTarget, "https://marketplace-api.wisdomtoothstage.tech");
  assert.equal(
    buildEnterpriseChatTokenUpstreamUrl(proxyTarget),
    "https://marketplace-api.wisdomtoothstage.tech/api/v1/auth/chat-token",
  );
});

test("derives the Chat-token origin from CHAT_API_BASE_URL when the proxy target is absent", () => {
  const proxyTarget = resolveEnterpriseChatProxyTarget(
    undefined,
    "https://marketplace-api.wisdomtoothstage.tech/api/v1/",
  );

  assert.equal(proxyTarget, "https://marketplace-api.wisdomtoothstage.tech");
  assert.equal(
    buildEnterpriseChatTokenUpstreamUrl(proxyTarget),
    "https://marketplace-api.wisdomtoothstage.tech/api/v1/auth/chat-token",
  );
});

test("preserves the existing default origin when neither Chat setting is configured", () => {
  const proxyTarget = resolveEnterpriseChatProxyTarget();

  assert.equal(proxyTarget, DEFAULT_ENTERPRISE_CHAT_PROXY_TARGET);
  assert.equal(
    buildEnterpriseChatTokenUpstreamUrl(proxyTarget),
    "https://chat.wisdomtooth.tech/api/v1/auth/chat-token",
  );
});
