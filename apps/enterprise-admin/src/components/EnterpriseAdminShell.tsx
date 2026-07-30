"use client";

import { useCallback, type ReactNode } from "react";

import { useAuth } from "@ihp/auth";
import { EnterpriseAdminLayout, type EnterpriseNavigationItem } from "@ihp/enterprise-layout";

import { getShellRoute } from "@/lib/shell-route";

export default function EnterpriseAdminShell({ children }: { children: ReactNode }) {
  const { logout, user } = useAuth();
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

  return (
    <EnterpriseAdminLayout
      profileHref={getShellRoute("/admin/profile")}
      notificationsHref={getShellRoute("/admin/notifications")}
      messagesHref={getShellRoute("/admin/messages")}
      resolveNavigationHref={resolveNavigationHref}
      user={user}
      onLogout={handleLogout}
    >
      {children}
    </EnterpriseAdminLayout>
  );
}
