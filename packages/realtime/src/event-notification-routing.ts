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

function eventIdFor(notification: Pick<RealtimeNotification, "data">): string | null {
  const direct = readNonEmptyString(notification.data.event_id) ?? readNonEmptyString(notification.data.eventId);
  if (direct) return direct;
  return notification.data.entity_type === "event" ? readNonEmptyString(notification.data.entity_id) : null;
}

function trainingIdFor(notification: Pick<RealtimeNotification, "data">): string | null {
  const direct = readNonEmptyString(notification.data.training_id) ?? readNonEmptyString(notification.data.trainingId);
  if (direct) return direct;
  return notification.data.entity_type === "training" ? readNonEmptyString(notification.data.entity_id) : null;
}

/** Resolves an Event or Training workflow notification to its relevant Web screen. */
export function resolveNotificationTarget(
  notification: Pick<RealtimeNotification, "notification_type" | "data">,
  scope: "enterprise" | "platform",
): string | null {
  if (scope === "platform") {
    if (notification.notification_type === "event_submitted") return "/approval-queue";
    return notification.notification_type === "training_submitted" ? "/approval-queue?type=trainings" : null;
  }
  const trainingId = trainingIdFor(notification);
  if (trainingId && (enterpriseTrainingTypes.has(notification.notification_type) || notification.notification_type.startsWith("training_"))) {
    return `/admin/trainings/${encodeURIComponent(trainingId)}`;
  }
  if (!enterpriseEventTypes.has(notification.notification_type)) return null;
  const eventId = eventIdFor(notification);
  if (!eventId) return null;
  return notification.notification_type === "event_changes_requested" ? `/admin/events/${encodeURIComponent(eventId)}/edit` : `/admin/events/${encodeURIComponent(eventId)}`;
}

/** Resolves an Event notification target for existing Event-only consumers. */
export function resolveEventNotificationTarget(
  notification: Pick<RealtimeNotification, "notification_type" | "data">,
  scope: "enterprise" | "platform",
): string | null {
  if (!notification.notification_type.startsWith("event_")) return null;
  return resolveNotificationTarget(notification, scope);
}

export function notificationReason(notification: Pick<RealtimeNotification, "data" | "body">): string | null {
  const reason = readNonEmptyString(notification.data.reason) ?? readNonEmptyString(notification.data.note) ?? readNonEmptyString(notification.data.admin_note);
  return reason && !notification.body.toLocaleLowerCase().includes(reason.toLocaleLowerCase()) ? reason : null;
}

/** Extracts structured Training and enrolled learner details from a notification payload. */
export function formatTrainingNotificationDetails(
  notification: Pick<RealtimeNotification, "notification_type" | "title" | "body" | "data">,
): { trainingTitle: string | null; learnerSummary: string | null } {
  const trainingTitle =
    readNonEmptyString(notification.data.training_title) ??
    readNonEmptyString(notification.data.trainingTitle) ??
    readNonEmptyString(notification.data.course_title) ??
    readNonEmptyString(notification.data.entity_title);
  const learnerName =
    readNonEmptyString(notification.data.participant_name) ??
    readNonEmptyString(notification.data.learner_name) ??
    readNonEmptyString(notification.data.user_name) ??
    readNonEmptyString(notification.data.full_name) ??
    readNonEmptyString(notification.data.name);
  const learnerEmail =
    readNonEmptyString(notification.data.participant_email) ??
    readNonEmptyString(notification.data.learner_email) ??
    readNonEmptyString(notification.data.user_email) ??
    readNonEmptyString(notification.data.email);
  const learnerSummary = learnerName && learnerEmail
    ? `${learnerName} (${learnerEmail})`
    : learnerName ?? learnerEmail ?? null;
  return { trainingTitle, learnerSummary };
}
