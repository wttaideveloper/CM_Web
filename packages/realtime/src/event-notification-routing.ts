import type { RealtimeNotification } from "./types";

const enterpriseEventTypes = new Set(["event_approved", "event_rejected", "event_changes_requested"]);
const platformEventTypes = new Set(["event_submitted"]);
const platformTrainingTypes = new Set([
  "training_submitted",
  "training_submitted_for_approval",
  "training_submission",
  "training_approval_requested",
]);
const enterpriseTrainingTypes = new Set([
  "training_approved",
  "training_published",
  "training_submitted",
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

function notificationData(notification: NotificationRouteInput): Record<string, unknown> {
  return {
    ...recordValue(notification.metadata),
    ...recordValue(notification.data),
  };
}

type NotificationRouteInput = Pick<RealtimeNotification, "notification_type" | "data"> & {
  category?: string;
  metadata?: Record<string, unknown>;
  title?: string;
  body?: string;
};

function eventIdForRoute(notification: NotificationRouteInput): string | null {
  const data = notificationData(notification);
  const direct = readNonEmptyString(data.event_id) ?? readNonEmptyString(data.eventId);
  if (direct) return direct;

  const nestedEvent = recordValue(data.event);
  const nested = readNonEmptyString(nestedEvent.id)
    ?? readNonEmptyString(nestedEvent.event_id)
    ?? readNonEmptyString(nestedEvent.eventId);
  if (nested) return nested;

  return readNonEmptyString(data.entity_type)?.toLocaleLowerCase() === "event"
    ? readNonEmptyString(data.entity_id)
    : null;
}

function trainingIdForRoute(notification: NotificationRouteInput): string | null {
  const data = notificationData(notification);
  const direct = readNonEmptyString(data.training_id) ?? readNonEmptyString(data.trainingId);
  if (direct) return direct;
  const nestedTraining = recordValue(data.training);
  const nested = readNonEmptyString(nestedTraining.id)
    ?? readNonEmptyString(nestedTraining.training_id)
    ?? readNonEmptyString(nestedTraining.trainingId);
  if (nested) return nested;
  return readNonEmptyString(data.entity_type)?.toLocaleLowerCase() === "training"
    ? readNonEmptyString(data.entity_id)
    : null;
}

function resolveNotificationEventName(notification: NotificationRouteInput): string {
  const data = notificationData(notification);
  const candidates = [
    readNonEmptyString(notification.notification_type),
    readNonEmptyString(data.notification_type),
    readNonEmptyString(data.type),
    readNonEmptyString(notification.category),
    readNonEmptyString(data.category),
  ].filter((candidate): candidate is string => candidate !== null);
  const knownType = candidates.find((candidate) => {
    const normalizedCandidate = candidate.toLocaleLowerCase();
    return platformEventTypes.has(normalizedCandidate)
      || enterpriseEventTypes.has(normalizedCandidate)
      || enterpriseTrainingTypes.has(normalizedCandidate)
      || platformTrainingTypes.has(normalizedCandidate);
  });
  if (knownType) return knownType.toLocaleLowerCase();

  const text = `${notification.title ?? ""} ${notification.body ?? ""}`.toLocaleLowerCase();
  if (/\btraining\b/.test(text) && /\b(submitted|submission|approval requested)\b/.test(text)) return "training_submitted";
  if (/\btraining\b/.test(text)) return "training_notification";
  return (candidates[0] ?? "unknown").toLocaleLowerCase();
}

/** Resolves an Event or Training workflow notification to its relevant Web screen. */
export function resolveNotificationTarget(
  notification: NotificationRouteInput,
  scope: "enterprise" | "platform",
): string | null {
  const eventName = resolveNotificationEventName(notification);
  if (scope === "platform") {
    if (eventName.toLocaleLowerCase() === "event_submitted") return "/approval-queue";
    return platformTrainingTypes.has(eventName) ? "/approval-queue?type=trainings" : null;
  }
  const trainingId = trainingIdForRoute(notification);
  if (trainingId) return `/admin/trainings/${encodeURIComponent(trainingId)}`;
  if (!enterpriseEventTypes.has(eventName)) return null;
  const eventId = eventIdForRoute(notification);
  if (!eventId) return null;
  return eventName === "event_changes_requested" ? `/admin/events/${encodeURIComponent(eventId)}/edit` : `/admin/events/${encodeURIComponent(eventId)}`;
}

/** Marks a notification read without allowing a read failure to block app-router navigation. */
export function handleNotificationClick(
  notification: Pick<RealtimeNotification, "id" | "notification_type" | "data"> & {
    category?: string;
    metadata?: Record<string, unknown>;
  },
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

/** Extracts Training titles and discussion sender names from notification API metadata. */
export function formatTrainingNotificationDetails(
  notification: Pick<RealtimeNotification, "notification_type" | "title" | "body" | "data">,
): { trainingTitle: string | null; senderName: string | null } {
  const data = recordValue(notification.data);
  const training = recordValue(data.training);
  const trainingTitle =
    readNonEmptyString(data.training_title) ??
    readNonEmptyString(data.trainingTitle) ??
    readNonEmptyString(data.training_name) ??
    readNonEmptyString(data.trainingName) ??
    readNonEmptyString(data.course_title) ??
    readNonEmptyString(data.entity_title) ??
    readNonEmptyString(training.title) ??
    readNonEmptyString(training.name);

  const type = [
    notification.notification_type,
    readNonEmptyString(data.type),
    readNonEmptyString(data.event_type),
    readNonEmptyString(data.action),
  ].filter(Boolean).join(" ").toLocaleLowerCase();
  const isTrainingDiscussion = type.includes("discussion")
    && (type.includes("training") || Boolean(trainingIdForRoute({ notification_type: notification.notification_type, data })));
  const discussion = recordValue(data.discussion);
  const sender = recordValue(
    data.sender ?? data.author ?? data.actor ?? data.user ?? data.created_by
      ?? discussion.sender ?? discussion.author ?? discussion.actor ?? discussion.user,
  );
  const senderName = isTrainingDiscussion
    ? [
        readNonEmptyString(data.sender_name),
        readNonEmptyString(data.senderName),
        readNonEmptyString(data.author_name),
        readNonEmptyString(data.authorName),
        readNonEmptyString(data.actor_name),
        readNonEmptyString(data.actorName),
        readNonEmptyString(data.user_name),
        readNonEmptyString(data.userName),
        readNonEmptyString(data.participant_name),
        readNonEmptyString(data.created_by_name),
        readNonEmptyString(data.createdByName),
        readNonEmptyString(sender.display_name),
        readNonEmptyString(sender.full_name),
        readNonEmptyString(sender.name),
      ].find((name): name is string => typeof name === "string" && !name.includes("@")) ?? null
    : null;

  return { trainingTitle, senderName };
}
