"use client";

import { useCallback, type ReactNode } from "react";

import { useAuth } from "@ihp/auth";
import { EnterpriseAdminLayout } from "@ihp/enterprise-layout";
import { updatePresenceStatus } from "@ihp/messaging";
import { useRealtime } from "@ihp/realtime";

import EnterpriseRealtimeRouteProviders from "@/providers/EnterpriseRealtimeRouteProviders";

function EnterpriseAdminShellContent({ children }: { children: ReactNode }) {
  const { logout, user } = useAuth();
  const realtime = useRealtime();

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
