import type { RealtimeNotification } from "./types";

const enterpriseEventTypes = new Set(["event_approved", "event_rejected", "event_changes_requested"]);

function eventIdFor(notification: Pick<RealtimeNotification, "data">): string | null {
  const direct = notification.data.event_id;
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  return notification.data.entity_type === "event" && typeof notification.data.entity_id === "string" && notification.data.entity_id.trim()
    ? notification.data.entity_id.trim()
    : null;
}

export function resolveEventNotificationTarget(notification: Pick<RealtimeNotification, "notification_type" | "data">, scope: "enterprise" | "platform"): string | null {
  if (scope === "platform") return notification.notification_type === "event_submitted" ? "/approval-queue" : null;
  if (!enterpriseEventTypes.has(notification.notification_type)) return null;
  const eventId = eventIdFor(notification);
  if (!eventId) return null;
  return notification.notification_type === "event_changes_requested" ? `/admin/events/${encodeURIComponent(eventId)}/edit` : `/admin/events/${encodeURIComponent(eventId)}`;
}

export function notificationReason(notification: Pick<RealtimeNotification, "data" | "body">): string | null {
  const reason = notification.data.reason;
  return typeof reason === "string" && reason.trim() && !notification.body.toLocaleLowerCase().includes(reason.trim().toLocaleLowerCase()) ? reason.trim() : null;
}
