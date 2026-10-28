import assert from "node:assert/strict";
import test from "node:test";
import { groupChatReadRefreshQueryKeys, groupChatReadStateQueryKeys, groupChatReadStatusQueryKey, mergeGroupChatReadStatusCache, reconcileGroupChatReadState, resolveGroupChatReadThroughBoundary, shouldForceGroupChatReadStatusRefresh, shouldProcessGroupChatReadEvent, shouldQueueGroupChatReadStatuses, shouldReconcileGroupChatReadAfterReconnect } from "./group-chat-read-state.ts";

const groupId = "11111111-1111-4111-8111-111111111111";

const status = (messageId: string, seenByCount: number) => ({
  message_id: messageId,
  seen_by_count: seenByCount,
  recipient_count: 2,
  label: seenByCount === 2 ? "Read by all" : "Not read by all",
  seen_by: [],
});

test("merges a refreshed receipt without clearing other confirmed message states", () => {
  const first = status("message-1", 2);
  const second = status("message-2", 0);
  const initial = mergeGroupChatReadStatusCache({}, `${groupId}:message-1`, first);
  const refreshed = mergeGroupChatReadStatusCache(initial, `${groupId}:message-2`, second);

  assert.deepEqual(refreshed, {
    [`${groupId}:message-1`]: first,
    [`${groupId}:message-2`]: second,
  });
});

test("read-state reconciliation marks the Group first and refreshes authoritative queries", async () => {
  const calls: string[] = [];
  await reconcileGroupChatReadState(
    groupId,
    async (receivedGroupId) => { calls.push(`mark:${receivedGroupId}`); },
    async (queryKey) => { calls.push(`invalidate:${JSON.stringify(queryKey)}`); },
  );

  assert.equal(calls[0], `mark:${groupId}`);
  assert.deepEqual(calls.slice(1).sort(), groupChatReadStateQueryKeys(groupId).map((queryKey) => `invalidate:${JSON.stringify(queryKey)}`).sort());
});

test("receipt refresh cannot begin while the initial mark-read request is pending", async () => {
  const calls: string[] = [];
  let releaseMarkRead!: () => void;
  const markReadPending = new Promise<void>((resolve) => { releaseMarkRead = resolve; });
  const reconciliation = reconcileGroupChatReadState(
    groupId,
    async () => {
      calls.push("mark-start");
      await markReadPending;
      calls.push("mark-complete");
    },
    async () => { calls.push("receipt-refresh"); },
    "user-1",
    "tenant-a",
  );

  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.deepEqual(calls, ["mark-start"]);
  releaseMarkRead();
  await reconciliation;
  assert.equal(calls[1], "mark-complete");
  assert.equal(calls[2], "receipt-refresh");
});

test("scopes receipt invalidation by account and tenant", () => {
  assert.deepEqual(groupChatReadStateQueryKeys(groupId, "user-1", "tenant-a").at(-1), ["group-chat", "read-status", "user-1", "tenant-a", groupId]);
  assert.deepEqual(groupChatReadStatusQueryKey(groupId, "user-1", "tenant-a", "message-1"), ["group-chat", "read-status", "user-1", "tenant-a", groupId, "message-1"]);
});

test("group_read refreshes only selected Group history and its scoped receipt cache", () => {
  assert.deepEqual(groupChatReadRefreshQueryKeys(groupId, "user-1", "tenant-a"), [
    ["group-chat", "messages", groupId],
    ["group-chat", "read-status", "user-1", "tenant-a", groupId],
  ]);
});

test("receipt loading waits during initial read reconciliation and is released afterward", () => {
  assert.equal(shouldQueueGroupChatReadStatuses("pending"), false);
  assert.equal(shouldQueueGroupChatReadStatuses("ready"), true);
});

test("reconnect read reconciliation is gated by a new refresh and unread history", () => {
  assert.equal(shouldReconcileGroupChatReadAfterReconnect(2, 1, 1, true), true);
  assert.equal(shouldReconcileGroupChatReadAfterReconnect(2, 1, 0, true), false);
  assert.equal(shouldReconcileGroupChatReadAfterReconnect(2, 1, null, true), false);
  assert.equal(shouldReconcileGroupChatReadAfterReconnect(2, 2, 1, true), false);
  assert.equal(shouldReconcileGroupChatReadAfterReconnect(2, 1, 1, false), false);
});

test("a group_read refresh remains forceful for a message rendered after the event", () => {
  assert.equal(shouldForceGroupChatReadStatusRefresh(false, true), true);
  assert.equal(shouldForceGroupChatReadStatusRefresh(false, false), false);
  assert.equal(shouldForceGroupChatReadStatusRefresh(true, false), true);
});

test("resolves only loaded read-through history and never treats an incomplete page set as complete", () => {
  const messages = [{ id: "message-1" }, { id: "message-2" }, { id: "message-3" }];
  assert.deepEqual(resolveGroupChatReadThroughBoundary(messages, "message-2"), { messageId: "message-2", loaded: true, messageIds: ["message-1", "message-2"] });
  assert.deepEqual(resolveGroupChatReadThroughBoundary(messages, "message-9"), { messageId: "message-9", loaded: false, messageIds: [] });
  assert.deepEqual(resolveGroupChatReadThroughBoundary(messages, null), { messageId: null, loaded: false, messageIds: [] });
});

test("coalesces duplicate boundary events but accepts changed boundaries and legacy events", () => {
  const seen = new Set<string>();
  assert.equal(shouldProcessGroupChatReadEvent(seen, "USER-1", "MESSAGE-1"), true);
  assert.equal(shouldProcessGroupChatReadEvent(seen, "user-1", "message-1"), false);
  assert.equal(shouldProcessGroupChatReadEvent(seen, "user-1", "message-2"), true);
  assert.equal(shouldProcessGroupChatReadEvent(seen, "user-1", null), true);
  assert.equal(shouldProcessGroupChatReadEvent(seen, "user-1", null), true);
  seen.clear();
  assert.equal(shouldProcessGroupChatReadEvent(seen, "user-1", "message-1"), true);
});

test("read-state invalidation remains scoped even when an identity scope is unavailable", () => {
  assert.deepEqual(groupChatReadStateQueryKeys(groupId).at(-1), ["group-chat", "read-status", "", "", groupId]);
});

test("read-state reconciliation does not invalidate stale data after a failed mark-read request", async () => {
  const invalidated: readonly unknown[][] = [];
  await assert.rejects(
    reconcileGroupChatReadState(
      groupId,
      async () => { throw new Error("read failed"); },
      async (queryKey) => { invalidated.push(queryKey); },
    ),
  );
  assert.deepEqual(invalidated, []);
});
