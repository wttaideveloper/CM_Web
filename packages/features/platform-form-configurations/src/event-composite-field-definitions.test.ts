import assert from "node:assert/strict";
import test from "node:test";

import { getEventCompositeFieldDefinition } from "./model/event-composite-field-definitions.ts";

test("venue configuration exposes only name, address, and city", () => {
  assert.deepEqual(getEventCompositeFieldDefinition("venue")?.subfields.map((field) => field.key), ["name", "address", "city"]);
});
