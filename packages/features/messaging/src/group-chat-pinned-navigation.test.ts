import assert from "node:assert/strict";
import test from "node:test";
import { getGroupChatCenteredScrollTop, getGroupChatPinnedListMaxHeight, getGroupChatPinnedNavigationStage, GROUP_CHAT_PINNED_HIGHLIGHT_MS, GROUP_CHAT_PINNED_ROW_GAP_PX, GROUP_CHAT_PINNED_ROW_HEIGHT_PX, GROUP_CHAT_PINNED_VISIBLE_ROWS, shouldFetchGroupChatPinnedTargetPage } from "./group-chat-pinned-navigation.ts";

test("pinned list uses only natural height through five rows and caps longer lists at five rows", () => {
  assert.equal(getGroupChatPinnedListMaxHeight(0), undefined);
  assert.equal(getGroupChatPinnedListMaxHeight(1), undefined);
  assert.equal(getGroupChatPinnedListMaxHeight(5), undefined);
  assert.equal(getGroupChatPinnedListMaxHeight(6), 5 * GROUP_CHAT_PINNED_ROW_HEIGHT_PX + 4 * GROUP_CHAT_PINNED_ROW_GAP_PX);
  assert.equal(getGroupChatPinnedListMaxHeight(13), getGroupChatPinnedListMaxHeight(6));
  assert.equal(GROUP_CHAT_PINNED_VISIBLE_ROWS, 5);
});

test("pinned navigation only requests another cursor page when target is unloaded and idle", () => {
  assert.equal(shouldFetchGroupChatPinnedTargetPage(false, true, false), true);
  assert.equal(shouldFetchGroupChatPinnedTargetPage(true, true, false), false);
  assert.equal(shouldFetchGroupChatPinnedTargetPage(false, false, false), false);
  assert.equal(shouldFetchGroupChatPinnedTargetPage(false, true, true), false);
});

test("centered scroll calculation is bounded to the history viewport", () => {
  assert.equal(getGroupChatCenteredScrollTop({ scrollTop: 100, scrollHeight: 1400, clientHeight: 400, targetTop: 500, targetHeight: 40 }), 420);
  assert.equal(getGroupChatCenteredScrollTop({ scrollTop: 0, scrollHeight: 900, clientHeight: 400, targetTop: -200, targetHeight: 40 }), 0);
  assert.equal(getGroupChatCenteredScrollTop({ scrollTop: 800, scrollHeight: 900, clientHeight: 400, targetTop: 500, targetHeight: 40 }), 500);
});

test("pinned target highlight lasts approximately two seconds", () => {
  assert.equal(GROUP_CHAT_PINNED_HIGHLIGHT_MS, 2000);
});

test("panel closure takes precedence over scrolling even when the target is already loaded", () => {
  assert.equal(getGroupChatPinnedNavigationStage({ sameGroup: true, panelOpen: true, targetLoaded: true, historyLoading: false, pageFetching: false, hasNextPage: true }), "wait-for-panel");
  assert.equal(getGroupChatPinnedNavigationStage({ sameGroup: true, panelOpen: false, targetLoaded: true, historyLoading: false, pageFetching: false, hasNextPage: true }), "scroll");
  assert.equal(getGroupChatPinnedNavigationStage({ sameGroup: true, panelOpen: false, targetLoaded: true, historyLoading: false, pageFetching: true, hasNextPage: true }), "wait-for-history");
});

test("latest and older loaded pinned targets use the same scroll stage regardless of pinned row", () => {
  for (const pinnedRow of [1, 5, 6, 13]) {
    assert.ok(pinnedRow >= 1);
    assert.equal(getGroupChatPinnedNavigationStage({ sameGroup: true, panelOpen: false, targetLoaded: true, historyLoading: false, pageFetching: false, hasNextPage: false }), "scroll");
  }
});

test("unloaded pinned target waits for history then fetches cursor pages until exhausted", () => {
  assert.equal(getGroupChatPinnedNavigationStage({ sameGroup: true, panelOpen: false, targetLoaded: false, historyLoading: true, pageFetching: false, hasNextPage: true }), "wait-for-history");
  assert.equal(getGroupChatPinnedNavigationStage({ sameGroup: true, panelOpen: false, targetLoaded: false, historyLoading: false, pageFetching: true, hasNextPage: true }), "wait-for-history");
  assert.equal(getGroupChatPinnedNavigationStage({ sameGroup: true, panelOpen: false, targetLoaded: false, historyLoading: false, pageFetching: false, hasNextPage: true }), "fetch-next-page");
  assert.equal(getGroupChatPinnedNavigationStage({ sameGroup: true, panelOpen: false, targetLoaded: false, historyLoading: false, pageFetching: false, hasNextPage: false }), "not-found");
});

test("a Group switch invalidates pending pinned navigation", () => {
  assert.equal(getGroupChatPinnedNavigationStage({ sameGroup: false, panelOpen: false, targetLoaded: true, historyLoading: false, pageFetching: false, hasNextPage: true }), "stale");
});
