import assert from "node:assert/strict";
import test from "node:test";

import { TRUSTED_UPSTREAM_ORIGINS_ENV } from "./marketplace-url.ts";
import { resolveWorkflowUrl } from "./workflow-url.ts";

const trustedHttps = {
  WORKFLOW_API_BASE_URL: "https://workflow.example.test",
  [TRUSTED_UPSTREAM_ORIGINS_ENV]: "https://workflow.example.test",
};

const resolve = (env: Record<string, string | undefined>, segments: string[] = [], search = "", raw = "/api/platform-super-admin/forms") =>
  resolveWorkflowUrl("forms", segments, search, raw, env);

test("builds the Workflow URL when its exact origin is trusted", () => {
  const result = resolve(trustedHttps, ["form-1", "versions"], "?page=2", "/api/platform-super-admin/forms/form-1/versions");
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.url.toString(), "https://workflow.example.test/api/v1/forms/form-1/versions?page=2");
});

test("a collection route (no segments) maps to the resource root", () => {
  const result = resolveWorkflowUrl("workflows", [], "", "/api/platform-super-admin/workflows", trustedHttps);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.url.toString(), "https://workflow.example.test/api/v1/workflows");
});

test("only the origin of the configured base is used, so a base path cannot redirect the proxy", () => {
  const result = resolve({ ...trustedHttps, WORKFLOW_API_BASE_URL: "https://workflow.example.test/some/other/path" }, ["a"]);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.url.pathname, "/api/v1/forms/a");
});

test("accepts a trusted internal http origin (Docker network) but never a public cleartext one", () => {
  const internal = { WORKFLOW_API_BASE_URL: "http://workflow-api:9000", [TRUSTED_UPSTREAM_ORIGINS_ENV]: "http://workflow-api:9000" };
  assert.equal(resolve(internal).ok, true);
  const publicHttp = { WORKFLOW_API_BASE_URL: "http://workflow.example.test", [TRUSTED_UPSTREAM_ORIGINS_ENV]: "http://workflow.example.test" };
  assert.deepEqual(resolve(publicHttp), { ok: false, reason: "not-configured" });
});

test("refuses an untrusted Workflow origin before any request: empty list, other origin, port, scheme or look-alike host", () => {
  for (const trusted of [
    undefined,
    "",
    "https://other.example.test",
    "http://classifieds-marketplace-api:8000",
    "https://workflow.example.test:8443",
    "http://workflow.example.test",
    "https://workflow.example.test.evil.test",
    "https://evil.test",
    "not-an-origin",
    "https://workflow.example.test/path",
  ]) {
    const result = resolve({ WORKFLOW_API_BASE_URL: "https://workflow.example.test", [TRUSTED_UPSTREAM_ORIGINS_ENV]: trusted });
    assert.deepEqual(result, { ok: false, reason: "untrusted-origin" }, String(trusted));
  }
});

test("treats unset, blank, malformed and credential-bearing base URLs as not configured", () => {
  for (const base of [undefined, "", "   ", "not a url", "ftp://workflow.example.test", "https://user:secret@workflow.example.test", "https://workflow.example.test?x=1"]) {
    const result = resolve({ WORKFLOW_API_BASE_URL: base, [TRUSTED_UPSTREAM_ORIGINS_ENV]: "https://workflow.example.test" });
    assert.deepEqual(result, { ok: false, reason: "not-configured" }, String(base));
  }
});

test("rejects traversal, encoded and malformed paths for a trusted origin (and never builds a URL)", () => {
  const hostile: Array<[string[], string]> = [
    [["..", "workflows"], "/api/platform-super-admin/forms/../workflows"],
    [["../../admin"], "/api/platform-super-admin/forms/..%2f..%2fadmin"],
    [["..%2fadmin"], "/api/platform-super-admin/forms/..%252fadmin"],
    [["a"], "/api/platform-super-admin/forms/%2e%2e%2fadmin"],
    [["a"], "/api/platform-super-admin/forms/%5cadmin"],
    [["a"], "/api/platform-super-admin/forms/%zz"],
    [["a?x=1"], "/api/platform-super-admin/forms/a%3fx=1"],
  ];
  for (const [segments, raw] of hostile) {
    assert.deepEqual(resolve(trustedHttps, segments, "", raw), { ok: false, reason: "invalid-path" }, raw);
  }
});

test("an untrusted origin is reported before the path is even examined", () => {
  const result = resolve({ WORKFLOW_API_BASE_URL: "https://workflow.example.test", [TRUSTED_UPSTREAM_ORIGINS_ENV]: "https://other.example.test" }, ["..", "x"]);
  assert.deepEqual(result, { ok: false, reason: "untrusted-origin" });
});

test("re-encodes segments so a decoded space cannot change the forwarded URL", () => {
  const result = resolve(trustedHttps, ["a b"], "", "/api/platform-super-admin/forms/a%20b");
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.url.pathname, "/api/v1/forms/a%20b");
});
