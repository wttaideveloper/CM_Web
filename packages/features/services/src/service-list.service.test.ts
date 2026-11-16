import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import {
  buildServiceListUrl,
  getServices,
  getServicesPage,
  normalizePaginatedServiceList,
} from "./services/service.service.ts";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Bad Request",
    json: async () => body,
  } as Response;
}

function service(id: string) {
  return {
    id,
    enterprise_id: "enterprise-1",
    service_name: `Service ${id}`,
    service_description: "",
    service_category: "Coaching",
    service_price: 10,
    duration: 30,
    availability_status: true,
    service_status: true,
  };
}

test("serializes all documented Service list query parameters", () => {
  const url = new URL(`http://localhost${buildServiceListUrl({
    search: " yoga & wellness ",
    tenant_id: "tenant-1",
    enterprise_id: "enterprise-1",
    category: "Coaching",
    location_id: "location-1",
    status: "active",
    page: 3,
    page_size: 20,
  })}`);

  assert.deepEqual(Object.fromEntries(url.searchParams), {
    search: "yoga & wellness",
    tenant_id: "tenant-1",
    enterprise_id: "enterprise-1",
    category: "Coaching",
    location_id: "location-1",
    status: "active",
    page: "3",
    page_size: "20",
  });
});

test("serializes search and filter changes with enterprise scope on page one", () => {
  const url = new URL(`http://localhost${buildServiceListUrl({
    search: "consult",
    enterprise_id: "enterprise-1",
    category: "Coaching",
    status: "active",
    page: 1,
    page_size: 20,
  })}`);

  assert.equal(url.searchParams.get("enterprise_id"), "enterprise-1");
  assert.equal(url.searchParams.get("search"), "consult");
  assert.equal(url.searchParams.get("category"), "Coaching");
  assert.equal(url.searchParams.get("status"), "active");
  assert.equal(url.searchParams.get("page"), "1");
});

test("normalizes exact pagination metadata and valid empty pages", () => {
  assert.deepEqual(
    normalizePaginatedServiceList({
      items: [],
      pagination: { total: 0, page: 1, page_size: 20, total_pages: 0 },
    }),
    { items: [], pagination: { total: 0, page: 1, page_size: 20, total_pages: 0 } },
  );
});

test("rejects malformed list envelopes instead of inventing pagination", () => {
  assert.throws(
    () => normalizePaginatedServiceList({ items: [service("1")] }),
    /services response is malformed/,
  );
  assert.throws(
    () => normalizePaginatedServiceList({
      items: [service("1")],
      pagination: { total: 1, page: 0, page_size: 20, total_pages: 1 },
    }),
    /pagination metadata is malformed/,
  );
});

test("preserves legacy getServices array compatibility", async () => {
  globalThis.fetch = async () => jsonResponse({ items: [service("legacy")] });

  assert.deepEqual(await getServices(), [service("legacy")]);
});

test("reports backend request failures", async () => {
  globalThis.fetch = async () => jsonResponse({ detail: "failure" }, 503);

  await assert.rejects(() => getServicesPage({ page: 1, page_size: 20 }), /503/);
});

test("keeps out-of-order page requests independent", async () => {
  let resolveFirst: ((response: Response) => void) | undefined;
  let resolveSecond: ((response: Response) => void) | undefined;

  globalThis.fetch = ((input: RequestInfo | URL) => {
    const target = String(input);
    return new Promise<Response>((resolve) => {
      if (target.includes("page=1")) {
        resolveFirst = resolve;
      } else {
        resolveSecond = resolve;
      }
    });
  }) as typeof fetch;

  const firstRequest = getServicesPage({ page: 1, page_size: 20 });
  const secondRequest = getServicesPage({ page: 2, page_size: 20 });

  resolveSecond?.(jsonResponse({ items: [service("second")], pagination: { total: 2, page: 2, page_size: 20, total_pages: 2 } }));
  resolveFirst?.(jsonResponse({ items: [service("first")], pagination: { total: 2, page: 1, page_size: 20, total_pages: 2 } }));

  assert.equal((await secondRequest).items[0]?.id, "second");
  assert.equal((await firstRequest).items[0]?.id, "first");
});
