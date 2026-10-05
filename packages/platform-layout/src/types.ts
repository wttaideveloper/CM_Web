import type { ReactNode } from "react";

export type PlatformNavigationIcon =
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
  /** Pending approval counts for Platform Admins; omitted by shells using message notifications. */
  approvalNotifications?: {
    eventCount: number | null;
    trainingCount: number | null;
    approvalQueueHref: string;
  };
  messagesHref?: string | null;
  profileHref?: string;
  profileInitials?: string;
  profileName?: string | null;
  profileEmail?: string | null;
  navigationGroups?: readonly PlatformNavigationGroup[];
  resolveNavigationHref?: (item: PlatformNavigationItem) => string;
  onLogout?: () => Promise<void> | void;
  workflowNotifications?: {
    unreadCount?: number;
    unreadCountError?: unknown;
    items: readonly { id: string; title: string; message: string; notification_type: string; is_read: boolean }[];
    onRead: (id: string) => void;
    onMarkAllRead: () => void;
  };
};

export type PlatformAdminHeaderProps = Pick<
  PlatformAdminLayoutProps,
  "homeHref" | "notificationsHref" | "approvalNotifications" | "workflowNotifications" | "messagesHref" | "profileHref" | "profileInitials" | "profileName" | "profileEmail" | "onLogout"
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
