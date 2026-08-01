export type EnterpriseNavigationIcon =
  | "dashboard"
  | "building"
  | "details"
  | "package"
  | "service"
  | "calendar"
  | "training"
  | "chart"
  | "settings";

export type EnterpriseNavigationOwner = "enterprise-admin" | "shell";

export type EnterpriseNavigationItem = {
  label: string;
  href: string;
  icon: EnterpriseNavigationIcon;
  owner: EnterpriseNavigationOwner;
  activeMatch?: "prefix" | "exact" | "never";
};

export type EnterpriseNavigationGroup = {
  title: string;
  items: readonly EnterpriseNavigationItem[];
};

export const enterpriseNavigationGroups: readonly EnterpriseNavigationGroup[] = [
  {
    title: "MY ENTERPRISE",
    items: [
      { label: "Dashboard", href: "/admin/dashboard", icon: "dashboard", owner: "enterprise-admin" },
      {
        label: "Enterprise Setup",
        href: "/admin/enterprise",
        icon: "building",
        owner: "enterprise-admin",
        activeMatch: "exact",
      },
      { label: "Analytics", href: "/admin/analytics", icon: "chart", owner: "enterprise-admin" },
    ],
  },
  {
    title: "MY LISTINGS",
    items: [
      { label: "My Products", href: "/admin/products", icon: "package", owner: "enterprise-admin" },
      { label: "My Services", href: "/admin/services", icon: "service", owner: "enterprise-admin" },
      { label: "My Events", href: "/admin/events", icon: "calendar", owner: "enterprise-admin" },
      { label: "My Trainings", href: "/admin/trainings", icon: "training", owner: "enterprise-admin" },
    ],
  },
  {
    title: "ACCOUNT",
    items: [
      { label: "Settings", href: "/admin/settings", icon: "settings", owner: "enterprise-admin" },
      {
        label: "My Enterprise",
        href: "/admin/enterprise",
        icon: "building",
        owner: "enterprise-admin",
        activeMatch: "never",
      },
      {
        label: "Edit Enterprise",
        href: "/admin/enterprise/edit",
        icon: "details",
        owner: "enterprise-admin",
        activeMatch: "exact",
      },
    ],
  },
];
