import { ROUTE_PATHS, getRouteArea, isEnterpriseRoute } from "@/routing/route-ownership";
import { enterpriseNavigationGroups as sharedEnterpriseNavigationGroups } from "@ihp/enterprise-layout";
import { platformNavigationGroups } from "@ihp/platform-layout";

export type NavigationIcon =
  | "dashboard"
  | "building"
  | "details"
  | "package"
  | "service"
  | "calendar"
  | "training"
  | "program"
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

const enterpriseNavigationGroups: readonly ShellNavigationGroup[] = sharedEnterpriseNavigationGroups;

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
