import assert from "node:assert/strict";
import test from "node:test";

import { buildProtectedMediaRequestHeaders, configuredMediaOrigin, copyProtectedMediaResponseHeaders, isAllowedEventMediaUrl, isAllowedProtectedMediaUrl, isProtectedMediaUrl } from "./protected-media.ts";

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
  assert.equal(isAllowedProtectedMediaUrl("https://marketplace-api.wisdomtoothstage.tech/api/v1/events/media/a", "https://marketplace-api.wisdomtoothstage.tech"), true);
  assert.equal(isAllowedProtectedMediaUrl("https://cdn.example.com/a", "https://chat.wisdomtooth.tech"), false);
  assert.equal(isAllowedProtectedMediaUrl("https://marketplace-api.wisdomtoothstage.tech.attacker.test/a", "https://marketplace-api.wisdomtoothstage.tech"), false);
  assert.equal(isAllowedProtectedMediaUrl("http://marketplace-api.wisdomtoothstage.tech/a", "https://marketplace-api.wisdomtoothstage.tech"), false);
  assert.equal(isAllowedProtectedMediaUrl("https://marketplace-api.wisdomtoothstage.tech:8443/a", "https://marketplace-api.wisdomtoothstage.tech"), false);
});

test("recognizes only the approved production and staging preview origins", () => {
  assert.equal(isProtectedMediaUrl("https://chat.wisdomtooth.tech/api/v1/events/media/a"), true);
  assert.equal(isProtectedMediaUrl("https://marketplace-api.wisdomtoothstage.tech/api/v1/events/media/a"), true);
  assert.equal(isProtectedMediaUrl("https://cdn.example.com/a"), false);
  assert.equal(configuredMediaOrigin("https://marketplace-api.wisdomtoothstage.tech/api/v1"), "https://marketplace-api.wisdomtoothstage.tech");
  assert.equal(configuredMediaOrigin("https://media.example.com"), null);
  assert.equal(configuredMediaOrigin("http://localhost:8000/api/v1", { allowLocalhost: true }), "http://localhost:8000");
  assert.equal(isAllowedProtectedMediaUrl("http://localhost:8000/api/v1/events/media/a", "http://localhost:8000"), true);
});

test("restricts the Event proxy to the documented media path", () => {
  assert.equal(isAllowedEventMediaUrl("https://chat.wisdomtooth.tech/api/v1/events/media/a", "https://chat.wisdomtooth.tech"), true);
  assert.equal(isAllowedEventMediaUrl("https://marketplace-api.wisdomtoothstage.tech/api/v1/events/media/a", "https://marketplace-api.wisdomtoothstage.tech"), true);
  assert.equal(isAllowedEventMediaUrl("https://chat.wisdomtooth.tech/api/v1/users/me", "https://chat.wisdomtooth.tech"), false);
  assert.equal(isAllowedEventMediaUrl("https://cdn.example.com/api/v1/events/media/a", "https://chat.wisdomtooth.tech"), false);
});
