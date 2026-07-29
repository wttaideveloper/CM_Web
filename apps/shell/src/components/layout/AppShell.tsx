"use client";

import { useState } from "react";
import { AppFrame } from "@ihp/ui";

import AppHeader from "./AppHeader";
import AppSidebar from "./AppSidebar";

type AppShellProps = {
  children: React.ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <AppFrame
      sidebar={(
        <AppSidebar
        mobileOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        />
      )}
      header={<AppHeader onMenuClick={() => setMobileSidebarOpen((current) => !current)} />}
    >
      {children}
    </AppFrame>
  );
}
