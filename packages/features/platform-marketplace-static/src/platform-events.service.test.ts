import assert from "node:assert/strict";
import test from "node:test";

import { getPublishedEventDetails, getPublishedEvents, parsePublishedEventDetails } from "./platform-events.service.ts";

test("normalizes the complete Event detail payload and preserves ownership fields", () => {
  const event = parsePublishedEventDetails({
    id: "event-1",
    tenant_id: "tenant-1",
    enterprise_id: "enterprise-1",
    enterprise_name: "Acme Health",
    title: "Published Event",
    category: "Wellness",
    status: "published",
    event_type: { key: "other", name: "Other" },
    documents: ["https://cdn.example.com/legacy.pdf", { url: "https://chat.wisdomtooth.tech/api/v1/events/media/doc-1", name: "guide.pdf" }],
    sessions: [{ title: "Opening session", speaker: "A. Host" }],
    modules: { registration: true, sessions: false },
  });

  assert.equal(event.enterprise_name, "Acme Health");
  assert.equal(event.tenant_id, "tenant-1");
  assert.deepEqual(event.documents, ["https://cdn.example.com/legacy.pdf", { url: "https://chat.wisdomtooth.tech/api/v1/events/media/doc-1", name: "guide.pdf" }]);
  assert.equal(event.sessions?.[0]?.title, "Opening session");
  assert.deepEqual(event.modules, { registration: true, sessions: false });
});

test("loads modal details through the existing platform detail BFF endpoint", async () => {
  const originalFetch = globalThis.fetch;
  let requestUrl = "";
  globalThis.fetch = async (input) => {
    requestUrl = String(input);
    return new Response(JSON.stringify({ id: "event-1", title: "Published Event", category: "Wellness", status: "published" }), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  try {
    const event = await getPublishedEventDetails("event-1");
    assert.equal(requestUrl, "/api/platform-super-admin/events/event-1");
    assert.equal(event.title, "Published Event");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("forwards event or enterprise search text to the published Event collection", async () => {
  const originalFetch = globalThis.fetch;
  let requestUrl = "";
  globalThis.fetch = async (input) => {
    requestUrl = String(input);
    return new Response(JSON.stringify({ items: [], pagination: { total: 0, page: 1, page_size: 20, total_pages: 0 } }), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  try {
    await getPublishedEvents(1, "Acme Health");
    assert.equal(new URL(requestUrl, "http://localhost").searchParams.get("search"), "Acme Health");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("normalizes a nested enterprise name from the published Event list", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ items: [{ id: "event-1", enterprise_id: "enterprise-1", enterprise: { business_legal_name: "Acme Health" }, title: "Published Event", category: "Wellness", status: "published" }], pagination: { total: 1, page: 1, page_size: 20, total_pages: 1 } }), { status: 200, headers: { "Content-Type": "application/json" } });

  try {
    const response = await getPublishedEvents(1, "");
    assert.equal(response.items[0]?.enterprise_name, "Acme Health");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rejects a detail response without the required Event identity", () => {
  assert.throws(() => parsePublishedEventDetails({ title: "Missing ID", category: "Wellness", status: "published" }), /missing required fields/);
});
