import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";

import {
  createSignedCsrfToken,
  guardCsrfRequest,
  hasAllowedCsrfOrigin,
  loadCsrfServerConfiguration,
  parseCsrfAllowedOrigins,
  verifySignedCsrfToken,
  type CsrfKeyRing,
} from "./csrf.server.ts";

const sessionBinding = "server-verified-session-id";
const nowSeconds = 1_800_000_000;
const activeKey = randomBytes(32).toString("base64url");
const oldKey = randomBytes(32).toString("base64url");
const keyRing: CsrfKeyRing = { activeKeyId: "2026-11", keys: { "2026-11": activeKey } };
const allowedOrigins = ["https://platform.example.test"];
const tokenOptions = { application: "platform-admin" as const, sessionBinding, keyRing, tokenTtlSeconds: 900, nowSeconds };

function token(): string {
  return createSignedCsrfToken(tokenOptions);
}

function request(method: string, csrfToken?: string, origin = "https://platform.example.test"): Request {
  return new Request("https://platform.example.test/api/change", {
    method,
    headers: {
      ...(origin ? { Origin: origin } : {}),
      ...(csrfToken ? { Cookie: `csrf_token=${csrfToken}`, "X-CSRF-Token": csrfToken } : {}),
    },
  });
}

const guardOptions = {
  ...tokenOptions,
  allowedOrigins,
  csrfCookieName: "csrf_token",
};

test("accepts a valid same-session signed double-submit token", () => {
  const value = token();
  assert.equal(value.includes(sessionBinding), false);
  assert.equal(guardCsrfRequest(request("POST", value), guardOptions), null);
});

test("rejects missing tokens and mismatched cookie/header values", async () => {
  const missing = guardCsrfRequest(request("POST"), guardOptions);
  assert.equal(missing?.status, 403);
  assert.equal(missing?.headers.get("cache-control"), "no-store");
  assert.deepEqual(await missing?.json(), { detail: "Request could not be validated." });

  const value = token();
  const mismatchRequest = new Request("https://platform.example.test/api/change", {
    method: "POST",
    headers: { Origin: allowedOrigins[0]!, Cookie: `csrf_token=${value}`, "X-CSRF-Token": `${value}x` },
  });
  assert.equal(guardCsrfRequest(mismatchRequest, guardOptions)?.status, 403);
});

test("rejects invalid signatures, tampering, malformed and expired tokens", () => {
  const value = token();
  const signatureTampered = `${value.slice(0, -1)}${value.endsWith("a") ? "b" : "a"}`;
  assert.equal(verifySignedCsrfToken(signatureTampered, tokenOptions), false);
  const segments = value.split(".");
  segments[2] = String(nowSeconds - 10);
  assert.equal(verifySignedCsrfToken(segments.join("."), tokenOptions), false);
  assert.equal(verifySignedCsrfToken("v2.invalid", tokenOptions), false);
  assert.equal(verifySignedCsrfToken(value, { ...tokenOptions, nowSeconds: nowSeconds + 901 }), false);
});

test("binds tokens to both the stable session and application context", () => {
  const value = token();
  assert.equal(verifySignedCsrfToken(value, { ...tokenOptions, sessionBinding: "another-session" }), false);
  assert.equal(verifySignedCsrfToken(value, { ...tokenOptions, application: "enterprise-admin" }), false);
});

test("a token remains valid across auth credential rotation only when stable session binding remains", () => {
  const value = token();
  // Authentication credential rotation is deliberately not represented; the adapter must resolve the same stable SID.
  assert.equal(verifySignedCsrfToken(value, { ...tokenOptions, nowSeconds: nowSeconds + 60 }), true);
  assert.equal(verifySignedCsrfToken(value, { ...tokenOptions, sessionBinding: "rotated-or-new-session" }), false);
});

test("accepts previous signing keys during rotation and signs with the active key", () => {
  const previousRing: CsrfKeyRing = { activeKeyId: "2026-10", keys: { "2026-10": oldKey } };
  const previousToken = createSignedCsrfToken({ ...tokenOptions, keyRing: previousRing });
  const rotatedRing: CsrfKeyRing = {
    activeKeyId: "2026-11",
    keys: { "2026-11": activeKey, "2026-10": oldKey },
  };
  assert.equal(verifySignedCsrfToken(previousToken, { ...tokenOptions, keyRing: rotatedRing }), true);
  assert.equal(createSignedCsrfToken({ ...tokenOptions, keyRing: rotatedRing }).split(".")[1], "2026-11");
  assert.equal(verifySignedCsrfToken(previousToken, { ...tokenOptions, keyRing }), false);
});

test("fails closed after logout or account/session change when the session binding changes", () => {
  const value = token();
  assert.equal(verifySignedCsrfToken(value, { ...tokenOptions, sessionBinding: "" }), false);
  assert.equal(verifySignedCsrfToken(value, { ...tokenOptions, sessionBinding: "next-account-session" }), false);
});

test("safe methods remain unaffected without token, origin, or session binding", () => {
  for (const method of ["GET", "HEAD", "OPTIONS"]) {
    assert.equal(guardCsrfRequest(request(method), { ...guardOptions, sessionBinding: "" }), null);
  }
});

test("unsafe requests reject cross-origin, missing, null and malformed origins", () => {
  assert.equal(guardCsrfRequest(request("POST", token(), "https://evil.example.test"), guardOptions)?.status, 403);
  assert.equal(hasAllowedCsrfOrigin("null", null, allowedOrigins), false);
  assert.equal(hasAllowedCsrfOrigin("https://platform.example.test/", null, allowedOrigins), false);
  assert.equal(hasAllowedCsrfOrigin(null, null, allowedOrigins), false);
  assert.equal(hasAllowedCsrfOrigin(null, "not a url", allowedOrigins), false);
  assert.equal(hasAllowedCsrfOrigin(null, "https://platform.example.test/path", allowedOrigins), true);
  assert.equal(hasAllowedCsrfOrigin("https://evil.example.test", "https://platform.example.test/path", allowedOrigins), false);

  const value = token();
  const refererOnlyRequest = new Request("https://platform.example.test/api/change", {
    method: "POST",
    headers: { Referer: "https://platform.example.test/page", Cookie: `csrf_token=${value}`, "X-CSRF-Token": value },
  });
  assert.equal(guardCsrfRequest(refererOnlyRequest, guardOptions), null);
  const noOriginRequest = new Request("https://platform.example.test/api/change", {
    method: "POST",
    headers: { Cookie: `csrf_token=${value}`, "X-CSRF-Token": value },
  });
  assert.equal(guardCsrfRequest(noOriginRequest, guardOptions)?.status, 403);
});

test("parses only exact origins and requires complete server-only configuration", () => {
  assert.deepEqual(parseCsrfAllowedOrigins("https://platform.example.test,https://admin.example.test"), [
    "https://platform.example.test",
    "https://admin.example.test",
  ]);
  assert.throws(() => parseCsrfAllowedOrigins("https://platform.example.test/path"));
  const environment = {
    PLATFORM_ADMIN_CSRF_KEYRING_JSON: JSON.stringify({ activeKeyId: "2026-11", keys: { "2026-11": activeKey } }),
    PLATFORM_ADMIN_CSRF_ALLOWED_ORIGINS: "https://platform.example.test",
    PLATFORM_ADMIN_CSRF_TOKEN_TTL_SECONDS: "900",
  };
  assert.equal(loadCsrfServerConfiguration("platform-admin", environment).tokenTtlSeconds, 900);
  assert.throws(() => loadCsrfServerConfiguration("enterprise-admin", environment));
  assert.throws(() => loadCsrfServerConfiguration("platform-admin", {
    ...environment,
    PLATFORM_ADMIN_CSRF_KEYRING_JSON: JSON.stringify({ activeKeyId: "bad", keys: { bad: "short" } }),
  }));
});
