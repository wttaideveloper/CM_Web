import assert from "node:assert/strict";
import test from "node:test";

import { isDeliveryFieldApplicable } from "./delivery-mode.ts";
import { buildEventVenue, normalizeEventVenue } from "./event-location.ts";

test("normalizes numeric-string coordinates and preserves zero for Edit hydration", () => {
  const venue = normalizeEventVenue({ name: "Main Hall", address: "1 Main Street", city: "Chennai", coordinates: { lat: "0", lng: "80.2707" } });
  assert.deepEqual(venue?.coordinates, { lat: 0, lng: 80.2707 });
});

test("preserves venue details when one coordinate is malformed", () => {
  assert.deepEqual(normalizeEventVenue({ name: "Main Hall", address: "1 Main Street", city: "Chennai", coordinates: { lat: "not-a-number", lng: "80.2707" } }), {
    name: "Main Hall",
    address: "1 Main Street",
    city: "Chennai",
    coordinates: { lng: 80.2707 },
  });
});

test("builds writable venues without coordinates", () => {
  assert.deepEqual(buildEventVenue(" Main Hall ", " 1 Main Street ", " Chennai "), {
    name: "Main Hall",
    address: "1 Main Street",
    city: "Chennai",
  });
});

test("meeting fields are applicable only to Online and Hybrid Events", () => {
  assert.equal(isDeliveryFieldApplicable("meeting_link", "in_person"), false);
  assert.equal(isDeliveryFieldApplicable("meeting_provider", "online"), true);
  assert.equal(isDeliveryFieldApplicable("meeting_provider", "hybrid"), true);
});
