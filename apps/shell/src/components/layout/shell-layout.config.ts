import { ROUTE_PATHS, getRouteArea, isEnterpriseRoute } from "@/routing/route-ownership";

export type NavigationIcon =
  | "dashboard"
  | "building"
  | "details"
  | "package"
  | "service"
  | "calendar"
  | "training"
  | "chart"
  | "integration"
  | "tag"
  | "forms"
  | "queue"
  | "settings";

export type ShellNavigationItem = {
  label: string;
  href: string;
  icon: NavigationIcon;
  child?: boolean;
  badge?: string;
  disabled?: boolean;
  activeMatch?: "prefix" | "exact" | "never";
};

export type ShellNavigationGroup = {
  title: string;
  items: readonly ShellNavigationItem[];
};

export type HeaderMenuItem = {
  label: string;
  action?: "close" | "logout";
  href?: string;
};

export type ShellHeaderConfig = {
  homeHref: string;
  notificationsHref: string;
  messagesHref: string | null;
  profileInitials: "platform" | "authenticated-user";
  localLogoutHref: string | null;
  realtime: boolean;
  settingsItems: readonly HeaderMenuItem[];
  profileItems: readonly HeaderMenuItem[];
};

export type ShellLayoutConfig = {
  id: "platform-admin" | "enterprise-admin" | "realtime-platform" | "realtime-enterprise";
  sidebarLabel: string;
  sidebarLabelClassName: string;
  navigationGroups: readonly ShellNavigationGroup[];
  header: ShellHeaderConfig;
};

export type ShellLayoutAdapter = "auto" | "platform" | "enterprise" | "realtime";

const sharedSettingsItems: readonly HeaderMenuItem[] = [
  { label: "Account Settings" },
  { label: "Platform Preferences" },
  { label: "Billing Settings" },
  { label: "Integrations" },
];

const platformProfileItems: readonly HeaderMenuItem[] = [
  { label: "View Profile" },
  { label: "My Enterprise" },
  { label: "Help Center" },
  { label: "Logout", action: "logout" },
];

const enterpriseProfileItems: readonly HeaderMenuItem[] = [
  { label: "View Profile", href: ROUTE_PATHS.enterprise.profile },
  { label: "My Enterprise" },
  { label: "Help Center" },
  { label: "Logout", action: "logout" },
];

const platformNavigationGroups: readonly ShellNavigationGroup[] = [
  {
    title: "OVERVIEW",
    items: [
      { label: "Dashboard", href: ROUTE_PATHS.platform.dashboard, icon: "dashboard" },
    ],
  },
  {
    title: "APPROVALS & CONFIG",
    items: [
      { label: "Approval Queue", href: ROUTE_PATHS.platform.approvalQueue, icon: "queue", badge: "4" },
      { label: "Form Builder", href: ROUTE_PATHS.platform.onboardingForms, icon: "forms" },
      { label: "Enterprise Types", href: ROUTE_PATHS.platform.enterpriseTypes, icon: "building" },
      { label: "Categories", href: ROUTE_PATHS.platform.categories, icon: "tag" },
      { label: "Sub-Admins", href: ROUTE_PATHS.platform.subAdmins, icon: "settings" },
      { label: "Attributes", href: ROUTE_PATHS.platform.attributes, icon: "tag" },
    ],
  },
  {
    title: "MARKETPLACE",
    items: [
      { label: "Enterprises", href: ROUTE_PATHS.platform.enterprises, icon: "building" },
      { label: "Products", href: ROUTE_PATHS.platform.products, icon: "package" },
      { label: "Services", href: ROUTE_PATHS.platform.services, icon: "service" },
      { label: "Events", href: ROUTE_PATHS.platform.events, icon: "calendar" },
      { label: "Trainings", href: ROUTE_PATHS.platform.trainings, icon: "training" },
      { label: "Integrations", href: ROUTE_PATHS.platform.integrations, icon: "integration" },
    ],
  },
];

const enterpriseNavigationGroups: readonly ShellNavigationGroup[] = [
  {
    title: "MY ENTERPRISE",
    items: [
      { label: "Dashboard", href: ROUTE_PATHS.enterprise.dashboard, icon: "dashboard" },
      {
        label: "Enterprise Setup",
        href: ROUTE_PATHS.enterprise.enterprise,
        icon: "building",
        activeMatch: "exact",
      },
      { label: "Analytics", href: ROUTE_PATHS.enterprise.analytics, icon: "chart" },
    ],
  },
  {
    title: "MY LISTINGS",
    items: [
      { label: "My Products", href: ROUTE_PATHS.enterprise.products, icon: "package" },
      { label: "My Services", href: ROUTE_PATHS.enterprise.services, icon: "service" },
      { label: "My Events", href: ROUTE_PATHS.enterprise.events, icon: "calendar" },
      { label: "My Trainings", href: ROUTE_PATHS.enterprise.trainings, icon: "training" },
    ],
  },
  {
    title: "ACCOUNT",
    items: [
      { label: "Settings", href: ROUTE_PATHS.enterprise.settings, icon: "settings" },
      {
        label: "My Enterprise",
        href: ROUTE_PATHS.enterprise.enterprise,
        icon: "building",
        activeMatch: "never",
      },
      {
        label: "Edit Enterprise",
        href: ROUTE_PATHS.enterprise.enterpriseEdit,
        icon: "details",
        activeMatch: "exact",
      },
    ],
  },
];

const platformHeaderConfig: ShellHeaderConfig = {
  homeHref: ROUTE_PATHS.platform.dashboard,
  notificationsHref: ROUTE_PATHS.realtime.notifications,
  messagesHref: null,
  profileInitials: "platform",
  localLogoutHref: ROUTE_PATHS.public.auth.login,
  realtime: false,
  settingsItems: sharedSettingsItems,
  profileItems: platformProfileItems,
};

const enterpriseHeaderConfig: ShellHeaderConfig = {
  homeHref: ROUTE_PATHS.platform.dashboard,
  notificationsHref: ROUTE_PATHS.enterprise.notifications,
  messagesHref: ROUTE_PATHS.enterprise.messages,
  profileInitials: "authenticated-user",
  localLogoutHref: null,
  realtime: false,
  settingsItems: sharedSettingsItems,
  profileItems: enterpriseProfileItems,
};

export const platformAdminLayoutConfig: ShellLayoutConfig = {
  id: "platform-admin",
  sidebarLabel: "Super Admin",
  sidebarLabelClassName: "text-[#06201c]",
  navigationGroups: platformNavigationGroups,
  header: platformHeaderConfig,
};

export const enterpriseAdminLayoutConfig: ShellLayoutConfig = {
  id: "enterprise-admin",
  sidebarLabel: "Enterprise Owner",
  sidebarLabelClassName: "text-[#6b4fd3]",
  navigationGroups: enterpriseNavigationGroups,
  header: enterpriseHeaderConfig,
};

export const realtimePlatformLayoutConfig: ShellLayoutConfig = {
  ...platformAdminLayoutConfig,
  id: "realtime-platform",
  header: { ...platformHeaderConfig, realtime: true },
};

export const realtimeEnterpriseLayoutConfig: ShellLayoutConfig = {
  ...enterpriseAdminLayoutConfig,
  id: "realtime-enterprise",
  header: { ...enterpriseHeaderConfig, realtime: true },
};

export function resolveShellLayoutConfig(
  pathname: string,
  adapter: ShellLayoutAdapter = "auto",
): ShellLayoutConfig {
  if (adapter === "platform") {
    return platformAdminLayoutConfig;
  }

  if (adapter === "enterprise") {
    return enterpriseAdminLayoutConfig;
  }

  if (adapter === "realtime" || getRouteArea(pathname) === "realtime") {
    return isEnterpriseRoute(pathname)
      ? realtimeEnterpriseLayoutConfig
      : realtimePlatformLayoutConfig;
  }

  return isEnterpriseRoute(pathname) ? enterpriseAdminLayoutConfig : platformAdminLayoutConfig;
}
