import type { ReactNode } from "react";

export type PlatformNavigationIcon =
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

export type PlatformNavigationItem = {
  label: string;
  href: string;
  icon: PlatformNavigationIcon;
  child?: boolean;
  badge?: string;
  disabled?: boolean;
  activeMatch?: "prefix" | "exact" | "never";
};

export type PlatformNavigationGroup = {
  title: string;
  items: readonly PlatformNavigationItem[];
};

export type PlatformAdminLayoutProps = {
  children: ReactNode;
  currentPath: string;
  homeHref: string;
  notificationsHref: string;
  messagesHref?: string | null;
  profileHref?: string;
  profileInitials?: string;
  navigationGroups?: readonly PlatformNavigationGroup[];
  resolveNavigationHref?: (item: PlatformNavigationItem) => string;
  onLogout?: () => Promise<void> | void;
};

export type PlatformAdminHeaderProps = Pick<
  PlatformAdminLayoutProps,
  "homeHref" | "notificationsHref" | "messagesHref" | "profileHref" | "profileInitials" | "onLogout"
> & {
  onMenuClick: () => void;
};

export type PlatformAdminSidebarProps = {
  currentPath: string;
  navigationGroups: readonly PlatformNavigationGroup[];
  resolveNavigationHref: (item: PlatformNavigationItem) => string;
  mobileOpen: boolean;
  onClose: () => void;
};
