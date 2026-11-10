import assert from "node:assert/strict";
import test from "node:test";

import { resolveChatSocketUrl } from "./chat-socket-url.ts";

test("returns the configured socket origin unchanged", () => {
  assert.equal(resolveChatSocketUrl("https://chat.staging.example.test"), "https://chat.staging.example.test");
  assert.equal(resolveChatSocketUrl("  wss://chat.staging.example.test  "), "wss://chat.staging.example.test");
  assert.equal(resolveChatSocketUrl("http://127.0.0.1:8001"), "http://127.0.0.1:8001");
});

test("an unset or empty value never falls back to a legacy AWS host", () => {
  for (const value of [undefined, "", "   "]) {
    const resolved = resolveChatSocketUrl(value);
    assert.equal(resolved, null);
    assert.doesNotMatch(String(resolved), /wisdomtooth/);
  }
});

test("rejects malformed values, other schemes and embedded credentials", () => {
  for (const value of ["not a url", "ftp://chat.example.test", "javascript:alert(1)", "https://user:secret@chat.example.test"]) {
    assert.equal(resolveChatSocketUrl(value), null, value);
  }
});
