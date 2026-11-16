import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import {
  buildServiceBookingDetailUrl,
  buildServiceBookingHistoryUrl,
  buildEnterpriseServiceBookingsUrl,
  getEnterpriseServiceBookings,
  getServiceBookingDetail,
  getServiceBookingHistory,
  normalizeServiceBookingDetailResponse,
  normalizeServiceBookingHistoryResponse,
  normalizeServiceBookingListResponse,
} from "./service-booking.service.ts";

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

function booking(id: string) {
  return {
    id,
    status: "confirmed",
    payment_status: "paid",
    service_id: "service-1",
    service_name: "Wellness consultation",
    provider_id: "provider-1",
    provider_name: "Assigned Provider",
    enterprise_id: "enterprise-1",
    enterprise_name: "Example Enterprise",
    delivery_mode: "in_person",
    starts_at: "2026-11-18T10:00:00+05:30",
    ends_at: "2026-11-18T10:30:00+05:30",
    timezone: "Asia/Kolkata",
    participants: 1,
    amount: 50,
    currency: "USD",
    can_cancel: true,
    cancel_mode: "instant",
    can_reschedule: false,
    can_join: false,
    can_check_in: false,
    customer: {
      user_id: "customer-1",
      name: "Customer One",
      email: "customer@example.test",
      phone: null,
    },
    created_at: "2026-11-16T08:00:00Z",
  };
}

function bookingDetail(id = "booking-1") {
  return {
    ...booking(id),
    duration_minutes: 30,
    venue: {
      name: "Example Clinic",
      line1: "1 Main Street",
      city: "Bengaluru",
      instructions: "Use the east entrance.",
    },
    meeting: null,
    cancel_blocked_reason: null,
    join_blocked_reason: null,
    cancellation_policy_summary: "Free cancellation up to 24 hours before the appointment.",
    cancellation_policy: "Standard policy",
    hold_expires_at: null,
    cancellation: {},
    payment_id: null,
    qr_payload: null,
    notes: "Arrive ten minutes early.",
    history: [
      {
        action: "created",
        from_status: null,
        to_status: "pending",
        actor_role: "customer",
        actor_name: null,
        reason: null,
        at: "2026-11-16T08:00:00Z",
      },
    ],
    allowed_statuses: ["in_progress", "completed", "cancelled"],
    created_by_role: "customer",
  };
}

test("serializes the documented enterprise booking filters and scope", () => {
  const url = new URL(`http://localhost${buildEnterpriseServiceBookingsUrl({
    enterpriseId: "enterprise/1",
    search: "customer & service",
    statusFilter: "completed",
    page: 3,
    pageSize: 25,
  })}`);

  assert.equal(url.pathname, "/api/v1/enterprises/enterprise%2F1/service-bookings");
  assert.deepEqual(Object.fromEntries(url.searchParams), {
    q: "customer & service",
    status: "completed",
    page: "3",
    page_size: "25",
  });
});

test("maps the upcoming filter to the documented when parameter", () => {
  const url = new URL(`http://localhost${buildEnterpriseServiceBookingsUrl({
    enterpriseId: "enterprise-1",
    statusFilter: "upcoming",
    page: 1,
  })}`);

  assert.equal(url.searchParams.get("when"), "upcoming");
  assert.equal(url.searchParams.has("status"), false);
});

test("does not add backend filters for All", () => {
  const url = new URL(`http://localhost${buildEnterpriseServiceBookingsUrl({
    enterpriseId: "enterprise-1",
    statusFilter: "all",
    page: 1,
  })}`);

  assert.equal(url.searchParams.has("q"), false);
  assert.equal(url.searchParams.has("status"), false);
  assert.equal(url.searchParams.has("when"), false);
});

test("normalizes booking records and preserves pagination metadata", () => {
  assert.deepEqual(
    normalizeServiceBookingListResponse({
      items: [booking("booking-1")],
      total: 21,
      page: 2,
      page_size: 10,
    }),
    {
      items: [booking("booking-1")],
      total: 21,
      page: 2,
      page_size: 10,
    },
  );
});

test("accepts a valid empty page without fabricating records", () => {
  assert.deepEqual(
    normalizeServiceBookingListResponse({ items: [], total: 0, page: 1, page_size: 10 }),
    { items: [], total: 0, page: 1, page_size: 10 },
  );
});

test("rejects malformed envelopes and booking items", () => {
  assert.throws(
    () => normalizeServiceBookingListResponse({ items: [], total: 0, page: 0, page_size: 10 }),
    /pagination metadata is malformed/,
  );
  assert.throws(
    () => normalizeServiceBookingListResponse({ items: [{ id: "missing-fields" }], total: 1, page: 1, page_size: 10 }),
    /malformed item/,
  );
});

test("passes the enterprise-scoped GET and AbortSignal to the authenticated fetcher", async () => {
  let requestedUrl = "";
  let requestedSignal: AbortSignal | null | undefined;
  globalThis.fetch = (async (input, init) => {
    requestedUrl = String(input);
    requestedSignal = init?.signal;
    return jsonResponse({ items: [], total: 0, page: 1, page_size: 10 });
  }) as typeof fetch;

  const controller = new AbortController();
  await getEnterpriseServiceBookings({
    enterpriseId: "enterprise-1",
    statusFilter: "all",
    page: 1,
  }, controller.signal);

  assert.match(requestedUrl, /\/api\/v1\/enterprises\/enterprise-1\/service-bookings\?/);
  assert.equal(requestedSignal, controller.signal);
});

test("reports backend failures without changing the request scope", async () => {
  let requestedUrl = "";
  globalThis.fetch = (async (input) => {
    requestedUrl = String(input);
    return jsonResponse({ detail: "Forbidden" }, 403);
  }) as typeof fetch;

  await assert.rejects(
    () => getEnterpriseServiceBookings({ enterpriseId: "enterprise-1", statusFilter: "all", page: 1 }),
    (error: unknown) => error instanceof Error && /Forbidden/.test(error.message),
  );
  assert.match(requestedUrl, /\/api\/v1\/enterprises\/enterprise-1\/service-bookings/);
});

test("keeps out-of-order page responses independent", async () => {
  let resolveFirst: ((response: Response) => void) | undefined;
  let resolveSecond: ((response: Response) => void) | undefined;

  globalThis.fetch = ((input: RequestInfo | URL) => {
    const target = String(input);
    return new Promise<Response>((resolve) => {
      if (target.includes("page=1")) resolveFirst = resolve;
      else resolveSecond = resolve;
    });
  }) as typeof fetch;

  const firstRequest = getEnterpriseServiceBookings({ enterpriseId: "enterprise-1", statusFilter: "all", page: 1 });
  const secondRequest = getEnterpriseServiceBookings({ enterpriseId: "enterprise-1", statusFilter: "all", page: 2 });

  resolveSecond?.(jsonResponse({ items: [booking("second")], total: 2, page: 2, page_size: 1 }));
  resolveFirst?.(jsonResponse({ items: [booking("first")], total: 2, page: 1, page_size: 1 }));

  assert.equal((await secondRequest).items[0]?.id, "second");
  assert.equal((await firstRequest).items[0]?.id, "first");
});

test("builds encoded detail and history paths", () => {
  assert.equal(buildServiceBookingDetailUrl("booking/1"), "/api/v1/service-bookings/booking%2F1");
  assert.equal(buildServiceBookingHistoryUrl("booking/1"), "/api/v1/service-bookings/booking%2F1/history");
});

test("normalizes detail fields, optional delivery information and embedded history", () => {
  assert.deepEqual(normalizeServiceBookingDetailResponse(bookingDetail()), bookingDetail());
  assert.deepEqual(
    normalizeServiceBookingDetailResponse({ ...bookingDetail(), meeting: { provider: "Zoom", url: "https://meeting.test" }, venue: null }).meeting,
    { provider: "Zoom", url: "https://meeting.test" },
  );
});

test("normalizes empty and malformed history responses", () => {
  assert.deepEqual(normalizeServiceBookingHistoryResponse([]), []);
  assert.deepEqual(
    normalizeServiceBookingHistoryResponse([{ action: "completed" }]),
    [{ action: "completed", from_status: null, to_status: null, actor_role: null, actor_name: null, reason: null, at: null }],
  );
  assert.throws(() => normalizeServiceBookingHistoryResponse({ items: [] }), /history response is malformed/);
  assert.throws(() => normalizeServiceBookingHistoryResponse([{ from_status: "pending" }]), /history contains a malformed item/);
});

test("rejects malformed detail responses without inventing nested data", () => {
  assert.throws(
    () => normalizeServiceBookingDetailResponse({ ...bookingDetail(), duration_minutes: "30" }),
    /detail response is malformed/,
  );
  assert.throws(
    () => normalizeServiceBookingDetailResponse({ ...bookingDetail(), meeting: "not-an-object" }),
    /field meeting is malformed/,
  );
});

test("loads detail and history with the same authenticated GET pattern", async () => {
  const requestedUrls: string[] = [];
  globalThis.fetch = (async (input) => {
    const url = String(input);
    requestedUrls.push(url);
    return url.endsWith("/history")
      ? jsonResponse([{ action: "confirmed", to_status: "confirmed", at: "2026-11-16T09:00:00Z" }])
      : jsonResponse(bookingDetail());
  }) as typeof fetch;

  const [detail, history] = await Promise.all([
    getServiceBookingDetail("booking-1"),
    getServiceBookingHistory("booking-1"),
  ]);

  assert.equal(detail.id, "booking-1");
  assert.equal(history[0]?.action, "confirmed");
  assert.deepEqual(requestedUrls, [
    "/api/v1/service-bookings/booking-1",
    "/api/v1/service-bookings/booking-1/history",
  ]);
});

test("propagates missing-booking authorization errors from detail reads", async () => {
  globalThis.fetch = (async () => jsonResponse({ detail: "Not found" }, 404)) as typeof fetch;

  await assert.rejects(
    () => getServiceBookingDetail("missing-booking"),
    (error: unknown) => error instanceof Error && /Not found/.test(error.message),
  );
});
