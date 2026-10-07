import { strict as assert } from "node:assert";
import test from "node:test";

import { createWorkflowNotificationClient } from "./workflow-notifications.ts";

test("workflow notification read actions use the documented PUT contract", async () => {
  const requests: Array<{ path: string; init?: RequestInit }> = [];
  const client = createWorkflowNotificationClient(async (path, init) => {
    requests.push({ path, init });
    return (path.endsWith("read-all") ? { marked_read: 2 } : { id: "notification-1", is_read: true }) as never;
  });

  await client.markRead("notification-1");
  await client.markAllRead();

  assert.deepEqual(requests, [
    { path: "/notifications/notification-1/read", init: { method: "PUT", body: "{}" } },
    { path: "/notifications/read-all", init: { method: "PUT", body: "{}" } },
  ]);
});
