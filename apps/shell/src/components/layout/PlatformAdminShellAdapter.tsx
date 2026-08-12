"use client";

import type { ReactNode } from "react";

import { useAuth } from "@ihp/auth";
import { PlatformAdminLayout } from "@ihp/platform-layout";

import { ROUTE_PATHS } from "@/routing/route-ownership";
import { updatePresenceStatus } from "@/services/chat.service";
import { clearMarketplaceDemoSession } from "@/services/marketplace-demo-auth.service";

type PlatformAdminShellAdapterProps = {
  children: ReactNode;
  currentPath: string;
};

export default function PlatformAdminShellAdapter({
  children,
  currentPath,
}: PlatformAdminShellAdapterProps) {
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await updatePresenceStatus("offline");
    } catch {
      // Logout must continue even if presence update fails.
    }

    clearMarketplaceDemoSession();

    try {
      const logoutUrl = await logout();
      window.location.assign(logoutUrl);
    } catch {
      // Preserve the protected screen if the existing Web Auth logout request fails.
    }
  };

  return (
    <PlatformAdminLayout
      currentPath={currentPath}
      homeHref={ROUTE_PATHS.platform.dashboard}
      notificationsHref={ROUTE_PATHS.realtime.notifications}
      onLogout={handleLogout}
    >
      {children}
    </PlatformAdminLayout>
  );
}
