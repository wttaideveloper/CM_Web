import type { PlatformNavigationGroup } from "./types";

export const platformNavigationGroups: readonly PlatformNavigationGroup[] = [
  {
    title: "OVERVIEW",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: "dashboard" },
    ],
  },
  {
    title: "APPROVALS & CONFIG",
    items: [
      { label: "Approval Queue", href: "/approval-queue", icon: "queue" },
      { label: "Tenant Applications", href: "/tenant-applications", icon: "building" },
      { label: "Form Configurations", href: "/form-configurations", icon: "forms" },
      { label: "Training Forms", href: "/training-form-configurations", icon: "forms" },
      { label: "Categories", href: "/categories", icon: "tag" },
      { label: "Attributes", href: "/attributes", icon: "tag" },
    ],
  },
  {
    title: "MARKETPLACE",
    items: [
      { label: "Enterprises / Tenants", href: "/enterprises", icon: "building" },
      { label: "Users", href: "/users", icon: "settings" },
      { label: "Super Admins", href: "/super-admins", icon: "settings" },
      { label: "Products", href: "/products", icon: "package" },
      { label: "Services", href: "/services", icon: "service" },
      { label: "Events", href: "/events", icon: "calendar" },
      { label: "Trainings", href: "/trainings", icon: "training" },
      { label: "Integrations", href: "/integrations", icon: "integration" },
    ],
  },
];
