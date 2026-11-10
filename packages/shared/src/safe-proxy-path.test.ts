import assert from "node:assert/strict";
import test from "node:test";

import { isSafeRawPathname, resolveSafeProxyPath } from "./safe-proxy-path.ts";

/** Emulates how Next.js builds the catch-all parameter: split the raw path, decode each segment once. */
function nextCatchAllSegments(rawPathname: string, mountPrefix = "/api/chat/"): string[] {
  return rawPathname
    .slice(mountPrefix.length)
    .split("/")
    .map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    });
}

function resolveRaw(rawPathname: string): string | null {
  return resolveSafeProxyPath(nextCatchAllSegments(rawPathname), { rawPathname });
}

const rawOf = (path: string) => `/api/chat/${path}`;

test("accepts the normal chat routes and keeps them byte-for-byte", () => {
  for (const path of [
    "messages",
    "conversations/3f2b9c1e-1111-4222-8333-444455556666",
    "groups/group-1/members",
    "presence/online",
    "attachments/upload",
    "uploads/group-avatars/group.webp",
    "uploads/thumbnails",
    "auth/chat-token",
    "users/me/notifications",
  ]) {
    assert.equal(resolveRaw(rawOf(path)), path, path);
  }
});

test("re-encodes decoded segments so spaces and Unicode survive and cannot change the URL", () => {
  assert.equal(resolveRaw(rawOf("attachments/my%20file.pdf")), "attachments/my%20file.pdf");
  assert.equal(resolveRaw(rawOf("attachments/r%C3%A9sum%C3%A9.pdf")), "attachments/r%C3%A9sum%C3%A9.pdf");
  assert.equal(resolveSafeProxyPath(["attachments", "my file é.pdf"]), "attachments/my%20file%20%C3%A9.pdf");
});

test("keeps one trailing slash (collection routes) and handles the empty-path option", () => {
  assert.equal(resolveSafeProxyPath(["messages", ""]), "messages/");
  assert.equal(resolveSafeProxyPath([]), null);
  assert.equal(resolveSafeProxyPath([], { allowEmpty: true }), "");
});

test("rejects literal dot segments, whichever way the segments are split", () => {
  for (const segments of [["..", "admin"], [".", "x"], ["a", "..", "b"], ["../../admin"], ["a/../b"], [" .. "], [". "], ["..\t"]]) {
    assert.equal(resolveSafeProxyPath(segments), null, JSON.stringify(segments));
  }
});

test("reproduced attack: ..%2f..%2fadmin is refused (it reached the backend as /admin before)", () => {
  assert.equal(resolveRaw(rawOf("..%2f..%2fadmin")), null);
  // Even if only the decoded segment were checked, it is refused on its own:
  assert.equal(resolveSafeProxyPath(["../../admin"]), null);
  // And the raw check refuses it even when the segments look harmless:
  assert.equal(resolveSafeProxyPath(["messages"], { rawPathname: rawOf("..%2f..%2fadmin") }), null);
});

test("rejects encoded path separators in every letter case", () => {
  for (const value of ["a%2fb", "a%2Fb", "a%5cb", "a%5Cb", "%2f", "%2F%2F", "..%2F..%2Fadmin", "..%5c..%5cadmin", "x%2f..%2fy"]) {
    assert.equal(isSafeRawPathname(rawOf(value)), false, value);
    assert.equal(resolveRaw(rawOf(value)), null, value);
  }
});

test("rejects encoded dot segments in every letter case and mixed form", () => {
  for (const value of ["%2e%2e/admin", "%2E%2E/admin", "%2e%2E/admin", "%2E%2e/admin", ".%2e/admin", "%2e./admin", "%2e%2e%2fadmin", "a/%2e%2e/b", "%2e/x"]) {
    assert.equal(resolveRaw(rawOf(value)), null, value);
  }
});

test("rejects double and multiple encoding of dots, slashes, backslashes and percent", () => {
  for (const value of [
    "%252e%252e%252fadmin", "%252E%252E%252Fadmin", "%252e%252e/admin", "%252f", "%252F", "%255c", "%255C", "%25252e%25252e",
    "%25", "a%25b", "%2525", "%252e",
  ]) {
    assert.equal(resolveRaw(rawOf(value)), null, value);
  }
  // After Next.js decodes once, a double-encoded value is a literal `%2e%2e` segment; it is refused on its own.
  for (const segment of ["%2e%2e", "%2F", "%5c", "%252e", "a%2fb"]) {
    assert.equal(resolveSafeProxyPath([segment]), null, segment);
  }
});

test("rejects backslash traversal", () => {
  for (const value of ["..\\admin", "a\\b", "\\\\server\\share", "..%5Cadmin"]) {
    assert.equal(resolveRaw(rawOf(value)), null, value);
  }
  assert.equal(resolveSafeProxyPath(["..\\admin"]), null);
  assert.equal(resolveSafeProxyPath(["a\\b"]), null);
});

test("rejects malformed percent-encoding and invalid UTF-8", () => {
  for (const value of ["%", "a%", "%2", "%g1", "%zz", "%%2e", "a%2", "%c0%af", "%e0%80%af", "%ff", "%c1%9c", "%u002e"]) {
    assert.equal(resolveRaw(rawOf(value)), null, value);
  }
});

test("rejects control characters, NUL and URL delimiters hidden in a segment", () => {
  for (const segment of ["a\u0000b", "a\nb", "a\r\nb", "a\u007fb", "a?x=1", "a#frag", "a%b", "?", "#"]) {
    assert.equal(resolveSafeProxyPath([segment]), null, JSON.stringify(segment));
  }
  for (const value of ["a%00b", "a%0ab", "a%0d%0ab", "a%3fb%00"]) {
    assert.equal(resolveRaw(rawOf(value)), null, value);
  }
});

test("a decoded ? or # is refused instead of becoming a query or fragment upstream", () => {
  assert.equal(resolveRaw(rawOf("messages%3Fadmin=1")), null);
  assert.equal(resolveRaw(rawOf("messages%23x")), null);
});

test("rejects Unicode look-alikes of dots and slashes (NFKC)", () => {
  for (const segment of ["．．", "／", "a／b", "＼", "․․"]) {
    assert.equal(resolveSafeProxyPath([segment]), null, JSON.stringify(segment));
  }
});

test("rejects empty segments except one trailing slash, oversized input and lone surrogates", () => {
  assert.equal(resolveSafeProxyPath([""]), null);
  assert.equal(resolveSafeProxyPath(["a", "", "b"]), null);
  assert.equal(resolveSafeProxyPath(["a", "b", "", ""]), null);
  assert.equal(resolveSafeProxyPath(["x".repeat(256)]), null);
  assert.equal(resolveSafeProxyPath(Array.from({ length: 17 }, (_, i) => `s${i}`)), null);
  assert.equal(resolveSafeProxyPath(["\ud800"]), null);
});

test("a result can never leave the prefix, even after URL normalization", () => {
  const vectors = [
    "messages", "uploads/group-avatars/group.webp", "attachments/my%20file.pdf", "..%2f..%2fadmin", "%2e%2e%2fadmin",
    "%252e%252e%252fadmin", "a/../b", "./x", "..\\x", "%zz", "%c0%af", "messages%3F", "x%00y", "．．/x",
  ];
  for (const value of vectors) {
    const result = resolveRaw(rawOf(value));
    if (result === null) continue;
    const url = new URL(`/api/v1/${result}`, "http://upstream.invalid");
    assert.equal(url.pathname, `/api/v1/${result}`, `${value} was altered by URL normalization`);
    assert.equal(url.search, "");
    assert.equal(url.hash, "");
    assert.equal(url.origin, "http://upstream.invalid");
  }
});

test("a custom upstream prefix is enforced (Workflow resources)", () => {
  assert.equal(resolveSafeProxyPath(["abc"], { upstreamPrefix: "/api/v1/forms/" }), "abc");
  assert.equal(resolveSafeProxyPath(["..", "workflows"], { upstreamPrefix: "/api/v1/forms/" }), null);
});
