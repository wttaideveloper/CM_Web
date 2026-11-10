import assert from "node:assert/strict";
import test from "node:test";

import { resolveMarketplaceOrigin, resolveMarketplaceUrl, TRUSTED_UPSTREAM_ORIGINS_ENV } from "./marketplace-url.ts";

const hostinger = {
  CHAT_API_BASE_URL: "http://classifieds-marketplace-api:8000/api/v1",
  [TRUSTED_UPSTREAM_ORIGINS_ENV]: "http://classifieds-marketplace-api:8000",
};

test("builds an internal http Marketplace URL when its origin is explicitly trusted (Hostinger)", () => {
  const url = resolveMarketplaceUrl("/api/v1/events/", "page=2", hostinger);
  assert.equal(url?.toString(), "http://classifieds-marketplace-api:8000/api/v1/events/?page=2");
});

test("still supports an https upstream when allowlisted (AWS-style explicit configuration)", () => {
  const url = resolveMarketplaceUrl("/api/v1/enterprises/", "", {
    CHAT_API_BASE_URL: "https://chat.example.test/api/v1",
    [TRUSTED_UPSTREAM_ORIGINS_ENV]: "https://chat.example.test",
  });
  assert.equal(url?.toString(), "https://chat.example.test/api/v1/enterprises/");
});

test("fails closed when the trusted-origin allowlist is missing or empty", () => {
  assert.equal(resolveMarketplaceUrl("/api/v1/events/", "", { CHAT_API_BASE_URL: hostinger.CHAT_API_BASE_URL }), null);
  assert.equal(resolveMarketplaceUrl("/api/v1/events/", "", { ...hostinger, [TRUSTED_UPSTREAM_ORIGINS_ENV]: "" }), null);
});

test("fails closed when the API base URL is missing — no built-in host is assumed", () => {
  assert.equal(resolveMarketplaceUrl("/api/v1/events/", "", { [TRUSTED_UPSTREAM_ORIGINS_ENV]: "https://chat.wisdomtooth.tech" }), null);
  assert.equal(resolveMarketplaceUrl("/api/v1/events/", "", {}), null);
});

test("refuses a base URL whose origin is not allowlisted", () => {
  assert.equal(
    resolveMarketplaceUrl("/api/v1/events/", "", {
      CHAT_API_BASE_URL: "https://attacker.example.test/api/v1",
      [TRUSTED_UPSTREAM_ORIGINS_ENV]: "https://chat.example.test",
    }),
    null,
  );
});

test("an allowlisted origin on a different port or scheme is not trusted", () => {
  assert.equal(resolveMarketplaceUrl("/api/v1/x", "", { ...hostinger, CHAT_API_BASE_URL: "http://classifieds-marketplace-api:9000/api/v1" }), null);
  assert.equal(resolveMarketplaceUrl("/api/v1/x", "", { ...hostinger, CHAT_API_BASE_URL: "https://classifieds-marketplace-api:8000/api/v1" }), null);
});

test("never sends the bearer over cleartext http to a public host, even if allowlisted", () => {
  assert.equal(
    resolveMarketplaceUrl("/api/v1/events/", "", {
      CHAT_API_BASE_URL: "http://chat.example.test/api/v1",
      [TRUSTED_UPSTREAM_ORIGINS_ENV]: "http://chat.example.test",
    }),
    null,
  );
});

test("rejects credentials, query strings and fragments embedded in the configured base URL", () => {
  for (const base of [
    "http://user:pass@classifieds-marketplace-api:8000/api/v1",
    "http://classifieds-marketplace-api:8000/api/v1?x=1",
    "http://classifieds-marketplace-api:8000/api/v1#frag",
  ]) {
    assert.equal(resolveMarketplaceUrl("/api/v1/x", "", { ...hostinger, CHAT_API_BASE_URL: base }), null, base);
  }
});

test("exposes only the trusted origin for media URL construction", () => {
  assert.equal(resolveMarketplaceOrigin(hostinger), "http://classifieds-marketplace-api:8000");
  assert.equal(resolveMarketplaceOrigin({ CHAT_API_BASE_URL: hostinger.CHAT_API_BASE_URL }), null);
});
