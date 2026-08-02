"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { AppFrame } from "@ihp/ui";

import AppHeader, { RealtimeAppHeader } from "./AppHeader";
import AppSidebar from "./AppSidebar";
import PlatformAdminShellAdapter from "./PlatformAdminShellAdapter";
import {
  resolveShellLayoutConfig,
  type ShellLayoutAdapter,
} from "./shell-layout.config";

export type AppShellVariant = ShellLayoutAdapter;

type AppShellProps = {
  children: React.ReactNode;
  variant?: AppShellVariant;
};

export default function AppShell({ children, variant = "auto" }: AppShellProps) {
  const pathname = usePathname();
  const layout = resolveShellLayoutConfig(pathname, variant);

  if (layout.id === "platform-admin") {
    return <PlatformAdminShellAdapter currentPath={pathname}>{children}</PlatformAdminShellAdapter>;
  }

  return <ConfiguredAppShell pathname={pathname} layout={layout}>{children}</ConfiguredAppShell>;
}

function ConfiguredAppShell({
  children,
  pathname,
  layout,
}: {
  children: React.ReactNode;
  pathname: string;
  layout: ReturnType<typeof resolveShellLayoutConfig>;
}) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const Header = layout.header.realtime ? RealtimeAppHeader : AppHeader;

  return (
    <AppFrame
      sidebar={(
        <AppSidebar
          layout={layout}
          pathname={pathname}
          mobileOpen={mobileSidebarOpen}
          onClose={() => setMobileSidebarOpen(false)}
        />
      )}
      header={<Header header={layout.header} onMenuClick={() => setMobileSidebarOpen((current) => !current)} />}
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
