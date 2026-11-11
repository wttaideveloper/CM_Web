import assert from "node:assert/strict";
import test from "node:test";

const { resolveMarketplaceUrl } = await import(new URL("./marketplace-url.ts", import.meta.url).href);

const trusted = {
  CHAT_API_BASE_URL: "https://marketplace-api.wisdomtoothstage.tech/api/v1",
  PLATFORM_TRUSTED_UPSTREAM_ORIGINS: "https://marketplace-api.wisdomtoothstage.tech",
};

test("accepts a configured production Platform API origin", () => {
  assert.equal(
    resolveMarketplaceUrl("/api/v1/events", "", {
      CHAT_API_BASE_URL: "https://chat.wisdomtooth.tech/api/v1",
      PLATFORM_TRUSTED_UPSTREAM_ORIGINS: "https://chat.wisdomtooth.tech",
    })?.hostname,
    "chat.wisdomtooth.tech",
  );
});

test("accepts the confirmed staging Platform API origin", () => {
  assert.equal(
    resolveMarketplaceUrl("/api/v1/events", "", trusted)?.hostname,
    "marketplace-api.wisdomtoothstage.tech",
  );
});

test("rejects arbitrary hosts and deceptive subdomains", () => {
  assert.equal(resolveMarketplaceUrl("/api/v1/events", "", { ...trusted, CHAT_API_BASE_URL: "https://api.example.test/api/v1" }), null);
  assert.equal(resolveMarketplaceUrl("/api/v1/events", "", { ...trusted, CHAT_API_BASE_URL: "https://marketplace-api.wisdomtoothstage.tech.attacker.test/api/v1" }), null);
  assert.equal(resolveMarketplaceUrl("/api/v1/events", "", { ...trusted, CHAT_API_BASE_URL: "https://chat.wisdomtooth.tech.attacker.test/api/v1" }), null);
});

test("rejects unsafe protocols, credentials, and explicit ports", () => {
  assert.equal(resolveMarketplaceUrl("/api/v1/events", "", { ...trusted, CHAT_API_BASE_URL: "http://chat.wisdomtooth.tech/api/v1", PLATFORM_TRUSTED_UPSTREAM_ORIGINS: "http://chat.wisdomtooth.tech" }), null);
  assert.equal(resolveMarketplaceUrl("/api/v1/events", "", { ...trusted, CHAT_API_BASE_URL: "javascript:alert(1)" }), null);
  assert.equal(resolveMarketplaceUrl("/api/v1/events", "", { ...trusted, CHAT_API_BASE_URL: "https://user:secret@chat.wisdomtooth.tech/api/v1", PLATFORM_TRUSTED_UPSTREAM_ORIGINS: "https://chat.wisdomtooth.tech" }), null);
  assert.equal(resolveMarketplaceUrl("/api/v1/events", "", { ...trusted, CHAT_API_BASE_URL: "https://chat.wisdomtooth.tech:8443/api/v1" }), null);
});

test("does not expand the configured API allowlist to localhost", () => {
  assert.equal(resolveMarketplaceUrl("/api/v1/events", "", { ...trusted, CHAT_API_BASE_URL: "http://localhost:8000/api/v1" }), null);
  assert.equal(resolveMarketplaceUrl("/api/v1/events", "", { ...trusted, CHAT_API_BASE_URL: "http://127.0.0.1:8000/api/v1" }), null);
});

test("preserves the explicitly supported internal development option in the shared validator", () => {
  assert.equal(
    resolveMarketplaceUrl("/api/v1/events", "", { CHAT_API_BASE_URL: "http://localhost:8000/api/v1", PLATFORM_TRUSTED_UPSTREAM_ORIGINS: "http://localhost:8000" })?.hostname,
    "localhost",
  );
  assert.equal(
    resolveMarketplaceUrl("/api/v1/events", "", { CHAT_API_BASE_URL: "http://platform-api:8000/api/v1", PLATFORM_TRUSTED_UPSTREAM_ORIGINS: "http://platform-api:8000" })?.hostname,
    "platform-api",
  );
});
