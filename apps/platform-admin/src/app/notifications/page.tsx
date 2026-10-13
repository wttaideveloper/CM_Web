"use client";

import Link from "next/link";
import { formatReviewModerationNotificationDetails, formatReviewModerationNotificationTitle, formatReviewNotificationDetails } from "@ihp/realtime";
import { usePlatformWorkflowNotifications, workflowNotificationTarget } from "@/components/PlatformWorkflowNotifications";
import PlatformAdminShell from "@/components/PlatformAdminShell";

export default function PlatformNotificationsPage() {
  return <PlatformAdminShell><PlatformNotificationsContent /></PlatformAdminShell>;
}

function PlatformNotificationsContent() {
  const notifications = usePlatformWorkflowNotifications();
  const errorMessage = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;
  return <main className="mx-auto max-w-5xl space-y-6 p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#52736a]">Platform</p><h2 className="text-2xl font-bold">Notifications</h2></div>{notifications.unreadCount ? <button type="button" onClick={() => void notifications.markAllRead()} className="rounded-xl border px-4 py-2 text-sm">Mark all read</button> : null}</div>{notifications.error ? <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#f0c8c4] bg-[#fff8f7] px-4 py-3 text-sm text-[#8f3b2f]"><span>{errorMessage(notifications.error, "Unable to load notifications. Showing the last successful data.")}</span><button type="button" onClick={() => void notifications.refresh()} className="rounded-lg border border-current px-3 py-1 font-semibold">Retry</button></div> : null}{notifications.actionError ? <div role="alert" className="rounded-xl border border-[#f0c8c4] bg-[#fff8f7] px-4 py-3 text-sm text-[#8f3b2f]">{errorMessage(notifications.actionError, "Unable to update notification read state. Please try again.")}</div> : null}{notifications.isLoading && notifications.items.length === 0 ? <p>Loading notifications...</p> : notifications.items.length === 0 ? <p>No notifications.</p> : <div className="divide-y rounded-2xl border">{notifications.items.map((item) => {
    const review = formatReviewNotificationDetails({ notification_type: item.notification_type, category: item.category, metadata: item.metadata, data: item.metadata });
    const moderation = formatReviewModerationNotificationDetails({ notification_type: item.notification_type, category: item.category, metadata: item.metadata, data: item.metadata, title: item.title, body: item.message });
    const title = formatReviewModerationNotificationTitle({ notification_type: item.notification_type, category: item.category, metadata: item.metadata, data: item.metadata, title: item.title, body: item.message }) ?? item.title;
    return <Link key={item.id} href={workflowNotificationTarget(item) ?? "/notifications"} onClick={() => void notifications.markRead(item.id)} className={`block p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#1f6a58] ${item.is_read ? "" : "bg-[#f1f8f4]"}`}><p className="font-semibold">{title}</p><p className="text-sm">{item.message}</p>{moderation.actorName ? <p className="mt-1 text-xs font-semibold text-[#52736a]">By: {moderation.actorName}{moderation.actorRole ? ` (${moderation.actorRole})` : ""}</p> : null}{moderation.action ? <p className="text-xs font-semibold capitalize text-[#52736a]">Action: {moderation.action.replace(/[_-]+/g, " ")}</p> : null}{moderation.itemName ? <p className="text-xs font-semibold text-[#1f6a58]">{moderation.itemType ?? "Item"}: {moderation.itemName}</p> : null}{review.learnerName ? <p className="mt-1 text-xs font-semibold text-[#52736a]">Learner: {review.learnerName}</p> : null}{review.rating !== null ? <p className="mt-1 text-xs font-semibold text-[#52736a]">Rating: {review.rating} ★</p> : null}{review.itemName ? <p className="mt-1 text-xs font-semibold text-[#1f6a58]">{review.itemType ?? "Item"}: {review.itemName}</p> : null}<p className="mt-1 text-xs text-[#52736a]">{new Date(item.created_at).toLocaleString()}</p></Link>;
  })}</div>}</main>;
}
