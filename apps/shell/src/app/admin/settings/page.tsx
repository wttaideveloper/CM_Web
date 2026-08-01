"use client";

import { EnterpriseSettingsScreen } from "@ihp/enterprise-settings";

import AppShell from "@/components/layout/AppShell";

export default function AdminSettingsPage() {
  return (
    <AppShell>
      <EnterpriseSettingsScreen />
    </AppShell>
  );
}
