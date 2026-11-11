import assert from "node:assert/strict";
import test from "node:test";
import {
  buildBlogsApiUrl,
  resolveBlogsApiBase,
} from "./blogs-routing.ts";

test("uses the same-origin API route when no public base is configured", () => {
  assert.equal(resolveBlogsApiBase(), "/api/v1");
  assert.equal(resolveBlogsApiBase("   "), "/api/v1");
});

test("preserves explicit API base overrides", () => {
  assert.equal(resolveBlogsApiBase("/api/v1"), "/api/v1");
  assert.equal(
    resolveBlogsApiBase("https://chat.wisdomtooth.tech/api/v1"),
    "https://chat.wisdomtooth.tech/api/v1",
  );
});

test("uses the same-origin Blog path and serializes query parameters", () => {
  const requestedUrl = buildBlogsApiUrl("/api/v1", "/cms/blogs", {
      page: 2,
      page_size: 10,
      kind: "blog",
      category_id: "category 1",
      tag: "events",
      search: "heart health",
    });

  assert.equal(
    requestedUrl,
    "/api/v1/cms/blogs?page=2&page_size=10&kind=blog&category_id=category+1&tag=events&search=heart+health",
  );
  assert.equal(requestedUrl.includes("chat.wisdomtooth.tech"), false);
});
