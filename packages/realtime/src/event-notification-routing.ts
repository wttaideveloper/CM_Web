import type { RealtimeNotification } from "./types";

const enterpriseEventTypes = new Set(["event_approved", "event_rejected", "event_changes_requested"]);
const platformEventTypes = new Set(["event_submitted"]);
const platformTrainingTypes = new Set([
  "training_submitted",
  "training_submitted_for_approval",
  "training_submission",
  "training_approval_requested",
]);
const eventRegistrationTypes = new Set([
  "event_registration",
  "event_registered",
  "event_registration_created",
  "event_registration_accepted",
  "event_registration_confirmed",
  "event_enrollment",
  "event_enrolled",
  "event_enrollment_created",
  "event_enrolment_accepted",
  "event_enrolment",
  "event_enrolment_created",
  "event_booking_created",
  "event_ticket_purchased",
]);
const trainingDiscussionTypes = new Set(["training_question_posted", "training_discussion_new", "training_new_discussion", "training_question"]);
const reviewSubmissionTypes = new Set(["review_submitted", "training_review_submitted", "event_review_submitted"]);
const reviewModerationTypes = new Set(["review_moderated", "review_deleted", "training_review_moderated", "event_review_moderated", "training_review_deleted", "event_review_deleted"]);
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
  "training_enrolment_submitted",
  "training_enrollment_submitted",
  "training_enrolment_requested",
  "training_enrollment_requested",
  "training_enrollment_application",
  "training_enrolment_application",
  "training_application_submitted",
  "training_application_created",
  "enrolment_application_created",
  "enrollment_application_created",
  "training_enrolment_approved",
  "training_enrollment_accepted",
  "training_enrollment_rejected",
  "training_enrolment_accepted",
  "training_enrolment_rejected",
  "training_order_created",
  "enrolment_created",
  "enrollment_created",
]);
const trainingEnrollmentTypes = new Set([
  "training_enrolled",
  "training_enrolment",
  "training_enrollment",
  "training_enrolment_created",
  "training_enrollment_created",
  "training_enrolment_submitted",
  "training_enrollment_submitted",
  "training_enrolment_requested",
  "training_enrollment_requested",
  "training_enrollment_application",
  "training_enrolment_application",
  "training_application_submitted",
  "training_application_created",
  "enrolment_application_created",
  "enrollment_application_created",
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
  const metadata = recordValue(notification.metadata);
  const data = recordValue(notification.data);
  return {
    ...recordValue(metadata.metadata),
    ...recordValue(metadata.data),
    ...recordValue(metadata.payload),
    ...metadata,
    ...recordValue(data.metadata),
    ...recordValue(data.data),
    ...recordValue(data.payload),
    ...data,
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
  const direct = readNonEmptyString(data.event_id) ?? readNonEmptyString(data.eventId) ?? readNonEmptyString(data.item_id) ?? readNonEmptyString(data.itemId);
  if (direct) return direct;

  const nestedEvent = recordValue(data.event);
  const nested = readNonEmptyString(nestedEvent.id)
    ?? readNonEmptyString(nestedEvent.event_id)
    ?? readNonEmptyString(nestedEvent.eventId);
  if (nested) return nested;

  return ["event", "events"].includes((readNonEmptyString(data.entity_type) ?? readNonEmptyString(data.module) ?? readNonEmptyString(data.item_type))?.toLocaleLowerCase() ?? "")
    ? readNonEmptyString(data.entity_id)
    : null;
}

function trainingIdForRoute(notification: NotificationRouteInput): string | null {
  const data = notificationData(notification);
  const direct = readNonEmptyString(data.training_id) ?? readNonEmptyString(data.trainingId) ?? readNonEmptyString(data.item_id) ?? readNonEmptyString(data.itemId);
  if (direct) return direct;
  const nestedTraining = recordValue(data.training);
  const nested = readNonEmptyString(nestedTraining.id)
    ?? readNonEmptyString(nestedTraining.training_id)
    ?? readNonEmptyString(nestedTraining.trainingId);
  if (nested) return nested;
  return ["training", "trainings", "course"].includes((readNonEmptyString(data.entity_type) ?? readNonEmptyString(data.module) ?? readNonEmptyString(data.item_type))?.toLocaleLowerCase() ?? "")
    ? readNonEmptyString(data.entity_id)
    : null;
}

function reviewModuleForRoute(notification: NotificationRouteInput, eventName: string): "event" | "training" | null {
  const data = notificationData(notification);
  const entityType = (
    readNonEmptyString(data.entity_type)
    ?? readNonEmptyString(data.module)
    ?? readNonEmptyString(data.item_type)
    ?? readNonEmptyString(data.entityType)
  )?.toLocaleLowerCase();

  if (entityType === "event" || entityType === "events" || readNonEmptyString(data.event_id) || readNonEmptyString(data.eventId)) return "event";
  if (entityType === "training" || entityType === "trainings" || entityType === "course" || readNonEmptyString(data.training_id) || readNonEmptyString(data.trainingId)) return "training";
  if (eventName.includes("event")) return "event";
  if (eventName.includes("training")) return "training";
  return null;
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
      || platformTrainingTypes.has(normalizedCandidate)
      || eventRegistrationTypes.has(normalizedCandidate)
      || trainingDiscussionTypes.has(normalizedCandidate)
      || reviewSubmissionTypes.has(normalizedCandidate)
      || reviewModerationTypes.has(normalizedCandidate);
  });
  if (knownType) return knownType.toLocaleLowerCase();

  const text = `${candidates.join(" ")} ${notification.title ?? ""} ${notification.body ?? ""}`.toLocaleLowerCase();
  const entityType = readNonEmptyString(data.entity_type)?.toLocaleLowerCase();
  if (/review.*(moder|delet)|(?:moder|delet).*review/.test(text)) return text.includes("delet") ? "review_deleted" : "review_moderated";
  if (entityType === "training" && /\b(enrol|enroll|registration|registered|booking|booked)\w*\b/.test(text)) return "training_enrollment";
  if (entityType === "event" && /\b(enrol|enroll|registration|registered|booking|booked|ticket)\w*\b/.test(text)) return "event_registration";
  if (/\btraining\b/.test(text) && /\b(submitted|submission|approval requested)\b/.test(text)) return "training_submitted";
  if (/\bevent\b/.test(text) && /\b(submitted|submission|approval requested)\b/.test(text)) return "event_submitted";
  if (/\btraining\b/.test(text) && /\b(enrol|enroll|registration|registered|booking|booked)\w*\b/.test(text)) return "training_enrollment";
  if (/\bevent\b/.test(text) && /\b(enrol|enroll|registration|registered|booking|booked|ticket)\w*\b/.test(text)) return "event_registration";
  if (/\btraining\b/.test(text)) return "training_notification";
  return (candidates[0] ?? "unknown").toLocaleLowerCase();
}

/** Returns a module-specific title for review moderation notifications. */
export function formatReviewModerationNotificationTitle(notification: NotificationRouteInput): string | null {
  const eventName = resolveNotificationEventName(notification);
  if (!reviewModerationTypes.has(eventName)) return null;

  const module = reviewModuleForRoute(notification, eventName);
  if (!module) return null;

  const data = notificationData(notification);
  const action = (readNonEmptyString(data.action) ?? readNonEmptyString(data.new_status) ?? "").toLocaleLowerCase();
  const isDeleted = eventName.includes("deleted") || action === "deleted";
  return `${module === "event" ? "Event" : "Training"} review ${isDeleted ? "deleted" : "updated"}`;
}

/** Extracts safe actor, action, and item details from review moderation notifications. */
export function formatReviewModerationNotificationDetails(
  notification: NotificationRouteInput,
): { actorName: string | null; actorRole: string | null; action: string | null; itemName: string | null; itemType: "Training" | "Event" | null } {
  const eventName = resolveNotificationEventName(notification);
  if (!reviewModerationTypes.has(eventName)) {
    return { actorName: null, actorRole: null, action: null, itemName: null, itemType: null };
  }

  const data = notificationData(notification);
  const module = reviewModuleForRoute(notification, eventName);
  const actorNameValue = readNonEmptyString(data.actor_name) ?? readNonEmptyString(data.actorName);
  const actorName = actorNameValue && !actorNameValue.includes("@") ? actorNameValue : null;
  const rawRole = (readNonEmptyString(data.actor_role) ?? readNonEmptyString(data.actorRole))?.toLocaleLowerCase().replace(/[\s-]+/g, "_");
  const actorRole = rawRole?.includes("super_admin") || rawRole?.includes("platform_admin") ? "Super Admin"
    : rawRole?.includes("provider") ? "Provider"
      : rawRole?.includes("admin") ? "Enterprise Admin"
        : null;
  const action = readNonEmptyString(data.action)
    ?? readNonEmptyString(data.new_status)
    ?? readNonEmptyString(data.to_status);
  const itemName = [data.item_name, data.training_name, data.event_name, data.item_title, data.training_title, data.event_title]
    .map(readNonEmptyString)
    .find((value): value is string => value !== null) ?? null;

  return { actorName, actorRole, action, itemName, itemType: module === "training" ? "Training" : module === "event" ? "Event" : null };
}

/** Resolves an Event or Training workflow notification to its relevant Web screen. */
export function resolveNotificationTarget(
  notification: NotificationRouteInput,
  scope: "enterprise" | "platform",
): string | null {
  const eventName = resolveNotificationEventName(notification);
  if (scope === "platform") {
    if (eventName.toLocaleLowerCase() === "event_submitted") return "/approval-queue?type=events";
    if (reviewModerationTypes.has(eventName) || reviewSubmissionTypes.has(eventName)) {
      const data = notificationData(notification);
      const module = reviewModuleForRoute(notification, eventName);
      const itemId = module === "event" ? eventIdForRoute(notification) : module === "training" ? trainingIdForRoute(notification) : null;
      if (!module || !itemId) return null;
      const reviewId = readNonEmptyString(data.review_id) || readNonEmptyString(data.reviewId) || readNonEmptyString(data.id);
      const status = (readNonEmptyString(data.new_status) ?? readNonEmptyString(data.action))?.toLocaleLowerCase();
      const isDelete = eventName.includes("delete") || status === "deleted";
      const params = new URLSearchParams({ view: "reviews", item_id: itemId });
      if (reviewId) params.set("review_id", reviewId);
      if (status === "pending" || status === "approved" || status === "rejected") params.set("status", status);
      if (isDelete) params.set("show_audit", "true");
      return `/${module === "training" ? "trainings" : "events"}?${params.toString()}`;
    }
    return platformTrainingTypes.has(eventName) ? "/approval-queue?type=trainings" : null;
  }
  if (trainingDiscussionTypes.has(eventName)) {
    const trainingId = trainingIdForRoute(notification);
    if (!trainingId) return null;
    const params = new URLSearchParams({ tab: "live" });
    const discussionId = readNonEmptyString(notificationData(notification).discussion_id);
    if (discussionId) params.set("discussion_id", discussionId);
    return `/admin/trainings/${encodeURIComponent(trainingId)}?${params.toString()}`;
  }
  if (reviewModerationTypes.has(eventName) || reviewSubmissionTypes.has(eventName)) {
    const data = notificationData(notification);
    const module = reviewModuleForRoute(notification, eventName);
    const itemId = module === "event" ? eventIdForRoute(notification) : module === "training" ? trainingIdForRoute(notification) : null;
    if (!module || !itemId) return null;
    const reviewId = readNonEmptyString(data.review_id) ?? readNonEmptyString(data.reviewId);
    const status = (readNonEmptyString(data.new_status) ?? readNonEmptyString(data.action))?.toLocaleLowerCase();
    const isDeleted = eventName.includes("delete") || status === "deleted";
    const params = new URLSearchParams({ tab: "reviews" });
    if (reviewId) params.set("review_id", reviewId);
    if (isDeleted) params.set("show_audit", "true");
    return `/admin/${module === "training" ? "trainings" : "events"}/${encodeURIComponent(itemId)}?${params.toString()}`;
  }
  const trainingId = trainingIdForRoute(notification);
  if (trainingId) {
    const tab = reviewSubmissionTypes.has(eventName) ? "reviews" : null;
    const data = notificationData(notification);
    const hasEnrollmentId = Boolean(readNonEmptyString(data.enrollment_id) ?? readNonEmptyString(data.enrolment_id));
    const enrollmentTab = trainingEnrollmentTypes.has(eventName)
      || hasEnrollmentId
      || /enrol|enroll|registration|registered|booking|application/.test(eventName);
    const params = tab ? new URLSearchParams({ tab }) : enrollmentTab ? new URLSearchParams({ tab: "enrolments" }) : null;
    const reviewId = readNonEmptyString(notificationData(notification).review_id);
    if (params && reviewId) params.set("review_id", reviewId);
    return `/admin/trainings/${encodeURIComponent(trainingId)}${params ? `?${params.toString()}` : ""}`;
  }
  if (reviewSubmissionTypes.has(eventName)) {
    const eventId = eventIdForRoute(notification);
    if (!eventId) return null;
    const params = new URLSearchParams({ tab: "reviews" });
    const reviewId = readNonEmptyString(notificationData(notification).review_id);
    if (reviewId) params.set("review_id", reviewId);
    return `/admin/events/${encodeURIComponent(eventId)}?${params.toString()}`;
  }
  if (eventRegistrationTypes.has(eventName) || /registration|registered|enrol|enroll|booking|ticket/.test(eventName)) {
    const eventId = eventIdForRoute(notification);
    if (!eventId) return null;
    return `/admin/events/${encodeURIComponent(eventId)}?tab=registrations`;
  }
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
): { trainingTitle: string | null; senderName: string | null; learnerName: string | null; enrollmentStatus: string | null } {
  const data = notificationData({ notification_type: notification.notification_type, data: notification.data, title: notification.title, body: notification.body });
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
    readNonEmptyString(data.category),
  ].filter(Boolean).join(" ").toLocaleLowerCase();
  const isTrainingDiscussion = (type.includes("discussion") || type.includes("question_posted"))
    && (type.includes("training") || Boolean(trainingIdForRoute({ notification_type: notification.notification_type, data })));
  const hasEnrollmentId = Boolean(readNonEmptyString(data.enrollment_id) ?? readNonEmptyString(data.enrolment_id));
  const isTrainingEnrollment = trainingEnrollmentTypes.has(resolveNotificationEventName({ notification_type: notification.notification_type, data, title: notification.title, body: notification.body }))
    || (hasEnrollmentId && Boolean(trainingIdForRoute({ notification_type: notification.notification_type, data })));
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
        readNonEmptyString(data.learner_name),
        readNonEmptyString(data.created_by_name),
        readNonEmptyString(data.createdByName),
        readNonEmptyString(sender.display_name),
        readNonEmptyString(sender.full_name),
        readNonEmptyString(sender.name),
      ].find((name): name is string => typeof name === "string" && !name.includes("@")) ?? null
    : null;

  const learnerName = isTrainingEnrollment
    ? [data.learner_name, data.applicant_name, data.participant_name, data.student_name, data.user_name, data.sender_name]
        .map(readNonEmptyString)
        .find((name): name is string => Boolean(name && !name.includes("@"))) ?? null
    : null;
  const enrollmentStatus = isTrainingEnrollment
    ? readNonEmptyString(data.enrollment_status) ?? readNonEmptyString(data.enrolment_status) ?? readNonEmptyString(data.status)
    : null;

  return { trainingTitle, senderName, learnerName, enrollmentStatus };
}

/** Extracts safe learner and item details from a new review notification. */
export function formatReviewNotificationDetails(
  notification: Pick<RealtimeNotification, "notification_type" | "data"> & {
    category?: string;
    metadata?: Record<string, unknown>;
  },
): { learnerName: string | null; itemName: string | null; itemType: "Training" | "Event" | null; rating: number | null } {
  const data = notificationData(notification);
  const notificationType = resolveNotificationEventName(notification);
  if (!reviewSubmissionTypes.has(notificationType)) {
    return { learnerName: null, itemName: null, itemType: null, rating: null };
  }

  const learnerName = [data.learner_name, data.reviewer_name, data.participant_name, data.author_name]
    .find((value): value is string => typeof value === "string" && value.trim().length > 0 && !value.includes("@"))
    ?.trim() ?? null;
  const module = reviewModuleForRoute(notification, notificationType);
  const itemName = [
    data.item_name,
    data.training_name,
    data.event_name,
    data.training_title,
    data.event_title,
    data.item_title,
    data.entity_title,
  ].find((value): value is string => typeof value === "string" && value.trim().length > 0)?.trim() ?? null;
  const rawRating = data.rating;
  const rating = typeof rawRating === "number" && Number.isInteger(rawRating) && rawRating >= 1 && rawRating <= 5
    ? rawRating
    : typeof rawRating === "string" && /^[1-5]$/.test(rawRating)
      ? Number(rawRating)
      : null;

  return {
    learnerName,
    itemName,
    itemType: module === "training" ? "Training" : module === "event" ? "Event" : null,
    rating,
  };
}
