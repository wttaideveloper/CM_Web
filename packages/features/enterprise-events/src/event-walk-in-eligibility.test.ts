import assert from "node:assert/strict";
import { test } from "node:test";

import { getWalkInEligibility, type WalkInEligibilityEvent } from "./event-walk-in-eligibility.ts";

const now = new Date("2026-10-12T08:00:00.000Z");
const openEvent: WalkInEligibilityEvent = {
  status: "published",
  time_zone: "Asia/Kolkata",
  registration_open: true,
  registration_open_at: "2026-10-12T12:00",
  registration_close_at: "2026-10-12T15:00",
  registration_cutoff: "2026-10-12T14:00",
  is_full: false,
  available_seats: 2,
  modules: { registration: true },
};

test("allows an open Event with available seats", () => {
  assert.equal(getWalkInEligibility(openEvent, now).allowed, true);
});

test("blocks a disabled registration module", () => {
  assert.equal(getWalkInEligibility({ ...openEvent, modules: { registration: false } }, now).reason, "registration_module_disabled");
});

test("blocks before the Event-local registration opening", () => {
  assert.equal(getWalkInEligibility(openEvent, new Date("2026-10-12T05:59:59.999Z")).reason, "registration_not_open");
});

test("uses the earliest cutoff or closing time", () => {
  assert.equal(getWalkInEligibility(openEvent, new Date("2026-10-12T08:00:00.000Z")).allowed, true);
  assert.equal(getWalkInEligibility(openEvent, new Date("2026-10-12T08:00:00.001Z")).allowed, true);
  assert.equal(getWalkInEligibility({ ...openEvent, registration_cutoff: "2026-10-12T13:00" }, new Date("2026-10-12T07:30:00.000Z")).reason, "registration_closed");
});

test("blocks explicit closed registration and passed deadlines", () => {
  assert.equal(getWalkInEligibility({ ...openEvent, registration_open: false }, now).reason, "registration_closed");
  assert.equal(getWalkInEligibility(openEvent, new Date("2026-10-12T09:00:00.000Z")).reason, "registration_closed");
});

test("blocks full and zero-seat Events", () => {
  assert.equal(getWalkInEligibility({ ...openEvent, is_full: true }, now).reason, "event_full");
  assert.equal(getWalkInEligibility({ ...openEvent, available_seats: 0 }, now).reason, "event_full");
});

test("does not silently allow unknown capacity", () => {
  assert.equal(getWalkInEligibility({ ...openEvent, is_full: null, available_seats: null }, now).reason, "capacity_unavailable");
  assert.equal(getWalkInEligibility({ ...openEvent, is_full: false, available_seats: null }, now).allowed, true);
});

test("blocks cancelled and completed Events while preserving other state", () => {
  assert.equal(getWalkInEligibility({ ...openEvent, status: "cancelled" }, now).reason, "event_cancelled");
  assert.equal(getWalkInEligibility({ ...openEvent, status: "completed" }, now).reason, "event_completed");
});

test("requires enough timing information when registration status is absent", () => {
  assert.equal(getWalkInEligibility({ ...openEvent, registration_open: undefined, registration_open_at: "" }, now).reason, "registration_timing_unavailable");
  assert.equal(getWalkInEligibility({ ...openEvent, registration_open: true, registration_close_at: "", registration_cutoff: "" }, now).reason, "registration_timing_unavailable");
});

test("keeps Event timezone semantics independent from browser timezone", () => {
  const event = { ...openEvent, time_zone: "America/New_York", registration_open_at: "2026-10-12T04:00", registration_cutoff: "2026-10-12T06:00", registration_close_at: "2026-10-12T07:00" };
  assert.equal(getWalkInEligibility(event, new Date("2026-10-12T09:30:00.000Z")).allowed, true);
  assert.equal(getWalkInEligibility(event, new Date("2026-10-12T10:00:00.000Z")).reason, "registration_closed");
});
