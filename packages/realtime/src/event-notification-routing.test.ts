import { strict as assert } from "node:assert";
import test from "node:test";

import { handleNotificationClick, resolveNotificationTarget } from "./event-notification-routing.ts";

const resubmittedEventId = "6784cc71-f2c7-4712-a732-29bcffdb849f";

test("Event notification targets use the Event metadata ID", () => {
  assert.equal(
    resolveNotificationTarget({ notification_type: "event_submitted", data: { event_id: "event-1" } }, "platform"),
    "/approval-queue",
  );
  assert.equal(
    resolveNotificationTarget({ notification_type: "event_approved", data: { event_id: "event-1" } }, "enterprise"),
    "/admin/events/event-1",
  );
  assert.equal(
    resolveNotificationTarget({ notification_type: "event_rejected", data: { entity_type: "event", entity_id: "event-2" } }, "enterprise"),
    "/admin/events/event-2",
  );
  assert.equal(
    resolveNotificationTarget({ notification_type: "event_changes_requested", data: { event_id: resubmittedEventId } }, "enterprise"),
    `/admin/events/${resubmittedEventId}/edit`,
  );
});

test("Event notification click marks the item and navigates when read fails", async () => {
  const calls: string[] = [];
  const target = handleNotificationClick(
    { id: "notification-1", notification_type: "event_changes_requested", data: { event_id: resubmittedEventId } },
    "enterprise",
    () => { calls.push("read"); return Promise.reject(new Error("read unavailable")); },
    (path) => calls.push(`navigate:${path}`),
  );
  await Promise.resolve();
  assert.equal(target, `/admin/events/${resubmittedEventId}/edit`);
  assert.deepEqual(calls, ["read", `navigate:/admin/events/${resubmittedEventId}/edit`]);
});

test("Event routing also accepts a nested Event metadata object", () => {
  assert.equal(
    resolveNotificationTarget({ notification_type: "event_approved", data: { event: { id: resubmittedEventId } } }, "enterprise"),
    `/admin/events/${resubmittedEventId}`,
  );
  assert.equal(
    resolveNotificationTarget({ notification_type: "event_approved", data: {} }, "enterprise"),
    null,
  );
});

test("Event routing prefers the workflow notification type over a generic category", () => {
  assert.equal(
    resolveNotificationTarget({
      notification_type: "event_changes_requested",
      category: "workflow",
      metadata: { event_id: resubmittedEventId },
      data: {},
    }, "enterprise"),
    `/admin/events/${resubmittedEventId}/edit`,
  );
  assert.equal(
    resolveNotificationTarget({
      notification_type: "event_submitted",
      category: "workflow",
      metadata: { event_id: resubmittedEventId },
      data: {},
    }, "platform"),
    "/approval-queue",
  );
});

test("Event click routing reads metadata and navigates when the read request fails", async () => {
  const calls: string[] = [];
  handleNotificationClick(
    {
      id: "notification-2",
      notification_type: "event_changes_requested",
      category: "workflow",
      metadata: { event_id: resubmittedEventId },
      data: {},
    },
    "enterprise",
    () => Promise.reject(new Error("read unavailable")),
    (path) => calls.push(path),
  );
  await Promise.resolve();
  assert.deepEqual(calls, [`/admin/events/${resubmittedEventId}/edit`]);
});
