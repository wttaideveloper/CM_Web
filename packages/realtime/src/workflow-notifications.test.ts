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

test("workflow notification list and unread count use the UserNotification paths", async () => {
  const requests: Array<{ path: string; init?: RequestInit }> = [];
  const client = createWorkflowNotificationClient(async (path, init) => {
    requests.push({ path, init });
    if (path.includes("unread-count")) return { unread_count: 3 } as never;
    return {
      items: [],
      pagination: { page: 2, page_size: 20, total: 0, total_pages: 0 },
    } as never;
  });

  await client.list(2, 20);
  await client.unreadCount();

  assert.deepEqual(requests, [
    { path: "/notifications?page=2&page_size=20", init: undefined },
    { path: "/notifications/unread-count", init: undefined },
  ]);
});

test("workflow history preserves Event notification type, category, and metadata", async () => {
  const eventId = "6784cc71-f2c7-4712-a732-29bcffdb849f";
  const client = createWorkflowNotificationClient(async () => ({
    items: [{
      id: "notification-event-1",
      notification_type: "event_changes_requested",
      category: "workflow",
      metadata: { event_id: eventId },
      title: "Event changes requested",
      message: "Please update the Event.",
      is_read: false,
      read_at: null,
      created_at: "2026-10-07T10:00:00Z",
    }],
    pagination: { page: 1, page_size: 20, total: 1, total_pages: 1 },
  }) as never);

  const response = await client.list();

  assert.deepEqual(response.items[0], {
    id: "notification-event-1",
    notification_id: "notification-event-1",
    user_id: "",
    is_read: false,
    read_at: null,
    delivered_at: null,
    title: "Event changes requested",
    message: "Please update the Event.",
    notification_type: "event_changes_requested",
    category: "workflow",
    metadata: { event_id: eventId },
    created_at: "2026-10-07T10:00:00Z",
  });
});
