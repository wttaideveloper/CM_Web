import assert from "node:assert/strict";
import test from "node:test";
import { getGroupChatReconnectQueryKeys } from "./group-chat-reconnect.ts";

test("reconnect reconciliation is limited to the selected Group and scoped identity", () => {
  const groupId = "11111111-1111-4111-8111-111111111111";
  const keys = getGroupChatReconnectQueryKeys(groupId, "user-1", "tenant-a");

  assert.deepEqual(keys, [
    ["group-chat", "messages", groupId],
    ["group-chat", "pinned", groupId],
    ["group-chat", "group", groupId, "user-1"],
    ["group-chat", "members", groupId],
    ["group-chat", "current-member", groupId, "user-1"],
    ["group-chat", "groups", "user-1"],
    ["group-chat", "read-status", "user-1", "tenant-a", groupId],
  ]);

  assert.equal(keys.some((key) => key.includes("other-group")), false);
  assert.equal(keys.some((key) => key.includes("user-2")), false);
  assert.equal(keys.some((key) => key.includes("tenant-b")), false);
});
