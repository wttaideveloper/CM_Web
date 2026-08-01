import { EnterpriseDashboardScreen } from "@ihp/enterprise-dashboard";

import { getShellRoute } from "@/lib/shell-route";

export default function EnterpriseDashboardPage() {
  return (
    <EnterpriseDashboardScreen
      routes={{
        enterpriseHref: "/admin/enterprise",
        productsHref: "/admin/products",
        servicesHref: "/admin/services",
        createProductHref: "/admin/products/create",
        createServiceHref: "/admin/services/create",
        eventsHref: "/admin/events",
        trainingsHref: "/admin/trainings",
        integrationsHref: getShellRoute("/integrations"),
        analyticsHref: "#",
      }}
    />
  );
}
