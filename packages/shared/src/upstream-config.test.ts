import assert from "node:assert/strict";
import test from "node:test";

import {
  findMissingEnv,
  isInternalHostname,
  isTrustedUpstreamUrl,
  normalizeUpstreamBaseUrl,
  parseOriginAllowlist,
  resolveUpstreamUrls,
  toApiV1Base,
  UpstreamConfigError,
} from "./upstream-config.ts";

test("classifies private and single-label hosts as internal, public hosts as not", () => {
  for (const host of ["localhost", "127.0.0.1", "10.0.0.5", "172.16.4.1", "172.31.255.255", "192.168.1.20", "classifieds-marketplace-api", "[::1]"]) {
    assert.equal(isInternalHostname(host), true, host);
  }
  for (const host of ["chat.wisdomtooth.tech", "13.207.85.164", "172.32.0.1", "8.8.8.8", "api.example.com"]) {
    assert.equal(isInternalHostname(host), false, host);
  }
});

test("normalizes base URLs and strips trailing slashes", () => {
  assert.equal(normalizeUpstreamBaseUrl("https://api.example.com/"), "https://api.example.com");
  assert.equal(normalizeUpstreamBaseUrl(" https://api.example.com/api/v1/ "), "https://api.example.com/api/v1");
  assert.equal(normalizeUpstreamBaseUrl("http://classifieds-marketplace-api:8000/api/v1"), "http://classifieds-marketplace-api:8000/api/v1");
});

test("does not upgrade an internal http URL to https", () => {
  // Regression: the previous rewrites replaced ^http: with https: and broke internal upstreams.
  const normalized = normalizeUpstreamBaseUrl("http://classifieds-marketplace-api:8000/api/v1");
  assert.ok(normalized?.startsWith("http://"));
});

test("rejects cleartext http to public hosts, credentials, queries, fragments and other schemes", () => {
  for (const value of [
    "http://chat.wisdomtooth.tech/api/v1",
    "http://13.207.85.164/api/v1",
    "https://user:pass@api.example.com",
    "https://api.example.com/?x=1",
    "https://api.example.com/#frag",
    "ftp://api.example.com",
    "javascript:alert(1)",
    "not a url",
    "",
    "   ",
    undefined,
  ]) {
    assert.equal(normalizeUpstreamBaseUrl(value), null, String(value));
  }
});

test("toApiV1Base appends /api/v1 exactly once", () => {
  assert.equal(toApiV1Base("https://api.example.com"), "https://api.example.com/api/v1");
  assert.equal(toApiV1Base("https://api.example.com/api/v1"), "https://api.example.com/api/v1");
  assert.equal(toApiV1Base("https://api.example.com/api/v1/"), "https://api.example.com/api/v1");
});

test("resolveUpstreamUrls returns normalized values and null for unset optional variables", () => {
  const resolved = resolveUpstreamUrls(
    { AUTH_API_BASE_URL: "https://auth.example.com/", CHAT_API_BASE_URL: "http://svc:8000/api/v1" },
    {
      AUTH_API_BASE_URL: { required: true, purpose: "Identity API" },
      CHAT_API_BASE_URL: { required: true, purpose: "Marketplace API" },
      WORKFLOW_API_BASE_URL: { required: false, purpose: "Workflow API" },
    },
  );
  assert.deepEqual(resolved, {
    AUTH_API_BASE_URL: "https://auth.example.com",
    CHAT_API_BASE_URL: "http://svc:8000/api/v1",
    WORKFLOW_API_BASE_URL: null,
  });
});

test("missing mandatory variables fail with names only and never fall back to an endpoint", () => {
  assert.throws(
    () => resolveUpstreamUrls({}, {
      AUTH_API_BASE_URL: { required: true, purpose: "Identity API" },
      CHAT_API_BASE_URL: { required: true, purpose: "Marketplace API" },
    }),
    (error: unknown) => {
      assert.ok(error instanceof UpstreamConfigError);
      assert.deepEqual(error.missing, ["AUTH_API_BASE_URL", "CHAT_API_BASE_URL"]);
      assert.match(error.message, /AUTH_API_BASE_URL is required/);
      assert.match(error.message, /CHAT_API_BASE_URL is required/);
      assert.doesNotMatch(error.message, /wisdomtooth|invigor8|13\.207/);
      return true;
    },
  );
});

test("a blank mandatory variable is treated as missing", () => {
  assert.throws(
    () => resolveUpstreamUrls({ AUTH_API_BASE_URL: "   " }, { AUTH_API_BASE_URL: { required: true, purpose: "Identity API" } }),
    UpstreamConfigError,
  );
});

test("an invalid value is reported by name and its value is never echoed", () => {
  const secretLooking = "https://user:s3cr3t-token@api.example.com";
  assert.throws(
    () => resolveUpstreamUrls({ AUTH_API_BASE_URL: secretLooking }, { AUTH_API_BASE_URL: { required: true, purpose: "Identity API" } }),
    (error: unknown) => {
      assert.ok(error instanceof UpstreamConfigError);
      assert.deepEqual(error.invalid, ["AUTH_API_BASE_URL"]);
      assert.doesNotMatch(error.message, /s3cr3t-token/);
      assert.doesNotMatch(error.message, /api\.example\.com/);
      return true;
    },
  );
});

test("an invalid optional variable still fails instead of being silently ignored", () => {
  assert.throws(
    () => resolveUpstreamUrls({ WORKFLOW_API_BASE_URL: "http://public.example.com" }, { WORKFLOW_API_BASE_URL: { required: false, purpose: "Workflow API" } }),
    UpstreamConfigError,
  );
});

test("findMissingEnv reports unset and blank names only", () => {
  assert.deepEqual(findMissingEnv({ A: "x", B: " ", C: undefined }, ["A", "B", "C", "D"]), ["B", "C", "D"]);
});

test("origin allowlist keeps only exact origins and drops malformed entries", () => {
  const allowlist = parseOriginAllowlist("https://api.example.com/, http://svc:8000 ,not-a-url,https://x.example.com/path,https://u:p@h.example.com,");
  assert.deepEqual([...allowlist].sort(), ["http://svc:8000", "https://api.example.com"]);
  assert.equal(parseOriginAllowlist(undefined).size, 0);
  assert.equal(parseOriginAllowlist("").size, 0);
});

test("trusted upstream requires an explicit allowlist entry (empty allowlist trusts nothing)", () => {
  assert.equal(isTrustedUpstreamUrl(new URL("https://chat.wisdomtooth.tech/api/v1"), new Set()), false);
  const allowlist = parseOriginAllowlist("https://api.example.com,http://classifieds-marketplace-api:8000");
  assert.equal(isTrustedUpstreamUrl(new URL("https://api.example.com/api/v1/x"), allowlist), true);
  assert.equal(isTrustedUpstreamUrl(new URL("http://classifieds-marketplace-api:8000/api/v1/x"), allowlist), true);
  assert.equal(isTrustedUpstreamUrl(new URL("https://evil.example.com/api/v1/x"), allowlist), false);
  // Same host, different scheme or port is a different origin.
  assert.equal(isTrustedUpstreamUrl(new URL("http://api.example.com/api/v1/x"), allowlist), false);
  assert.equal(isTrustedUpstreamUrl(new URL("http://classifieds-marketplace-api:9999/x"), allowlist), false);
});

test("cleartext http is trusted only when the allowlisted host is internal", () => {
  const allowlist = parseOriginAllowlist("http://public.example.com");
  assert.equal(isTrustedUpstreamUrl(new URL("http://public.example.com/x"), allowlist), false);
});
