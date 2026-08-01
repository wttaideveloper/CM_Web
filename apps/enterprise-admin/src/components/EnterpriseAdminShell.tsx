"use client";

import { usePathname } from "next/navigation";
import { useCallback, type ReactNode } from "react";

import { useAuth } from "@ihp/auth";
import { EnterpriseAdminLayout } from "@ihp/enterprise-layout";

import EnterpriseRealtimeRouteProviders from "@/providers/EnterpriseRealtimeRouteProviders";

export default function EnterpriseAdminShell({ children }: { children: ReactNode }) {
  const { logout, user } = useAuth();
  const pathname = usePathname();

  const handleLogout = useCallback(async () => {
    try {
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
      user={user}
      onLogout={handleLogout}
    >
      {children}
    </EnterpriseAdminLayout>
  );

  const isRealtimeRoute = pathname === "/admin/messages" || pathname === "/admin/notifications";

  return isRealtimeRoute ? (
    <EnterpriseRealtimeRouteProviders>{layout}</EnterpriseRealtimeRouteProviders>
  ) : (
    layout
  );
}
