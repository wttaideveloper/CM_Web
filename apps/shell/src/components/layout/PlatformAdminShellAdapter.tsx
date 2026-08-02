"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

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
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await updatePresenceStatus("offline");
    } catch {
      // Logout must continue even if presence update fails.
    }

    clearMarketplaceDemoSession();
    router.replace(ROUTE_PATHS.public.auth.login);
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
