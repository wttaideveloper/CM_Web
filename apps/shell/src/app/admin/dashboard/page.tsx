"use client";

import { EnterpriseDashboardScreen } from "@ihp/enterprise-dashboard";

import AppShell from "@/components/layout/AppShell";

export default function AdminDashboardPage() {
  return (
    <AppShell>
      <EnterpriseDashboardScreen
        routes={{
          enterpriseHref: "/admin/enterprise",
          productsHref: "/admin/products",
          servicesHref: "/admin/services",
          createProductHref: "/admin/products/create",
          createServiceHref: "/admin/services/create",
          eventsHref: "/admin/events",
          trainingsHref: "/admin/trainings",
          integrationsHref: "/integrations",
          analyticsHref: "#",
        }}
      />
    </AppShell>
  );
}
