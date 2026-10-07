import type { RealtimeNotification } from "./types";

const enterpriseEventTypes = new Set(["event_approved", "event_rejected", "event_changes_requested"]);
const enterpriseTrainingTypes = new Set([
  "training_approved",
  "training_published",
  "training_rejected",
  "training_changes_requested",
  "training_needs_revision",
  "training_revision_requested",
  "training_enrolled",
  "training_enrolment",
  "training_enrollment",
  "training_enrolment_created",
  "training_enrollment_created",
  "training_enrolment_approved",
  "training_enrollment_accepted",
  "training_enrollment_rejected",
  "training_enrolment_accepted",
  "training_enrolment_rejected",
  "training_order_created",
  "enrolment_created",
  "enrollment_created",
]);

function readNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function recordValue(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function eventIdFor(notification: Pick<RealtimeNotification, "data">): string | null {
  const data = recordValue(notification.data);
  const direct = readNonEmptyString(data.event_id) ?? readNonEmptyString(data.eventId);
  if (direct) return direct;
  const nestedEvent = recordValue(data.event);
  const nested = readNonEmptyString(nestedEvent.id) ?? readNonEmptyString(nestedEvent.event_id) ?? readNonEmptyString(nestedEvent.eventId);
  if (nested) return nested;
  return readNonEmptyString(data.entity_type)?.toLocaleLowerCase() === "event" ? readNonEmptyString(data.entity_id) : null;
}

function trainingIdFor(notification: Pick<RealtimeNotification, "data">): string | null {
  const data = recordValue(notification.data);
  const direct = readNonEmptyString(data.training_id) ?? readNonEmptyString(data.trainingId);
  if (direct) return direct;
  return readNonEmptyString(data.entity_type)?.toLocaleLowerCase() === "training" ? readNonEmptyString(data.entity_id) : null;
}

type NotificationRouteInput = Pick<RealtimeNotification, "notification_type" | "data"> & {
  category?: string;
  metadata?: Record<string, unknown>;
};

function resolveNotificationEventName(notification: NotificationRouteInput): string {
  return readNonEmptyString(notification.category)
    ?? readNonEmptyString(notification.metadata?.category)
    ?? readNonEmptyString(notification.data.category)
    ?? readNonEmptyString(notification.notification_type)
    ?? "unknown";
}

/** Resolves an Event or Training workflow notification to its relevant Web screen. */
export function resolveNotificationTarget(
  notification: NotificationRouteInput,
  scope: "enterprise" | "platform",
): string | null {
  const eventName = resolveNotificationEventName(notification);
  if (scope === "platform") {
    if (eventName === "event_submitted") return "/approval-queue";
    return eventName === "training_submitted" ? "/approval-queue?type=trainings" : null;
  }
  const trainingId = trainingIdFor(notification);
  if (trainingId && enterpriseTrainingTypes.has(eventName)) {
    if (eventName === "training_enrollment_accepted" || eventName === "training_enrollment_rejected") {
      return `/trainings/${encodeURIComponent(trainingId)}`;
    }
    return `/admin/trainings/${encodeURIComponent(trainingId)}`;
  }
  if (!enterpriseEventTypes.has(eventName)) return null;
  const eventId = eventIdFor(notification);
  if (!eventId) return null;
  return eventName === "event_changes_requested" ? `/admin/events/${encodeURIComponent(eventId)}/edit` : `/admin/events/${encodeURIComponent(eventId)}`;
}

/** Marks a notification read without allowing a read failure to block app-router navigation. */
export function handleNotificationClick(
  notification: Pick<RealtimeNotification, "id" | "notification_type" | "data">,
  scope: "enterprise" | "platform",
  markRead: (id: string) => Promise<void> | void,
  navigate: (target: string) => void,
): string | null {
  try {
    void Promise.resolve(markRead(notification.id)).catch(() => undefined);
  } catch {
    // Navigation remains available when a synchronous read adapter fails.
  }
  const target = resolveNotificationTarget(notification, scope);
  if (target) navigate(target);
  return target;
}

/** Resolves an Event notification target for existing Event-only consumers. */
export function resolveEventNotificationTarget(
  notification: NotificationRouteInput,
  scope: "enterprise" | "platform",
): string | null {
  if (!resolveNotificationEventName(notification).startsWith("event_")) return null;
  return resolveNotificationTarget(notification, scope);
}

export function notificationReason(notification: Pick<RealtimeNotification, "data" | "body">): string | null {
  const reason =
    readNonEmptyString(notification.data.reason) ??
    readNonEmptyString(notification.data.rejection_reason) ??
    readNonEmptyString(notification.data.note) ??
    readNonEmptyString(notification.data.admin_note);
  return reason && !notification.body.toLocaleLowerCase().includes(reason.toLocaleLowerCase()) ? reason : null;
}

/** Extracts structured Training and enrolled learner details from a notification payload. */
export function formatTrainingNotificationDetails(
  notification: Pick<RealtimeNotification, "notification_type" | "title" | "body" | "data">,
): { trainingTitle: string | null } {
  const trainingTitle =
    readNonEmptyString(notification.data.training_title) ??
    readNonEmptyString(notification.data.trainingTitle) ??
    readNonEmptyString(notification.data.course_title) ??
    readNonEmptyString(notification.data.entity_title);
  return { trainingTitle };
}
