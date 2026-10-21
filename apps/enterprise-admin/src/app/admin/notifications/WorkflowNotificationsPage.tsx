"use client";

import { useRouter } from "next/navigation";
import { useEnterpriseWorkflowNotifications } from "@/realtime/enterprise-workflow-notifications";
import {
  formatNotificationTimestamp,
  formatEventFeedbackNotificationDetails,
  formatReviewModerationNotificationTitle,
  formatReviewSubmissionNotification,
  formatTrainingNotificationDetails,
  handleNotificationClick,
  notificationReason,
} from "@ihp/realtime";

export default function WorkflowNotificationsPage() {
  const state = useEnterpriseWorkflowNotifications();
  const router = useRouter();
  const items = state.items;
  const unreadCount = items.filter((item) => !item.is_read).length;

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#06201c]">Notifications</h2>
        {unreadCount > 0 ? (
          <button
            type="button"
            onClick={() => {
              void state.markAllRead().catch(() => undefined);
            }}
            className="rounded-xl border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#1f6a58] hover:bg-[#f4faf7]"
          >
            Mark all read
          </button>
        ) : null}
      </div>
      {state.readError || state.readAllError ? (
        <p role="alert" className="rounded-xl border border-[#f3d5d1] bg-[#fff7f6] px-4 py-3 text-sm text-[#8f3b2f]">
          Unable to update notification status. Please try again.
        </p>
      ) : null}
      {state.error ? (
        <p role="alert" className="rounded-xl border border-[#f3d5d1] bg-[#fff7f6] px-4 py-3 text-sm text-[#8f3b2f]">
          Unable to load Enterprise workflow notifications. Please refresh and try again.
        </p>
      ) : null}
      {items.length === 0 ? (
        state.isLoading ? (
          <p role="status" className="text-sm text-[#52736a]">Loading notifications...</p>
        ) : (
          <p className="text-sm text-[#52736a]">No notifications.</p>
        )
      ) : (
        <div className="divide-y divide-[#edf3f0] overflow-hidden rounded-2xl border border-[#e1ebe6] bg-white">
          {items.map((item) => {
            const notificationTitle = formatReviewModerationNotificationTitle({
              notification_type: item.notification_type,
              category: item.category,
              metadata: item.metadata,
              data: item.metadata,
              title: item.title,
              body: item.message,
            }) ?? item.title;
            const reviewSubmission = formatReviewSubmissionNotification({ notification_type: item.notification_type, category: item.category, metadata: item.metadata, data: item.metadata, title: item.title, body: item.message });
            const feedbackDetails = formatEventFeedbackNotificationDetails({ notification_type: item.notification_type, category: item.category, metadata: item.metadata, data: item.metadata, title: item.title, body: item.message });
            const reason = notificationReason({ data: item.metadata, body: item.message });
            const { trainingTitle, senderName, learnerName, enrollmentStatus } = formatTrainingNotificationDetails({
              notification_type: item.notification_type,
              title: item.title,
              body: item.message,
              data: item.metadata,
            });
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  handleNotificationClick(
                    {
                      id: item.id,
                      notification_type: item.notification_type,
                      category: item.category,
                      metadata: item.metadata,
                      data: item.metadata,
                      title: item.title,
                      body: item.message,
                    },
                    "enterprise",
                    (id) => Promise.resolve(state.markRead(id)).then(() => undefined),
                    (target) => router.push(target),
                  );
                }}
                className={`block w-full p-4 text-left transition hover:bg-[#f4faf7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#1f6a58] ${
                  item.is_read ? "bg-white" : "bg-[#f1f8f4]"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-semibold text-[#06201c]">{feedbackDetails ? "New Event attendee feedback" : reviewSubmission?.title ?? notificationTitle}</p>
                  {item.created_at ? (
                    <span className="text-xs font-semibold text-[#7f9d94]">
                      {formatNotificationTimestamp(item.created_at)}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-[#52736a]">{reviewSubmission?.message ?? item.message}</p>
                {feedbackDetails?.attendeeName ? <p className="mt-1 text-xs font-semibold text-[#52736a]">Attendee: {feedbackDetails.attendeeName}</p> : null}
                {feedbackDetails?.eventTitle ? <p className="mt-1 text-xs font-semibold text-[#1f6a58]">Event: {feedbackDetails.eventTitle}</p> : null}
                {feedbackDetails?.comment ? <p className="mt-2 whitespace-pre-wrap rounded-lg bg-[#f4faf7] p-3 text-sm text-[#31594d]">{feedbackDetails.comment}</p> : null}
                {senderName ? <p className="mt-1 text-xs font-semibold text-[#52736a]">From: {senderName}</p> : null}
                {learnerName ? <p className="mt-1 text-xs font-semibold text-[#52736a]">Learner: {learnerName}</p> : null}
                {trainingTitle ? (
                  <p className="mt-1 text-xs font-semibold text-[#1f6a58]">Training: {trainingTitle}</p>
                ) : null}
                {enrollmentStatus ? <p className="mt-1 text-xs font-semibold text-[#52736a]">Enrollment status: {enrollmentStatus.replace(/[_-]+/g, " ")}</p> : null}
                {reason ? <p className="mt-1 text-xs text-[#8a5a00]">Reason: {reason}</p> : null}
              </button>
            );
          })}
        </div>
      )}
    </main>
  );
}
