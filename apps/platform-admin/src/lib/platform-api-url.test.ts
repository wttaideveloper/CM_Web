import assert from "node:assert/strict";
import test from "node:test";

const { getAllowedPlatformApiUrl } = await import(new URL("./platform-api-url.ts", import.meta.url).href);

test("accepts the existing production Platform API origin", () => {
  assert.equal(
    getAllowedPlatformApiUrl("https://chat.wisdomtooth.tech/api/v1")?.hostname,
    "chat.wisdomtooth.tech",
  );
});

test("accepts the confirmed staging Platform API origin", () => {
  assert.equal(
    getAllowedPlatformApiUrl("https://marketplace-api.wisdomtoothstage.tech/api/v1")?.hostname,
    "marketplace-api.wisdomtoothstage.tech",
  );
});

test("rejects arbitrary hosts and deceptive subdomains", () => {
  assert.equal(getAllowedPlatformApiUrl("https://api.example.test/api/v1"), null);
  assert.equal(getAllowedPlatformApiUrl("https://marketplace-api.wisdomtoothstage.tech.attacker.test/api/v1"), null);
  assert.equal(getAllowedPlatformApiUrl("https://chat.wisdomtooth.tech.attacker.test/api/v1"), null);
});

test("rejects unsafe protocols, credentials, and explicit ports", () => {
  assert.equal(getAllowedPlatformApiUrl("http://chat.wisdomtooth.tech/api/v1"), null);
  assert.equal(getAllowedPlatformApiUrl("javascript:alert(1)"), null);
  assert.equal(getAllowedPlatformApiUrl("https://user:secret@chat.wisdomtooth.tech/api/v1"), null);
  assert.equal(getAllowedPlatformApiUrl("https://chat.wisdomtooth.tech:8443/api/v1"), null);
});

test("does not expand the API allowlist to localhost", () => {
  assert.equal(getAllowedPlatformApiUrl("http://localhost:8000/api/v1"), null);
  assert.equal(getAllowedPlatformApiUrl("http://127.0.0.1:8000/api/v1"), null);
});

test("preserves the explicitly supported localhost development option", () => {
  assert.equal(
    getAllowedPlatformApiUrl("http://localhost:8000/api/v1", { allowLocalhost: true })?.hostname,
    "localhost",
  );
  assert.equal(
    getAllowedPlatformApiUrl("http://127.0.0.1:8000/api/v1", { allowLocalhost: true })?.hostname,
    "127.0.0.1",
  );
});
