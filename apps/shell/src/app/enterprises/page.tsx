"use client";

import AppShell from "@/components/layout/AppShell";
import { EnterprisesListScreen } from "@ihp/enterprises";

export default function EnterprisesPage() {
  return (
    <AppShell>
      <EnterprisesListScreen />
    </AppShell>
  );
}
