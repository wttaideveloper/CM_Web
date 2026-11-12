import assert from "node:assert/strict";
import test from "node:test";
import { getExistingGroupsPreviewState, shouldCollapseExistingGroups } from "./existing-groups-preview.ts";

test("supports Training and Event associated-Group detail states", () => {
  assert.equal(getExistingGroupsPreviewState({ isPending: false, isError: false, count: 2, itemCount: 2 }), "ready");
  assert.equal(getExistingGroupsPreviewState({ isPending: false, isError: false, count: 0, itemCount: 0 }), "empty");
});

test("does not invent details when a count exists without returned items", () => {
  assert.equal(getExistingGroupsPreviewState({ isPending: false, isError: false, count: 4, itemCount: 0 }), "details-unavailable");
});

test("loading and failed associated-Group requests remain distinct", () => {
  assert.equal(getExistingGroupsPreviewState({ isPending: true, isError: false, count: null, itemCount: 0 }), "loading");
  assert.equal(getExistingGroupsPreviewState({ isPending: false, isError: true, count: 3, itemCount: 0 }), "error");
});

test("large and paginated lists start collapsed while small lists remain visible", () => {
  assert.equal(shouldCollapseExistingGroups(4), true);
  assert.equal(shouldCollapseExistingGroups(3), false);
  assert.equal(shouldCollapseExistingGroups(null), false);
});
