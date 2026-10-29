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
  approvalNotifications,
  workflowNotifications,
  messagesHref = null,
  profileHref,
  profileInitials = "IH",
  profileName = null,
  profileEmail = null,
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
          approvalNotifications={approvalNotifications}
          workflowNotifications={workflowNotifications}
          messagesHref={messagesHref}
          profileHref={profileHref}
          profileInitials={profileInitials}
          profileName={profileName}
          profileEmail={profileEmail}
          onLogout={onLogout}
          onMenuClick={() => setMobileSidebarOpen((current) => !current)}
        />
      )}
    >
      {children}
    </AppFrame>
  );
}
