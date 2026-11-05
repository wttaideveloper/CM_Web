import assert from "node:assert/strict";
import test from "node:test";

import {
  buildContentSecurityPolicy,
  createCspNonce,
  cspHeaderName,
  STATIC_SECURITY_HEADERS,
  toConnectSources,
} from "./security-headers.ts";

function directive(policy: string, name: string): string[] {
  const entry = policy.split("; ").find((part) => part.startsWith(`${name} `));
  assert.ok(entry, `${name} directive is present`);
  return entry.slice(name.length + 1).split(" ");
}

test("production CSP is strict for scripts and forbids framing and plugins", () => {
  const policy = buildContentSecurityPolicy({ nonce: "abc123", isDevelopment: false });
  const scriptSrc = directive(policy, "script-src");
  assert.deepEqual(scriptSrc, ["'self'", "'nonce-abc123'", "'strict-dynamic'"]);
  assert.ok(!scriptSrc.includes("'unsafe-inline'"));
  assert.ok(!scriptSrc.includes("'unsafe-eval'"));
  assert.deepEqual(directive(policy, "frame-ancestors"), ["'none'"]);
  assert.deepEqual(directive(policy, "object-src"), ["'none'"]);
  assert.deepEqual(directive(policy, "base-uri"), ["'self'"]);
  assert.deepEqual(directive(policy, "form-action"), ["'self'"]);
  assert.ok(!policy.includes("ws:"), "no blanket ws: in production");
});

test("development CSP adds unsafe-eval only for scripts", () => {
  const policy = buildContentSecurityPolicy({ nonce: "n", isDevelopment: true });
  assert.ok(directive(policy, "script-src").includes("'unsafe-eval'"));
});

test("connect-src allows self plus configured origins with their websocket counterparts", () => {
  const policy = buildContentSecurityPolicy({ nonce: "n", isDevelopment: false, connectOrigins: ["https://chat.example.com", "http://127.0.0.1:8001"] });
  assert.deepEqual(directive(policy, "connect-src"), [
    "'self'",
    "https://chat.example.com",
    "wss://chat.example.com",
    "http://127.0.0.1:8001",
    "ws://127.0.0.1:8001",
  ]);
});

test("connect sources ignore malformed, empty and non-http origins so a typo only tightens the policy", () => {
  assert.deepEqual(toConnectSources(["", undefined, "not a url", "javascript:alert(1)", "ftp://x.example.com"]), []);
});

test("nonces are unique, unpredictable-looking base64 values", () => {
  const nonces = new Set(Array.from({ length: 200 }, () => createCspNonce()));
  assert.equal(nonces.size, 200);
  for (const nonce of nonces) assert.match(nonce, /^[A-Za-z0-9+/]{22}==$/);
});

test("static headers include the handbook §7 set", () => {
  const headers = new Map(STATIC_SECURITY_HEADERS.map((header) => [header.key, header.value]));
  assert.match(headers.get("Strict-Transport-Security") ?? "", /includeSubDomains/);
  assert.match(headers.get("Strict-Transport-Security") ?? "", /preload/);
  assert.equal(headers.get("X-Content-Type-Options"), "nosniff");
  assert.equal(headers.get("Referrer-Policy"), "strict-origin-when-cross-origin");
  assert.equal(headers.get("X-Frame-Options"), "DENY");
});

test("report-only switch selects the header name", () => {
  assert.equal(cspHeaderName(false), "Content-Security-Policy");
  assert.equal(cspHeaderName(true), "Content-Security-Policy-Report-Only");
});
