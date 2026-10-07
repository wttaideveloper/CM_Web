"use client";

import Link from "next/link";
import { usePlatformWorkflowNotifications, workflowNotificationTarget } from "@/components/PlatformWorkflowNotifications";
import PlatformAdminShell from "@/components/PlatformAdminShell";

export default function PlatformNotificationsPage() {
  return <PlatformAdminShell><PlatformNotificationsContent /></PlatformAdminShell>;
}

function PlatformNotificationsContent() {
  const notifications = usePlatformWorkflowNotifications();
  const errorMessage = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;
  return <main className="mx-auto max-w-5xl space-y-6 p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#52736a]">Platform</p><h2 className="text-2xl font-bold">Notifications</h2></div>{notifications.unreadCount ? <button type="button" onClick={() => void notifications.markAllRead()} className="rounded-xl border px-4 py-2 text-sm">Mark all read</button> : null}</div>{notifications.error ? <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#f0c8c4] bg-[#fff8f7] px-4 py-3 text-sm text-[#8f3b2f]"><span>{errorMessage(notifications.error, "Unable to load notifications. Showing the last successful data.")}</span><button type="button" onClick={() => void notifications.refresh()} className="rounded-lg border border-current px-3 py-1 font-semibold">Retry</button></div> : null}{notifications.actionError ? <div role="alert" className="rounded-xl border border-[#f0c8c4] bg-[#fff8f7] px-4 py-3 text-sm text-[#8f3b2f]">{errorMessage(notifications.actionError, "Unable to update notification read state. Please try again.")}</div> : null}{notifications.isLoading && notifications.items.length === 0 ? <p>Loading notifications...</p> : notifications.items.length === 0 ? <p>No notifications.</p> : <div className="divide-y rounded-2xl border">{notifications.items.map((item) => <Link key={item.id} href={workflowNotificationTarget(item) ?? "/notifications"} onClick={() => void notifications.markRead(item.id)} className={`block p-4 ${item.is_read ? "" : "bg-[#f1f8f4]"}`}><p className="font-semibold">{item.title}</p><p className="text-sm">{item.message}</p><p className="mt-1 text-xs text-[#52736a]">{new Date(item.created_at).toLocaleString()}</p></Link>)}</div>}</main>;
}
