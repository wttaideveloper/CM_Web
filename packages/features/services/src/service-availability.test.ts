import assert from "node:assert/strict";
import test from "node:test";

import {
  formatServiceAvailabilityDate,
  normalizeServiceDetailResponse,
  normalizeServiceGeneratedAvailability,
} from "./service.models.ts";

test("normalizes valid generated availability and preserves slots", () => {
  assert.deepEqual(
    normalizeServiceGeneratedAvailability([
      { day: "Monday", date: "2026-06-22", slots: ["09:00-10:00", "10:00-11:00"] },
    ]),
    [{ day: "Monday", date: "2026-06-22", slots: ["09:00-10:00", "10:00-11:00"] }],
  );
});

test("missing or empty generated availability is safe", () => {
  assert.deepEqual(normalizeServiceGeneratedAvailability(undefined), []);
  assert.deepEqual(normalizeServiceGeneratedAvailability([]), []);
  assert.deepEqual(
    normalizeServiceGeneratedAvailability([{ day: "Tuesday", date: "2026-06-23", slots: [] }]),
    [{ day: "Tuesday", date: "2026-06-23", slots: [] }],
  );
});

test("malformed optional entries are omitted without affecting valid entries", () => {
  assert.deepEqual(
    normalizeServiceGeneratedAvailability([
      null,
      { date: "2026-06-22", slots: ["09:00-10:00"] },
      { day: "Tuesday", date: "not-a-date", slots: ["10:00-11:00"] },
      { day: "Wednesday", date: "2026-06-24", slots: ["11:00-12:00", null, 42] },
    ]),
    [{ day: "Wednesday", date: "2026-06-24", slots: ["11:00-12:00"] }],
  );
});

test("normalizes generated availability while preserving configured weekly schedule", () => {
  const configuredSchedule = [
    { day: "monday", is_available: true, start_time: "09:00", end_time: "18:00", slot_length: "60" },
  ];

  const normalized = normalizeServiceDetailResponse({
    availability_schedule: configuredSchedule,
    availability: [{ day: "Monday", date: "2026-06-22", slots: ["09:00-10:00"] }],
    service_name: "Wellness consultation",
  });

  assert.deepEqual(normalized.availability_schedule, configuredSchedule);
  assert.deepEqual(normalized.availability, [{ day: "Monday", date: "2026-06-22", slots: ["09:00-10:00"] }]);
});

test("formats date-only availability without a timezone shift", () => {
  assert.equal(formatServiceAvailabilityDate("2026-06-22", "en-US"), "Jun 22, 2026");
  assert.equal(formatServiceAvailabilityDate("2026-02-30", "en-US"), null);
});
