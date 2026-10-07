import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createDefaultSessionGenerationRules,
  updateSessionGenerationRule,
  updateSessionGenerationRuleDuration,
} from "./session-generation-rules.ts";

test("session generation preserves built-in and custom duration selections", () => {
  const defaults = createDefaultSessionGenerationRules();
  const builtIn = updateSessionGenerationRule(defaults, 1, "30");
  assert.deepEqual(builtIn[0], { id: 1, duration: 30, count: 1, custom: false });

  const custom = updateSessionGenerationRule(builtIn, 1, "custom");
  assert.deepEqual(custom[0], { id: 1, duration: 30, count: 1, custom: true });

  const customValue = updateSessionGenerationRuleDuration(custom, 1, "75");
  assert.deepEqual(customValue[0], { id: 1, duration: 75, count: 1, custom: true });
  assert.deepEqual(builtIn[0], { id: 1, duration: 30, count: 1, custom: false });
});
