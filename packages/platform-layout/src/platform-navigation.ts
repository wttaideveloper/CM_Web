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
      { label: "Approval Queue", href: "/approval-queue", icon: "queue", badge: "4" },
      { label: "Form Builder", href: "/onboarding-forms", icon: "forms" },
      { label: "Enterprise Types", href: "/enterprise-types", icon: "building" },
      { label: "Categories", href: "/categories", icon: "tag" },
      { label: "Sub-Admins", href: "/sub-admins", icon: "settings" },
      { label: "Attributes", href: "/attributes", icon: "tag" },
    ],
  },
  {
    title: "MARKETPLACE",
    items: [
      { label: "Enterprises", href: "/enterprises", icon: "building" },
      { label: "Products", href: "/products", icon: "package" },
      { label: "Services", href: "/services", icon: "service" },
      { label: "Events", href: "/events", icon: "calendar" },
      { label: "Trainings", href: "/trainings", icon: "training" },
      { label: "Integrations", href: "/integrations", icon: "integration" },
    ],
  },
];
