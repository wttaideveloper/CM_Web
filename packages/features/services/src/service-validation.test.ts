import assert from "node:assert/strict";
import test from "node:test";

import {
  buildServiceAvailabilitySchedule,
  buildServiceScheduleReviewRows,
  parseOptionalMaxParticipants,
  validateMaxParticipants,
  validateServiceSchedule,
  type ServiceScheduleDraft,
} from "./service-validation.ts";

const validWeek: ServiceScheduleDraft[] = [
  { day: "Monday", enabled: true, startTime: "09:00", endTime: "18:00", slotLength: "60" },
  { day: "Sunday", enabled: false, startTime: "", endTime: "", slotLength: "" },
];

test("validates enabled weekly schedules and ignores unavailable days", () => {
  assert.deepEqual(validateServiceSchedule(buildServiceAvailabilitySchedule(validWeek)), {
    isValid: true,
    fieldErrors: {},
  });
});

test("requires schedule values and validates time and slot formats", () => {
  const result = validateServiceSchedule([
    { day: "Monday", is_available: true, start_time: "", end_time: "25:00", slot_length: "0" },
  ]);

  assert.equal(result.isValid, false);
  assert.match(result.fieldErrors.monday, /Start time is required/);
  assert.match(result.fieldErrors.monday, /HH:MM format/);
  assert.match(result.fieldErrors.monday, /positive slot duration/);
});

test("preserves existing positive slot lengths and does not reject undocumented overnight ranges", () => {
  assert.equal(
    validateServiceSchedule([
      { day: "Monday", is_available: true, start_time: "22:00", end_time: "06:00", slot_length: "120" },
    ]).isValid,
    true,
  );
  assert.equal(
    validateServiceSchedule([
      { day: "Tuesday", is_available: true, start_time: "09:00", end_time: "18:00", slot_length: "45" },
    ]).isValid,
    true,
  );
});

test("serializes create and edit schedule state without rewriting values", () => {
  assert.deepEqual(buildServiceAvailabilitySchedule([
    { day: "Monday", enabled: true, startTime: "09:30", endTime: "18:00", slotLength: "45" },
    { day: "Tuesday", enabled: false, startTime: "09:00", endTime: "17:00", slotLength: "60" },
  ]), [
    { day: "monday", is_available: true, start_time: "09:30", end_time: "18:00", slot_length: "45" },
  ]);
});

test("builds a complete Monday-to-Sunday review schedule with enabled values", () => {
  assert.deepEqual(buildServiceScheduleReviewRows([
    { day: "Friday", enabled: true, startTime: "09:00", endTime: "18:00", slotLength: "60" },
    { day: "Monday", enabled: true, startTime: "08:30", endTime: "17:15", slotLength: "45" },
    { day: "Sunday", enabled: false, startTime: "", endTime: "", slotLength: "" },
    { day: "Tuesday", enabled: false, startTime: "09:00", endTime: "18:00", slotLength: "60" },
    { day: "Wednesday", enabled: true, startTime: "10:00", endTime: "16:00", slotLength: "30" },
    { day: "Thursday", enabled: true, startTime: "09:00", endTime: "18:00", slotLength: "60" },
    { day: "Saturday", enabled: false, startTime: "09:00", endTime: "18:00", slotLength: "60" },
  ]), [
    { day: "Monday", enabled: true, startTime: "08:30", endTime: "17:15", slotLength: "45" },
    { day: "Tuesday", enabled: false, startTime: "09:00", endTime: "18:00", slotLength: "60" },
    { day: "Wednesday", enabled: true, startTime: "10:00", endTime: "16:00", slotLength: "30" },
    { day: "Thursday", enabled: true, startTime: "09:00", endTime: "18:00", slotLength: "60" },
    { day: "Friday", enabled: true, startTime: "09:00", endTime: "18:00", slotLength: "60" },
    { day: "Saturday", enabled: false, startTime: "09:00", endTime: "18:00", slotLength: "60" },
    { day: "Sunday", enabled: false, startTime: "", endTime: "", slotLength: "" },
  ]);
});

test("keeps missing optional review values visible without changing payload serialization", () => {
  const rows = buildServiceScheduleReviewRows([
    { day: "Monday", enabled: true, startTime: "", endTime: "", slotLength: "" },
    { day: "Tuesday", enabled: false, startTime: "", endTime: "", slotLength: "" },
  ]);
  assert.deepEqual(rows[0], { day: "Monday", enabled: true, startTime: "", endTime: "", slotLength: "" });
  assert.deepEqual(rows[1], { day: "Tuesday", enabled: false, startTime: "", endTime: "", slotLength: "" });
});

test("allows blank optional capacity and rejects invalid capacities", () => {
  assert.equal(validateMaxParticipants(""), null);
  assert.equal(validateMaxParticipants("   "), null);
  assert.match(validateMaxParticipants("0") ?? "", /positive whole number/);
  assert.match(validateMaxParticipants("-2") ?? "", /positive whole number/);
  assert.match(validateMaxParticipants("2.5") ?? "", /positive whole number/);
  assert.match(validateMaxParticipants("not-a-number") ?? "", /positive whole number/);
});

test("accepts and parses a valid positive whole-number capacity", () => {
  assert.equal(validateMaxParticipants("25"), null);
  assert.equal(parseOptionalMaxParticipants("25"), 25);
  assert.equal(parseOptionalMaxParticipants(""), undefined);
  assert.equal(parseOptionalMaxParticipants("2.5"), undefined);
});
