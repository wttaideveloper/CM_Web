"use client";

import { useState } from "react";
import { AppFrame } from "@ihp/ui";

import AppHeader, { RealtimeAppHeader } from "./AppHeader";
import AppSidebar from "./AppSidebar";

export type AppShellVariant = "platform" | "enterprise" | "realtime";

type AppShellProps = {
  children: React.ReactNode;
  variant?: AppShellVariant;
};

export default function AppShell({ children, variant = "platform" }: AppShellProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const Header = variant === "realtime" ? RealtimeAppHeader : AppHeader;

  return (
    <AppFrame
      sidebar={(
        <AppSidebar
        mobileOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        />
      )}
      header={<Header onMenuClick={() => setMobileSidebarOpen((current) => !current)} />}
    >
      {children}
    </AppFrame>
  );
}

export function PlatformAdminShell({ children }: { children: React.ReactNode }) {
  return <AppShell variant="platform">{children}</AppShell>;
}

export function EnterpriseAdminShell({ children }: { children: React.ReactNode }) {
  return <AppShell variant="enterprise">{children}</AppShell>;
}

export function RealtimeCompatibilityShell({ children }: { children: React.ReactNode }) {
  return <AppShell variant="realtime">{children}</AppShell>;
}
