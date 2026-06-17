"use client";

import { useState } from "react";

import AppHeader from "./AppHeader";
import AppSidebar from "./AppSidebar";

type AppShellProps = {
  children: React.ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <main className="min-h-screen bg-[#f6fbf8] text-[#06201c] transition-colors dark:bg-[#06110f] dark:text-[#f5fffb]">
      <AppSidebar
        mobileOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />
      <AppHeader onMenuClick={() => setMobileSidebarOpen((current) => !current)} />
      <section className="px-5 py-5 lg:ml-[240px] lg:px-6 lg:py-6">
        {children}
      </section>
    </main>
  );
}
