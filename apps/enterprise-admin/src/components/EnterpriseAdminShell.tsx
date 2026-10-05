"use client";

import { useCallback, useEffect, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@ihp/auth";
import { EnterpriseAdminLayout } from "@ihp/enterprise-layout";
import { updatePresenceStatus } from "@ihp/messaging";
import { useRealtime } from "@ihp/realtime";

import EnterpriseRealtimeRouteProviders from "@/providers/EnterpriseRealtimeRouteProviders";
import { enterpriseWorkflowNotificationsKey, useEnterpriseWorkflowNotifications } from "@/realtime/enterprise-workflow-notifications";

function EnterpriseAdminShellContent({ children }: { children: ReactNode }) {
  const { logout, user } = useAuth();
  const realtime = useRealtime();
  const workflow = useEnterpriseWorkflowNotifications();
  const queryClient = useQueryClient();
  const latestRealtimeNotificationId = realtime.notifications[0]?.id;

  useEffect(() => {
    if (latestRealtimeNotificationId) {
      void queryClient.invalidateQueries({ queryKey: enterpriseWorkflowNotificationsKey });
    }
  }, [latestRealtimeNotificationId, queryClient]);

  const handleLogout = useCallback(async () => {
    try {
      if (process.env.NODE_ENV !== "production") {
        console.log("[Web presence] publish", {
          status: "offline",
          reason: "logout",
        });
      }
      await updatePresenceStatus("offline").catch(() => undefined);
      const logoutUrl = await logout();
      window.location.assign(logoutUrl);
    } catch {
      // Preserve the protected screen if the existing Web Auth logout request fails.
    }
  }, [logout]);

  const layout = (
    <EnterpriseAdminLayout
      profileHref="/admin/profile"
      notificationsHref="/admin/notifications"
      messagesHref="/admin/messages"
      notifications={realtime.notifications}
      totalUnreadCount={realtime.totalUnreadCount}
      onNotificationRead={realtime.markNotificationAsRead}
      onMarkAllNotificationsRead={realtime.markAllNotificationsAsRead}
      workflowNotifications={{ items: workflow.items, unreadCount: workflow.unreadCount, onRead: (id) => { void workflow.markRead(id); }, onMarkAllRead: () => { void workflow.markAllRead(); } }}
      user={user}
      onLogout={handleLogout}
    >
      {children}
    </EnterpriseAdminLayout>
  );

  return layout;
}

export default function EnterpriseAdminShell({ children }: { children: ReactNode }) {
  return <EnterpriseRealtimeRouteProviders><EnterpriseAdminShellContent>{children}</EnterpriseAdminShellContent></EnterpriseRealtimeRouteProviders>;
}
