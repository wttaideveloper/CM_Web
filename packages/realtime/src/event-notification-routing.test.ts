import { strict as assert } from "node:assert";
import test from "node:test";

import { formatEventFeedbackNotificationDetails, formatTrainingNotificationDetails, handleNotificationClick, resolveNotificationTarget } from "./event-notification-routing.ts";

const resubmittedEventId = "6784cc71-f2c7-4712-a732-29bcffdb849f";

test("Event notification targets use the Event metadata ID", () => {
  assert.equal(
    resolveNotificationTarget({ notification_type: "event_submitted", data: { event_id: "event-1" } }, "platform"),
    "/approval-queue?type=events",
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

test("Training submission notifications open the Training approval queue tab", () => {
  assert.equal(
    resolveNotificationTarget({
      notification_type: "training_submitted",
      data: {},
      title: "Training submitted for approval",
      body: "selfplace was submitted for approval.",
    }, "platform"),
    "/approval-queue?type=trainings",
  );
  assert.equal(
    resolveNotificationTarget({
      notification_type: "workflow",
      category: "workflow",
      data: {},
      title: "Training submitted for approval",
      body: "selfplace was submitted for approval.",
    }, "platform"),
    "/approval-queue?type=trainings",
  );
});

test("Enterprise Training notifications open the specific admin Training", () => {
  assert.equal(
    resolveNotificationTarget({
      notification_type: "training_enrollment_accepted",
      data: { training_id: "training-1" },
    }, "enterprise"),
    "/admin/trainings/training-1?tab=enrolments",
  );
  assert.equal(
    resolveNotificationTarget({
      notification_type: "automatic",
      category: "training_enrollment_created",
      metadata: { entity_type: "training", training_id: "training-3", enrollment_id: "enrollment-3", status: "pending_approval" },
      data: {},
    }, "enterprise"),
    "/admin/trainings/training-3?tab=enrolments",
  );
  assert.equal(
    resolveNotificationTarget({
      notification_type: "workflow",
      data: { training: { id: "training-2" } },
      title: "Training published",
    }, "enterprise"),
    "/admin/trainings/training-2",
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
    "/approval-queue?type=events",
  );
});

test("generic Event submission notifications still open the Event approval tab", () => {
  assert.equal(
    resolveNotificationTarget({
      notification_type: "automatic",
      category: "workflow",
      metadata: { entity_type: "event", event_id: "event-approval-1" },
      data: {},
      title: "Event submitted for approval",
    }, "platform"),
    "/approval-queue?type=events",
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

test("training discussion and review notifications open the matching Enterprise tab", () => {
  assert.equal(
    resolveNotificationTarget({ notification_type: "automatic", category: "training_question_posted", metadata: { training_id: "training-1", discussion_id: "discussion-1" }, data: {} }, "enterprise"),
    "/admin/trainings/training-1?tab=live&discussion_id=discussion-1",
  );
  assert.equal(
    resolveNotificationTarget({ notification_type: "automatic", category: "review_submitted", metadata: { entity_type: "training", training_id: "training-2", review_id: "review-1" }, data: {} }, "enterprise"),
    "/admin/trainings/training-2?tab=reviews&review_id=review-1",
  );
  assert.equal(
    resolveNotificationTarget({ notification_type: "automatic", category: "review_submitted", metadata: { entity_type: "event", event_id: "event-3", review_id: "review-2" }, data: {} }, "enterprise"),
    "/admin/events/event-3?tab=reviews&review_id=review-2",
  );
});

test("Event attendee feedback notifications show context and open the matching Event views", () => {
  assert.equal(
    resolveNotificationTarget({ notification_type: "event_feedback", data: { event_id: "event-feedback-1" } }, "enterprise"),
    "/admin/events/event-feedback-1?tab=reviews&subview=feedback",
  );
  assert.equal(
    resolveNotificationTarget({ notification_type: "automatic", category: "event_feedback_submitted", metadata: { entity_type: "event", event_id: "event-feedback-2" }, data: {} }, "enterprise"),
    "/admin/events/event-feedback-2?tab=reviews&subview=feedback",
  );
  assert.equal(
    resolveNotificationTarget({ notification_type: "event_feedback_submitted", data: { event_id: "event-feedback-2" } }, "platform"),
    "/events?view=reviews&item_id=event-feedback-2&subview=feedback",
  );
  assert.deepEqual(formatEventFeedbackNotificationDetails({
    notification_type: "automatic",
    category: "event_feedback_submitted",
    metadata: { event_id: "event-feedback-2", attendee_name: "Asha Rao", event_title: "Clinical Summit" },
    data: {},
  }), { attendeeName: "Asha Rao", eventTitle: "Clinical Summit", comment: null });
});

test("review moderation and deletion notifications open the matching Super Admin queue", () => {
  assert.equal(
    resolveNotificationTarget({ notification_type: "automatic", category: "review_moderated", metadata: { entity_type: "training", training_id: "training-1", review_id: "review-1", new_status: "approved" }, data: {} }, "platform"),
    "/trainings?view=reviews&item_id=training-1&review_id=review-1&status=approved",
  );
  assert.equal(
    resolveNotificationTarget({ notification_type: "automatic", category: "review_deleted", metadata: { entity_type: "event", event_id: "event-1", review_id: "review-2", new_status: "deleted" }, data: {} }, "platform"),
    "/events?view=reviews&item_id=event-1&review_id=review-2&status=deleted&show_audit=true",
  );
  assert.equal(
    resolveNotificationTarget({ notification_type: "automatic", category: "review_deleted", metadata: { entity_type: "review", module: "training", review_id: "review-3", status: "deleted" }, data: {} }, "platform"),
    "/trainings?view=reviews&review_id=review-3&status=deleted&show_audit=true",
  );
});

test("Enterprise review notifications open the exact review and deletion history", () => {
  assert.equal(
    resolveNotificationTarget({ notification_type: "automatic", category: "review_moderated", metadata: { entity_type: "training", training_id: "training-4", review_id: "review-4", new_status: "approved" }, data: {} }, "enterprise"),
    "/admin/trainings/training-4?tab=reviews&review_id=review-4",
  );
  assert.equal(
    resolveNotificationTarget({ notification_type: "automatic", category: "review_deleted", metadata: { entity_type: "event", event_id: "event-5", review_id: "review-5", action: "deleted" }, data: {} }, "enterprise"),
    "/admin/events/event-5?tab=reviews&review_id=review-5&status=deleted&show_audit=true",
  );
  assert.equal(
    resolveNotificationTarget({ notification_type: "automatic", category: "review_deleted", metadata: { entity_type: "review", module: "training", review_id: "review-6", action: "deleted" }, data: {} }, "enterprise"),
    "/admin/trainings?tab=reviews&review_id=review-6&status=deleted&show_audit=true",
  );
});

test("training question notifications expose the learner and training labels", () => {
  assert.deepEqual(formatTrainingNotificationDetails({
    notification_type: "automatic",
    title: "New question in a training discussion",
    body: "Lena asked in Python Advanced Bootcamp: How do I access lesson 3 resources?",
    data: { category: "training_question_posted", learner_name: "Lena", training_name: "Python Advanced Bootcamp", training_id: "training-1" },
  }), { trainingTitle: "Python Advanced Bootcamp", senderName: "Lena", learnerName: null, enrollmentStatus: null });
});

test("training application notifications expose learner, training, and pending status", () => {
  assert.deepEqual(formatTrainingNotificationDetails({
    notification_type: "automatic",
    title: "New training enrollment application",
    body: "A learner submitted an application.",
    data: {
      category: "training_enrollment_created",
      entity_type: "training",
      training_id: "training-4",
      training_name: "Clinical Telemedicine",
      enrollment_id: "enrollment-4",
      learner_name: "Taylor Learner",
      status: "pending_approval",
    },
  }), {
    trainingTitle: "Clinical Telemedicine",
    senderName: null,
    learnerName: "Taylor Learner",
    enrollmentStatus: "pending_approval",
  });
});
