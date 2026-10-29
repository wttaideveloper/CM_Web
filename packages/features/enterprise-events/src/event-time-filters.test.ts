import assert from "node:assert/strict";
import { test } from "node:test";

import { matchesEventTimeFilter } from "./event-time-filters.ts";

const event = {
  start_date: "2026-01-01T10:00",
  end_date: "2026-01-01T12:00",
  time_zone: "Asia/Kolkata",
};

test("ongoing includes the start boundary and excludes the end boundary", () => {
  assert.equal(matchesEventTimeFilter(event, "ongoing", new Date("2026-01-01T04:30:00.000Z")), true);
  assert.equal(matchesEventTimeFilter(event, "ongoing", new Date("2026-01-01T06:30:00.000Z")), false);
});

test("finished requires the end time to be before now", () => {
  assert.equal(matchesEventTimeFilter(event, "finished", new Date("2026-01-01T06:30:00.000Z")), false);
  assert.equal(matchesEventTimeFilter(event, "finished", new Date("2026-01-01T06:30:00.001Z")), true);
});

test("ongoing does not include an Event whose local start is still in the future", () => {
  assert.equal(matchesEventTimeFilter(event, "ongoing", new Date("2026-01-01T04:29:59.999Z")), false);
});
