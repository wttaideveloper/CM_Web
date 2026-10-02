"use client";

import Link from "next/link";
import { usePlatformWorkflowNotifications } from "@/components/PlatformWorkflowNotifications";
import PlatformAdminShell from "@/components/PlatformAdminShell";

export default function PlatformNotificationsPage() {
  return <PlatformAdminShell><PlatformNotificationsContent /></PlatformAdminShell>;
}

function PlatformNotificationsContent() {
  const notifications = usePlatformWorkflowNotifications();
  return <main className="mx-auto max-w-5xl space-y-6 p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#52736a]">Platform</p><h2 className="text-2xl font-bold">Notifications</h2></div><button type="button" onClick={() => void notifications.markAllRead()} className="rounded-xl border px-4 py-2 text-sm">Mark all read</button></div>{notifications.isLoading ? <p>Loading notifications...</p> : notifications.error ? <p role="alert">Unable to load notifications.</p> : notifications.items.length === 0 ? <p>No notifications.</p> : <div className="divide-y rounded-2xl border">{notifications.items.map((item) => <Link key={item.id} href={item.notification_type === "event_submitted" ? "/approval-queue" : "/notifications"} onClick={() => void notifications.markRead(item.id)} className={`block p-4 ${item.is_read ? "" : "bg-[#f1f8f4]"}`}><p className="font-semibold">{item.title}</p><p className="text-sm">{item.message}</p><p className="mt-1 text-xs text-[#52736a]">{new Date(item.created_at).toLocaleString()}</p></Link>)}</div>}</main>;
}
