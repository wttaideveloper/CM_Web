"use client";
import { useEnterpriseWorkflowNotifications } from "@/realtime/enterprise-workflow-notifications";
import { notificationReason, resolveEventNotificationTarget } from "@ihp/realtime";

export default function WorkflowNotificationsPage() {
  const state = useEnterpriseWorkflowNotifications();
  return <main className="mx-auto max-w-4xl space-y-6 p-6"><div className="flex items-center justify-between"><h2 className="text-2xl font-bold">Notifications</h2><button type="button" onClick={() => void state.markAllRead()} className="rounded-xl border px-4 py-2 text-sm">Mark all read</button></div>{state.items.length === 0 ? <p>No notifications.</p> : <div className="divide-y rounded-2xl border">{state.items.map((item) => { const target = resolveEventNotificationTarget({ notification_type: item.notification_type, data: item.metadata }, "enterprise"); const reason = notificationReason({ data: item.metadata, body: item.message }); return <button key={item.id} type="button" onClick={() => { void state.markRead(item.id); if (target) window.location.assign(target); }} className={`block w-full p-4 text-left ${item.is_read ? "" : "bg-[#f1f8f4]"}`}><p className="font-semibold">{item.title}</p><p className="text-sm">{item.message}</p>{reason ? <p className="text-xs text-[#52736a]">Reason: {reason}</p> : null}</button>; })}</div>}</main>;
}
