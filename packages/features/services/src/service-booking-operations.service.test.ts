import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import {
  buildServiceBookingSettingsUrl,
  buildServiceBookingSlotsUrl,
  createEnterpriseServiceBooking,
  serviceBookingCreationErrorMessage,
  validateServiceBookingParticipants,
  getServiceBookingSlots,
} from "./service-booking-operations.service.ts";
import { ServiceBookingApiError } from "./service-booking.service.ts";
import {
  formatServiceBookingDateHeading,
  formatServiceBookingSlotReason,
  formatServiceBookingSlotTime,
  formatServiceBookingTimezoneLabel,
  normalizeServiceBookingSettingsResponse,
  normalizeServiceBookingSlotsResponse,
} from "./service-booking-operations.models.ts";

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

function bookingDetail() {
  return {
    id: "booking-1",
    status: "pending",
    payment_status: "unpaid",
    service_id: "service-1",
    service_name: "Consultation",
    provider_id: null,
    provider_name: null,
    enterprise_id: "enterprise-1",
    enterprise_name: "Enterprise",
    delivery_mode: "in_person",
    starts_at: "2026-11-18T10:00:00+05:30",
    ends_at: "2026-11-18T10:30:00+05:30",
    timezone: "Asia/Kolkata",
    participants: 1,
    amount: 0,
    currency: null,
    can_cancel: true,
    cancel_mode: "instant",
    can_reschedule: false,
    can_join: false,
    can_check_in: false,
    customer: { user_id: null, name: "Customer", email: null, phone: null },
    created_at: "2026-11-16T08:00:00Z",
    duration_minutes: 30,
    venue: null,
    meeting: null,
    cancel_blocked_reason: null,
    join_blocked_reason: null,
    cancellation_policy_summary: "",
    cancellation_policy: null,
    hold_expires_at: null,
    cancellation: {},
    payment_id: null,
    qr_payload: null,
    notes: null,
    history: [],
    allowed_statuses: [],
    created_by_role: "enterprise_admin",
  };
}

test("serializes the exact available-slots parameters", () => {
  const url = new URL(`http://localhost${buildServiceBookingSlotsUrl("service/1", {
    date: "2026-11-18",
    providerId: "provider-1",
    deliveryMode: "virtual",
    timezone: "Asia/Kolkata",
  })}`);
  assert.equal(url.pathname, "/api/v1/services/service%2F1/available-slots");
  assert.deepEqual(Object.fromEntries(url.searchParams), {
    date: "2026-11-18",
    provider_id: "provider-1",
    delivery_mode: "virtual",
    timezone: "Asia/Kolkata",
  });
  assert.equal(buildServiceBookingSettingsUrl("service-1"), "/api/v1/services/service-1/booking-settings");
});

test("formats slot times and dates in the backend IANA timezone", () => {
  assert.equal(formatServiceBookingSlotTime("2026-11-17T14:00:00+05:30", "2026-11-17T15:00:00+05:30", "Asia/Kolkata"), "2:00 PM – 3:00 PM");
  assert.equal(formatServiceBookingSlotTime("2026-11-17T23:30:00Z", "2026-11-18T00:30:00Z", "America/New_York"), "6:30 PM – 7:30 PM");
  assert.equal(formatServiceBookingDateHeading("2026-11-17", "Asia/Kolkata"), "Tuesday, 17 November 2026");
  assert.equal(formatServiceBookingDateHeading("2026-11-18", "America/Los_Angeles"), "Wednesday, 18 November 2026");
  assert.match(formatServiceBookingTimezoneLabel("Asia/Kolkata"), /India Standard Time/);
  assert.match(formatServiceBookingTimezoneLabel("Asia/Kolkata"), /IST/);
});

test("maps confirmed slot reasons and keeps unknown codes safe", () => {
  assert.equal(formatServiceBookingSlotReason("too_soon"), "Booking cutoff passed");
  assert.equal(formatServiceBookingSlotReason("full"), "Fully booked");
  assert.equal(formatServiceBookingSlotReason("provider_unavailable"), "Provider unavailable");
  assert.equal(formatServiceBookingSlotReason("unknown_backend_code"), "This slot is currently unavailable");
  assert.equal(formatServiceBookingSlotReason(null), "Unavailable");
});

test("validates single-seat, group, full and reduced-capacity slots", () => {
  assert.deepEqual(validateServiceBookingParticipants("1", 1), { isValid: true, value: 1, error: null });
  assert.deepEqual(validateServiceBookingParticipants("3", 5), { isValid: true, value: 3, error: null });
  assert.equal(validateServiceBookingParticipants("1", 0).error, "unavailable");
  assert.equal(validateServiceBookingParticipants("3", 2).error, "capacity");
  assert.equal(validateServiceBookingParticipants("2", 1).error, "capacity");
});

test("rejects invalid participant input without coercing decimals or non-numbers", () => {
  assert.equal(validateServiceBookingParticipants("", 1).error, "required");
  assert.equal(validateServiceBookingParticipants("0", 1).error, "positive");
  assert.equal(validateServiceBookingParticipants("-1", 1).error, "integer");
  assert.equal(validateServiceBookingParticipants("1.5", 2).error, "integer");
  assert.equal(validateServiceBookingParticipants("many", 2).error, "integer");
});

test("normalizes empty slots and settings without generating defaults", () => {
  assert.deepEqual(normalizeServiceBookingSlotsResponse({
    service_id: "service-1",
    service_name: "Consultation",
    time_zone: "Asia/Kolkata",
    duration_minutes: 30,
    capacity: 4,
    delivery_modes: ["in_person"],
    provider_id: null,
    provider_name: null,
    bookable: true,
    reason: null,
    hold_minutes: 15,
    days: [{ date: "2026-11-18", slots: [] }],
  }).days, [{ date: "2026-11-18", slots: [] }]);
  assert.equal(normalizeServiceBookingSettingsResponse({
    service_id: "service-1",
    booking_enabled: true,
    requires_approval: false,
    time_zone: "Asia/Kolkata",
    delivery_modes: ["in_person", "virtual"],
    cancellation_rules: {},
    cancellation_policy: null,
    venue_instructions: null,
    meeting_url: null,
    meeting_provider: null,
    meeting_passcode: null,
    meeting_instructions: null,
    max_participants: null,
    duration_minutes: 30,
    provider_user_id: null,
    provider_name: null,
  }).duration_minutes, 30);
});

test("preserves unknown backend slot reason codes without inventing availability", () => {
  const normalized = normalizeServiceBookingSlotsResponse({
    service_id: "service-1", service_name: "Consultation", time_zone: "UTC", duration_minutes: 30, capacity: 1,
    delivery_modes: ["in_person"], provider_id: null, provider_name: null, bookable: true, reason: null, hold_minutes: 15,
    days: [{ date: "2026-11-18", slots: [{ starts_at: "2026-11-18T10:00:00Z", ends_at: "2026-11-18T10:30:00Z", starts_at_display: null, available: false, available_seats: 0, capacity: 1, reason: "new_backend_reason" }] }],
  });
  assert.equal(normalized.days[0]?.slots[0]?.reason, "new_backend_reason");
  assert.equal(normalized.days[0]?.slots[0]?.available, false);
});

test("rejects malformed slot and settings envelopes", () => {
  assert.throws(() => normalizeServiceBookingSlotsResponse({ days: [] }), /slots response is malformed/);
  assert.throws(() => normalizeServiceBookingSlotsResponse({
    service_id: "service-1", service_name: "Consultation", time_zone: "UTC", duration_minutes: 30, capacity: 1,
    delivery_modes: ["in_person"], bookable: true, hold_minutes: 15, days: [{ date: "2026-11-18", slots: [{ starts_at: "bad" }] }],
  }), /malformed slot/);
  assert.throws(() => normalizeServiceBookingSettingsResponse({
    service_id: "service-1", booking_enabled: true, requires_approval: false, time_zone: "UTC", delivery_modes: ["invalid"], cancellation_rules: {}, duration_minutes: 30,
  }), /settings response is malformed/);
});

test("loads slots with backend timezone and normalizes the response", async () => {
  let requestedUrl = "";
  let requestedSignal: AbortSignal | null | undefined;
  globalThis.fetch = (async (input, init) => {
    requestedUrl = String(input);
    requestedSignal = init?.signal;
    return jsonResponse({
      service_id: "service-1", service_name: "Consultation", time_zone: "Asia/Kolkata", duration_minutes: 30, capacity: 1,
      delivery_modes: ["in_person"], provider_id: null, provider_name: null, bookable: true, reason: null, hold_minutes: 15,
      days: [{ date: "2026-11-18", slots: [{ starts_at: "2026-11-18T10:00:00+05:30", ends_at: "2026-11-18T10:30:00+05:30", available: true, available_seats: 1, capacity: 1, reason: null }] }],
    });
  }) as typeof fetch;
  const controller = new AbortController();
  const result = await getServiceBookingSlots("service-1", { date: "2026-11-18", timezone: "Asia/Kolkata" }, controller.signal);
  assert.equal(result.time_zone, "Asia/Kolkata");
  assert.match(requestedUrl, /available-slots\?date=2026-11-18&timezone=Asia%2FKolkata/);
  assert.equal(requestedSignal, controller.signal);
});

test("creates a free manual booking with the idempotency key and no payment simulation", async () => {
  let requestedUrl = "";
  let requestInit: RequestInit | undefined;
  globalThis.fetch = (async (input, init) => {
    requestedUrl = String(input);
    requestInit = init;
    return jsonResponse(bookingDetail(), 201);
  }) as typeof fetch;
  const result = await createEnterpriseServiceBooking({
    service_id: "service-1",
    starts_at: "2026-11-18T10:00:00+05:30",
    delivery_mode: "in_person",
    participants: 1,
    customer_name: "Customer",
  }, "idempotency-1");
  assert.equal(result.id, "booking-1");
  assert.equal(requestedUrl, "/api/v1/service-bookings");
  assert.equal(requestInit?.method, "POST");
  assert.equal(requestInit?.credentials, "include");
  assert.equal(new Headers(requestInit?.headers).get("Idempotency-Key"), "idempotency-1");
  assert.deepEqual(JSON.parse(String(requestInit?.body)), {
    service_id: "service-1",
    starts_at: "2026-11-18T10:00:00+05:30",
    delivery_mode: "in_person",
    participants: 1,
    customer_name: "Customer",
  });
  assert.equal(JSON.stringify(requestInit?.body).includes('"paid"'), false);
});

test("distinguishes a Next route 404 from a backend 404", async () => {
  const nextRouteResponse = new Response("<html><body>This page could not be found</body></html>", {
    status: 404,
    headers: { "content-type": "text/html" },
  });
  const nextError = await (await import("./service-booking.service.ts")).readServiceBookingApiError(nextRouteResponse);
  assert.equal(nextError.source, "next");
  assert.equal(nextError.code, "NEXT_ROUTE_NOT_FOUND");

  const backendResponse = jsonResponse({ detail: "Booking not found" }, 404);
  const backendError = await (await import("./service-booking.service.ts")).readServiceBookingApiError(backendResponse);
  assert.equal(backendError.source, "backend");
  assert.equal(backendError.message, "Booking not found");
});

test("keeps backend validation, authorization and capacity messages distinct", () => {
  assert.match(serviceBookingCreationErrorMessage(new ServiceBookingApiError("validation", 422)), /validation/);
  assert.match(serviceBookingCreationErrorMessage(new ServiceBookingApiError("forbidden", 403)), /not authorized/);
  assert.match(serviceBookingCreationErrorMessage(new ServiceBookingApiError("full", 409, "SLOT_FULL")), /full/);
  assert.match(serviceBookingCreationErrorMessage(new Error("unknown")), /could not be created/);
});

test("does not retry or hide booking API errors", async () => {
  let calls = 0;
  globalThis.fetch = (async () => { calls += 1; return jsonResponse({ detail: { code: "SLOT_FULL" } }, 409); }) as typeof fetch;
  await assert.rejects(() => createEnterpriseServiceBooking({ service_id: "service-1", starts_at: "2026-11-18T10:00:00Z", customer_name: "Customer" }, "idempotency-1"), /Unable to load Service Bookings/);
  assert.equal(calls, 1);
});
