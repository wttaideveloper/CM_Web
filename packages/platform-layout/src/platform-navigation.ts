import type { PlatformNavigationGroup } from "./types";

export const COMMERCE_MANAGEMENT_NAVIGATION_TITLE = "COMMERCE MANAGEMENT";

export function isCommerceNavigationPath(currentPath: string) {
  return currentPath === "/commerce" || currentPath.startsWith("/commerce/");
}

export function isPlatformNavigationGroupExpanded(
  group: Pick<PlatformNavigationGroup, "title" | "collapsible">,
  currentPath: string,
  expandedGroups: Readonly<Record<string, boolean>>,
) {
  if (!group.collapsible) {
    return true;
  }

  if (group.title === COMMERCE_MANAGEMENT_NAVIGATION_TITLE && isCommerceNavigationPath(currentPath)) {
    return expandedGroups[group.title] !== false;
  }

  return expandedGroups[group.title] === true;
}

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
      { label: "Event Forms", href: "/form-configurations", icon: "forms" },
      { label: "Training Forms", href: "/training-form-configurations", icon: "forms" },
      { label: "Categories", href: "/categories", icon: "tag" },
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
    ],
  },
  {
    title: COMMERCE_MANAGEMENT_NAVIGATION_TITLE,
    icon: "chart",
    collapsible: true,
    items: [
      { label: "Overview", href: "/commerce", icon: "chart", activeMatch: "exact" },
      { label: "Payment Settings", href: "/commerce/payment-settings", icon: "settings" },
      { label: "Currencies & Exchange Rates", href: "/commerce/currencies", icon: "integration" },
      { label: "Tax Management", href: "/commerce/tax", icon: "tag" },
      { label: "Transactions", href: "/commerce/transactions", icon: "queue" },
      { label: "Refund Management", href: "/commerce/refunds", icon: "details" },
      { label: "Merchant Settlements", href: "/commerce/settlements", icon: "building" },
      { label: "Invoices", href: "/commerce/invoices", icon: "forms" },
      { label: "Reports & Audit", href: "/commerce/reports", icon: "chart" },
    ],
  },
];
