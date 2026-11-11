import { strict as assert } from "node:assert";
import test from "node:test";

import { getEventCoreFieldSemantic, isEventCoreFieldAvailable } from "./event-core-field-semantics.ts";

test("duration_type is not available from the Event core-field picker", () => {
  assert.equal(isEventCoreFieldAvailable("duration_type"), false);
  assert.equal(isEventCoreFieldAvailable("core_duration_type"), false);
  assert.equal(getEventCoreFieldSemantic("duration_type"), undefined);
});

test("active Event core fields remain available", () => {
  assert.equal(isEventCoreFieldAvailable("delivery_mode"), true);
  assert.equal(isEventCoreFieldAvailable("time_zone"), true);
  assert.equal(getEventCoreFieldSemantic("delivery_mode")?.optionsSource, "domain_owned");
});

test("Event category and subcategory are taxonomy-owned choices", () => {
  assert.equal(getEventCoreFieldSemantic("category")?.optionsSource, "event_categories");
  assert.equal(getEventCoreFieldSemantic("subcategory")?.optionsSource, "event_categories");
  assert.equal(getEventCoreFieldSemantic("category")?.displayRenderer, "taxonomy_select");
  assert.equal(getEventCoreFieldSemantic("subcategory")?.displayRenderer, "taxonomy_select");
});
