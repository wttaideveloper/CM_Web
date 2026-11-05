import assert from "node:assert/strict";
import test from "node:test";

import {
  buildProtectedMediaRequestHeaders,
  copyProtectedMediaResponseHeaders,
  EVENT_MEDIA_PATH_PATTERN,
  isAllowedEventMediaUrl,
  isAllowedProtectedMediaUrl,
  isProtectedMediaUrl,
  protectedMediaPreviewUrl,
  resolveProtectedMediaFetchUrl,
} from "./protected-media.ts";

test("forwards the server bearer credential and browser Range headers", () => {
  const requestHeaders = new Headers({ Accept: "video/mp4", Range: "bytes=100-", "If-Range": "etag-1" });
  const headers = buildProtectedMediaRequestHeaders(requestHeaders, "server-token");
  assert.equal(headers.get("authorization"), "Bearer server-token");
  assert.equal(headers.get("range"), "bytes=100-");
  assert.equal(headers.get("if-range"), "etag-1");
  assert.equal(headers.get("accept"), "video/mp4");
});

test("preserves response metadata required for a 206 video stream", () => {
  const headers = copyProtectedMediaResponseHeaders(new Headers({
    "Content-Type": "video/mp4",
    "Content-Length": "42",
    "Content-Range": "bytes 100-141/1000",
    "Accept-Ranges": "bytes",
    ETag: "etag-1",
    "X-Internal": "not forwarded",
  }));
  assert.equal(headers.get("content-type"), "video/mp4");
  assert.equal(headers.get("content-range"), "bytes 100-141/1000");
  assert.equal(headers.get("accept-ranges"), "bytes");
  assert.equal(headers.get("x-internal"), null);
});

test("allows only media URLs on the configured protected origin", () => {
  assert.equal(isAllowedProtectedMediaUrl("https://chat.wisdomtooth.tech/api/v1/events/media/a", "https://chat.wisdomtooth.tech"), true);
  assert.equal(isAllowedProtectedMediaUrl("https://cdn.example.com/a", "https://chat.wisdomtooth.tech"), false);
});

test("restricts the Event proxy to the documented media path", () => {
  assert.equal(isAllowedEventMediaUrl("https://chat.wisdomtooth.tech/api/v1/events/media/a", "https://chat.wisdomtooth.tech"), true);
  assert.equal(isAllowedEventMediaUrl("https://chat.wisdomtooth.tech/api/v1/users/me", "https://chat.wisdomtooth.tech"), false);
  assert.equal(isAllowedEventMediaUrl("https://cdn.example.com/api/v1/events/media/a", "https://chat.wisdomtooth.tech"), false);
});

const hostingerPolicy = {
  publicOrigin: "https://api.staging.example.test",
  internalOrigin: "http://classifieds-marketplace-api:8000",
  pathPattern: EVENT_MEDIA_PATH_PATTERN,
} as const;

test("maps a public media URL to the internal origin so the fetch never leaves the private network", () => {
  assert.equal(
    resolveProtectedMediaFetchUrl("https://api.staging.example.test/api/v1/events/media/a.png?v=2", hostingerPolicy),
    "http://classifieds-marketplace-api:8000/api/v1/events/media/a.png?v=2",
  );
});

test("accepts the same origin on both sides when public and internal origins are identical (AWS-style)", () => {
  const policy = { publicOrigin: "https://chat.example.test", internalOrigin: "https://chat.example.test", pathPattern: EVENT_MEDIA_PATH_PATTERN };
  assert.equal(resolveProtectedMediaFetchUrl("https://chat.example.test/api/v1/events/media/x", policy), "https://chat.example.test/api/v1/events/media/x");
});

test("rejects foreign origins, wrong paths, credentials and non-http schemes (no SSRF via the url parameter)", () => {
  for (const value of [
    "https://evil.example.test/api/v1/events/media/a",
    "http://169.254.169.254/latest/meta-data",
    "http://localhost:8000/api/v1/events/media/a",
    "https://api.staging.example.test/api/v1/users/me",
    "https://api.staging.example.test/api/v1/events/media/../../users/me/../../../admin",
    "https://user:pw@api.staging.example.test/api/v1/events/media/a",
    "file:///etc/passwd",
    "javascript:alert(1)",
    "not a url",
  ]) {
    const result = resolveProtectedMediaFetchUrl(value, hostingerPolicy);
    // A path-traversal URL is normalised by URL parsing; it must never escape the media prefix.
    if (result !== null) assert.match(new URL(result).pathname, EVENT_MEDIA_PATH_PATTERN, value);
    else assert.equal(result, null, value);
  }
  assert.equal(resolveProtectedMediaFetchUrl("https://evil.example.test/api/v1/events/media/a", hostingerPolicy), null);
  assert.equal(resolveProtectedMediaFetchUrl("https://user:pw@api.staging.example.test/api/v1/events/media/a", hostingerPolicy), null);
  assert.equal(resolveProtectedMediaFetchUrl("https://api.staging.example.test/api/v1/users/me", hostingerPolicy), null);
});

test("fails closed without an internal origin, and only narrows acceptance without a public origin", () => {
  const publicUrl = "https://api.staging.example.test/api/v1/events/media/a";
  const internalUrl = "http://classifieds-marketplace-api:8000/api/v1/events/media/a";
  assert.equal(resolveProtectedMediaFetchUrl(publicUrl, { ...hostingerPolicy, internalOrigin: null }), null);
  assert.equal(resolveProtectedMediaFetchUrl(internalUrl, { ...hostingerPolicy, internalOrigin: null }), null);
  // Without a public origin, only URLs already on the internal origin are accepted.
  assert.equal(resolveProtectedMediaFetchUrl(publicUrl, { ...hostingerPolicy, publicOrigin: null }), null);
  assert.equal(resolveProtectedMediaFetchUrl(internalUrl, { ...hostingerPolicy, publicOrigin: null }), internalUrl);
});

test("without a configured public origin nothing is routed through the proxy and no host is assumed", () => {
  assert.equal(isProtectedMediaUrl("https://chat.wisdomtooth.tech/api/v1/events/media/a", null), false);
  assert.equal(
    protectedMediaPreviewUrl("https://chat.wisdomtooth.tech/api/v1/events/media/a", "/api/event-media", null),
    "https://chat.wisdomtooth.tech/api/v1/events/media/a",
  );
});

test("routes URLs on the configured public origin through the proxy and leaves external links direct", () => {
  const origin = "https://api.staging.example.test";
  const internal = `${origin}/api/v1/events/media/a`;
  assert.equal(protectedMediaPreviewUrl(internal, "/api/event-media", origin), `/api/event-media?url=${encodeURIComponent(internal)}`);
  assert.equal(protectedMediaPreviewUrl("https://cdn.example.com/a.png", "/api/event-media", origin), "https://cdn.example.com/a.png");
});
