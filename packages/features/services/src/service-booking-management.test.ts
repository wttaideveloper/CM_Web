import assert from "node:assert/strict";
import test from "node:test";

import {
  getServiceBookingEmptyState,
  getServiceBookingPageLabel,
  getServiceBookingPageSummary,
  getServiceBookingStatusLabel,
  getServiceBookingAllowedNextStatuses,
  isServiceBookingCancellationApprovalAllowed,
  isServiceBookingCancellationEligible,
  formatServiceBookingEnum,
  formatServiceBookingAppointment,
  serviceBookingColumnKeys,
  serviceBookingStatusFilters,
} from "./service-booking-management.ts";

test("exposes the supported booking filters and table columns without data", () => {
  assert.deepEqual(serviceBookingStatusFilters, ["all", "upcoming", "completed", "cancelled"]);
  assert.deepEqual(serviceBookingColumnKeys, [
    "reference",
    "customer",
    "service",
    "provider",
    "dateTime",
    "deliveryMode",
    "bookingStatus",
    "paymentStatus",
    "details",
  ]);
  assert.equal(getServiceBookingStatusLabel("upcoming"), "Upcoming");
});

test("uses only backend-provided allowed statuses and removes the current status", () => {
  assert.deepEqual(getServiceBookingAllowedNextStatuses("confirmed", ["confirmed", "completed", "completed", "cancelled"]), ["completed", "cancelled"]);
  assert.deepEqual(getServiceBookingAllowedNextStatuses("confirmed", null), []);
});

test("allows decisions only for pending cancellation requests and blocks paid approval", () => {
  assert.equal(isServiceBookingCancellationEligible("pending", "cancellation_requested"), true);
  assert.equal(isServiceBookingCancellationEligible("approved", "cancellation_requested"), false);
  assert.equal(isServiceBookingCancellationEligible("pending", "confirmed"), false);
  assert.equal(isServiceBookingCancellationApprovalAllowed("not_required"), true);
  assert.equal(isServiceBookingCancellationApprovalAllowed("unpaid"), true);
  assert.equal(isServiceBookingCancellationApprovalAllowed("paid"), false);
  assert.equal(isServiceBookingCancellationApprovalAllowed("partially_refunded"), false);
});

test("returns a backend-blocked empty state without inventing records", () => {
  assert.deepEqual(getServiceBookingEmptyState(), {
    title: "No booking records available",
    description: "No Service Bookings were returned for this enterprise.",
  });
});

test("keeps pagination labels safe without fabricating totals", () => {
  assert.equal(getServiceBookingPageLabel(1), "Page 1");
  assert.equal(getServiceBookingPageLabel(0), "Page 1");
  assert.equal(getServiceBookingPageLabel(2.5), "Page 1");
  assert.equal(getServiceBookingPageSummary(2, 21, 10), "Page 2 of 3");
  assert.equal(formatServiceBookingEnum("cancellation_requested"), "Cancellation Requested");
});

test("formats appointment date, time range and backend timezone", () => {
  const formatted = formatServiceBookingAppointment(
    "2026-11-17T09:00:00+05:30",
    "2026-11-17T10:00:00+05:30",
    "Asia/Kolkata",
  );
  assert.match(formatted, /Nov 17, 2026/);
  assert.match(formatted, /9:00 AM/);
  assert.match(formatted, /10:00 AM/);
  assert.match(formatted, /Asia\/Kolkata/);
});
