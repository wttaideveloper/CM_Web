import assert from "node:assert/strict";
import test from "node:test";
import { getGroupChatScrollTopAfterPrepend, isGroupChatNearBottom, shouldFollowGroupChatLatest, shouldScrollGroupChatToLatestOnEntry } from "./group-chat-scroll.ts";

test("recognizes a scroll position near the latest message", () => {
  assert.equal(isGroupChatNearBottom({ scrollHeight: 1000, scrollTop: 704, clientHeight: 200 }), true);
  assert.equal(isGroupChatNearBottom({ scrollHeight: 1000, scrollTop: 600, clientHeight: 200 }), false);
});

test("follows an incoming latest message only when the user is near the bottom", () => {
  assert.equal(shouldFollowGroupChatLatest({ initial: false, newestMessageChanged: true, userWasNearBottom: true, explicitLatestRequest: false }), true);
  assert.equal(shouldFollowGroupChatLatest({ initial: false, newestMessageChanged: true, userWasNearBottom: false, explicitLatestRequest: false }), false);
  assert.equal(shouldFollowGroupChatLatest({ initial: true, newestMessageChanged: false, userWasNearBottom: false, explicitLatestRequest: false }), true);
  assert.equal(shouldFollowGroupChatLatest({ initial: false, newestMessageChanged: false, userWasNearBottom: false, explicitLatestRequest: true }), true);
});

test("preserves the viewport anchor when older messages are prepended", () => {
  assert.equal(getGroupChatScrollTopAfterPrepend(1000, 120, 1500), 620);
});

test("requests latest positioning only for an explicit conversation re-entry", () => {
  assert.equal(shouldScrollGroupChatToLatestOnEntry(true, true), true);
  assert.equal(shouldScrollGroupChatToLatestOnEntry(true, false), false);
  assert.equal(shouldScrollGroupChatToLatestOnEntry(false, true), false);
});
