"use client";

import { usePathname } from "next/navigation";
import { useCallback, type ReactNode } from "react";

import { useAuth } from "@ihp/auth";
import { EnterpriseAdminLayout, type EnterpriseNavigationItem } from "@ihp/enterprise-layout";

import { getShellRoute } from "@/lib/shell-route";
import EnterpriseRealtimeRouteProviders from "@/providers/EnterpriseRealtimeRouteProviders";

export default function EnterpriseAdminShell({ children }: { children: ReactNode }) {
  const { logout, user } = useAuth();
  const pathname = usePathname();
  const resolveNavigationHref = useCallback(
    (item: EnterpriseNavigationItem) => item.owner === "shell" ? getShellRoute(item.href) : item.href,
    [],
  );

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
      resolveNavigationHref={resolveNavigationHref}
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
