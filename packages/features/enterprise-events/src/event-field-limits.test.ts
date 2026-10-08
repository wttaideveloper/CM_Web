import assert from "node:assert/strict";
import { test } from "node:test";

import { ACCOMMODATION_OPTION_DESCRIPTION_MAX_LENGTH, ACCOMMODATION_OPTION_NAME_MAX_LENGTH, EVENT_DESCRIPTION_MAX_LENGTH, eventFieldMaxLength, eventServiceOptionLengthError, eventServiceOptionMaxLength, MEAL_OPTION_DESCRIPTION_MAX_LENGTH, MEAL_OPTION_NAME_MAX_LENGTH } from "./event-field-limits.ts";

test("keeps backend-confirmed Event limits stricter than optional form configuration", () => {
  assert.equal(EVENT_DESCRIPTION_MAX_LENGTH, 300);
  assert.equal(MEAL_OPTION_NAME_MAX_LENGTH, 100);
  assert.equal(MEAL_OPTION_DESCRIPTION_MAX_LENGTH, 300);
  assert.equal(ACCOMMODATION_OPTION_NAME_MAX_LENGTH, 100);
  assert.equal(ACCOMMODATION_OPTION_DESCRIPTION_MAX_LENGTH, 300);
  assert.equal(eventServiceOptionMaxLength("meals", "name"), 100);
  assert.equal(eventServiceOptionMaxLength("meals", "description"), 300);
  assert.equal(eventServiceOptionMaxLength("accommodation", "name"), 100);
  assert.equal(eventServiceOptionMaxLength("accommodation", "description"), 300);
  assert.match(eventServiceOptionLengthError("meals", "name", "x".repeat(101)) ?? "", /100/);
  assert.match(eventServiceOptionLengthError("meals", "description", "x".repeat(301)) ?? "", /300/);
  assert.match(eventServiceOptionLengthError("accommodation", "name", "x".repeat(101)) ?? "", /100/);
  assert.match(eventServiceOptionLengthError("accommodation", "description", "x".repeat(301)) ?? "", /300/);
  assert.equal(eventServiceOptionLengthError("meals", "name", "x".repeat(100)), undefined);
  assert.equal(eventServiceOptionLengthError("meals", "description", "x".repeat(300)), undefined);
  assert.equal(eventServiceOptionLengthError("accommodation", "name", "x".repeat(100)), undefined);
  assert.equal(eventServiceOptionLengthError("accommodation", "description", "x".repeat(300)), undefined);
  assert.equal(eventFieldMaxLength("description", 500), 300);
  assert.equal(eventFieldMaxLength("description", 100), 100);
  assert.equal(eventFieldMaxLength("title", 120), 120);
});
