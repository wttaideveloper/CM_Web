import assert from "node:assert/strict";
import test from "node:test";

import { resolvePlatformEventMediaFetchUrl } from "./event-media-url.ts";
import { TRUSTED_UPSTREAM_ORIGINS_ENV } from "./marketplace-url.ts";

const PUBLIC_ORIGIN = "https://api.staging.example.test";
const INTERNAL = "http://classifieds-marketplace-api:8000";
const env = { CHAT_API_BASE_URL: `${INTERNAL}/api/v1`, [TRUSTED_UPSTREAM_ORIGINS_ENV]: INTERNAL };

const resolve = (url: string | null | undefined, publicOrigin: string | undefined = PUBLIC_ORIGIN, e: Record<string, string | undefined> = env) =>
  resolvePlatformEventMediaFetchUrl(url, publicOrigin, e);

test("maps a public Event media URL to the trusted internal origin and keeps the query", () => {
  assert.equal(
    resolve(`${PUBLIC_ORIGIN}/api/v1/events/media/7d2c1c3e-0b0f-4f3b-9d6e-5f6a0c8c9a11.webp?v=2`),
    `${INTERNAL}/api/v1/events/media/7d2c1c3e-0b0f-4f3b-9d6e-5f6a0c8c9a11.webp?v=2`,
  );
});

test("also accepts a URL already on the trusted internal origin", () => {
  assert.equal(resolve(`${INTERNAL}/api/v1/events/media/a.png`), `${INTERNAL}/api/v1/events/media/a.png`);
});

test("rejects every path that is not exactly one Event media asset", () => {
  for (const path of [
    "/api/v1/events/media", "/api/v1/events/media/", "/api/v1/events/media/a/b", "/api/v1/events/media/policy/extra",
    "/api/v1/users/me", "/api/v1/admin/events/1", "/api/v1/media/asset1/file", "/admin", "/", "/api/v1/events/media/.env",
  ]) {
    assert.equal(resolve(`${PUBLIC_ORIGIN}${path}`), null, path);
    assert.equal(resolve(`${INTERNAL}${path}`), null, path);
  }
});

test("rejects encoded, double-encoded, backslash and malformed traversal in the path", () => {
  for (const tail of [
    "..%2f..%2fusers%2fme", "..%2F..%2Fusers%2Fme", "%2e%2e%2fusers", "%2E%2E%2Fusers", "a%252e%252e", "%252e%252e%252fusers",
    "..%5cusers", "..%5Cusers", "a\\b", "a%", "a%zz", "a%c0%af", "a%00b", "a%25b",
  ]) {
    assert.equal(resolve(`${PUBLIC_ORIGIN}/api/v1/events/media/${tail}`), null, tail);
    assert.equal(resolve(`${INTERNAL}/api/v1/events/media/${tail}`), null, tail);
  }
});

test("a literal dot-segment traversal is normalized away by URL parsing and then fails the path check", () => {
  assert.equal(resolve(`${PUBLIC_ORIGIN}/api/v1/events/media/../../users/me`), null);
  assert.equal(resolve(`${PUBLIC_ORIGIN}/api/v1/events/media/a/../../../admin`), null);
});

test("rejects external origins, look-alike hosts, credentials and non-http schemes", () => {
  for (const url of [
    "https://evil.example.test/api/v1/events/media/a.png",
    "https://api.staging.example.test.evil.test/api/v1/events/media/a.png",
    "http://api.staging.example.test/api/v1/events/media/a.png",
    "https://api.staging.example.test:8443/api/v1/events/media/a.png",
    "https://user:pw@api.staging.example.test/api/v1/events/media/a.png",
    "http://169.254.169.254/api/v1/events/media/a.png",
    "http://localhost:8000/api/v1/events/media/a.png",
    "file:///etc/passwd",
    "javascript:alert(1)",
    "//evil.example.test/api/v1/events/media/a.png",
    "not a url",
  ]) {
    assert.equal(resolve(url), null, url);
  }
});

test("returns null for a missing or blank url parameter", () => {
  for (const value of [null, undefined, "", "   "]) assert.equal(resolve(value), null, String(value));
});

test("never builds a fetch URL when the Marketplace origin is not trusted or not configured", () => {
  const url = `${PUBLIC_ORIGIN}/api/v1/events/media/a.png`;
  assert.equal(resolve(url, PUBLIC_ORIGIN, { CHAT_API_BASE_URL: `${INTERNAL}/api/v1` }), null);
  assert.equal(resolve(url, PUBLIC_ORIGIN, { CHAT_API_BASE_URL: `${INTERNAL}/api/v1`, [TRUSTED_UPSTREAM_ORIGINS_ENV]: "https://other.example.test" }), null);
  assert.equal(resolve(url, PUBLIC_ORIGIN, {}), null);
});

test("without a public media origin only URLs already on the internal origin resolve", () => {
  // An empty string (not undefined, which would select the helper's default) means "no public origin configured".
  assert.equal(resolve(`${PUBLIC_ORIGIN}/api/v1/events/media/a.png`, ""), null);
  assert.equal(resolve(`${INTERNAL}/api/v1/events/media/a.png`, ""), `${INTERNAL}/api/v1/events/media/a.png`);
});
