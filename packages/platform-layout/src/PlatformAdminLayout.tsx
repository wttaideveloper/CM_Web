"use client";

import { useState } from "react";

import { AppFrame } from "@ihp/ui";

import { PlatformAdminHeader } from "./PlatformAdminHeader";
import { PlatformAdminSidebar } from "./PlatformAdminSidebar";
import { platformNavigationGroups } from "./platform-navigation";
import type { PlatformAdminLayoutProps } from "./types";

export function PlatformAdminLayout({
  children,
  currentPath,
  homeHref,
  notificationsHref,
  messagesHref = null,
  profileHref,
  profileInitials = "IH",
  navigationGroups = platformNavigationGroups,
  resolveNavigationHref = (item) => item.href,
  onLogout,
}: PlatformAdminLayoutProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <AppFrame
      sidebar={(
        <PlatformAdminSidebar
          currentPath={currentPath}
          navigationGroups={navigationGroups}
          resolveNavigationHref={resolveNavigationHref}
          mobileOpen={mobileSidebarOpen}
          onClose={() => setMobileSidebarOpen(false)}
        />
      )}
      header={(
        <PlatformAdminHeader
          homeHref={homeHref}
          notificationsHref={notificationsHref}
          messagesHref={messagesHref}
          profileHref={profileHref}
          profileInitials={profileInitials}
          onLogout={onLogout}
          onMenuClick={() => setMobileSidebarOpen((current) => !current)}
        />
      )}
    >
      {children}
    </AppFrame>
  );
}
