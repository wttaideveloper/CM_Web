"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { useAdminSocket } from "@/contexts/AdminSocketContext";
import { useAuth } from "@/contexts/AuthContext";
import { updatePresenceStatus } from "@/services/chat.service";
import { clearMarketplaceDemoSession } from "@/services/marketplace-demo-auth.service";

type OpenMenu = "notifications" | "settings" | "profile" | null;

type NotificationLike = {
  id: string;
  notification_type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string | null;
};

const settingsItems = [
  "Account Settings",
  "Platform Preferences",
  "Billing Settings",
  "Integrations",
];

const profileItems = ["View Profile", "My Enterprise", "Help Center", "Logout"];

function BellIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
      <path
        d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
      <path
        d="M7 18.5 4 21V7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H7Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M8.5 10h7M8.5 13h4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="2" />
      <path
        d="M19 13.5a7.8 7.8 0 0 0 0-3l2-1.5-2-3.4-2.4 1a8.5 8.5 0 0 0-2.6-1.5L13.7 2h-3.4L10 5.1a8.5 8.5 0 0 0-2.6 1.5l-2.4-1-2 3.4 2 1.5a7.8 7.8 0 0 0 0 3L3 15l2 3.4 2.4-1a8.5 8.5 0 0 0 2.6 1.5l.3 3.1h3.4l.3-3.1a8.5 8.5 0 0 0 2.6-1.5l2.4 1 2-3.4-2-1.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function getNotificationConversationId(notification: NotificationLike): string | null {
  const candidate = notification.data.conversation_id ?? notification.data.conversationId;

  return typeof candidate === "string" && candidate.trim().length > 0 ? candidate.trim() : null;
}

function formatNotificationTime(value: string | null) {
  if (!value) {
    return "Just now";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Just now";
  }

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function clampBadge(value: number) {
  if (value <= 0) {
    return null;
  }

  return value > 99 ? "99+" : String(value);
}

function getInitials(name: string | undefined, email: string | undefined) {
  const initials = (name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return initials || email?.trim().slice(0, 2).toUpperCase() || "IH";
}

type AppHeaderProps = {
  onMenuClick: () => void;
};

export default function AppHeader({ onMenuClick }: AppHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const headerRef = useRef<HTMLElement | null>(null);
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const isAdminRoute = pathname.startsWith("/admin");
  const notificationsRoute = isAdminRoute ? "/admin/notifications" : "/notifications";
  const messagesRoute = isAdminRoute ? "/admin/messages" : null;
  const {
    notifications,
    unreadNotificationCount,
    unreadMessageCount,
    isLoadingNotifications,
    notificationError,
    notificationPagination,
    loadMoreNotifications,
    markAllNotificationsAsRead,
    markNotificationAsRead,
  } = useAdminSocket();

  const visibleNotifications = useMemo(() => notifications.slice(0, 6), [notifications]);
  const unreadNotificationBadge = clampBadge(unreadNotificationCount);
  const unreadMessageBadge = clampBadge(unreadMessageCount);
  const hasMoreNotifications =
    notificationPagination !== null &&
    notificationPagination.page < notificationPagination.total_pages;

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenMenu(null);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const toggleMenu = (menu: OpenMenu) => {
    setOpenMenu((current) => (current === menu ? null : menu));
  };

  const closeMenu = () => setOpenMenu(null);

  const handleProfileItemClick = async (item: string) => {
    if (item === "View Profile" && isAdminRoute) {
      closeMenu();
      router.push("/admin/profile");
      return;
    }

    if (item === "Logout") {
      closeMenu();
      try {
        await updatePresenceStatus("offline");
      } catch {
        // Logout must continue even if presence update fails.
      }

      clearMarketplaceDemoSession();

      if (!isAdminRoute) {
        router.replace("/auth/login");
        return;
      }

      try {
        await logout();
      } catch {
        // The browser still leaves the protected UI if Web Auth logout fails.
      } finally {
        window.location.assign("/auth/login");
      }
      return;
    }

    closeMenu();
  };

  const handleNotificationClick = (notification: NotificationLike) => {
    closeMenu();
    void markNotificationAsRead(notification.id).catch(() => undefined);

    const conversationId = getNotificationConversationId(notification);
    if (!conversationId || !messagesRoute) {
      return;
    }

    router.push(`${messagesRoute}?conversationId=${encodeURIComponent(conversationId)}`);
  };

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-[#e3eee9] bg-white/95 px-6 backdrop-blur transition-colors lg:px-8"
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onMenuClick}
          className="flex h-9 w-9 items-center justify-center rounded-full text-[#52736a] hover:bg-[#f1f7f4] lg:hidden"
          aria-label="Open menu"
        >
          <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        <Link href="/dashboard" className="flex items-center gap-3 transition-opacity hover:opacity-90">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1f6a58] text-white">
            <svg
              aria-hidden="true"
              className="h-6 w-6"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M25 7C15.2 7.9 8.3 13.6 7.6 23.7C15.7 24.2 23.1 18.8 25 7Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M8.5 22.8C12 19.4 15.4 17.5 20 16.6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-[#07352d]">Invigorate Health</h1>
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            type="button"
            onClick={() => toggleMenu("notifications")}
            className="relative flex h-9 w-9 items-center justify-center rounded-full text-[#52736a] hover:bg-[#f1f7f4]"
            aria-label="Notifications"
            aria-expanded={openMenu === "notifications"}
          >
            <BellIcon />
            {unreadNotificationBadge ? (
              <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-[#d92d20] px-1 text-[10px] font-bold leading-4 text-white">
                {unreadNotificationBadge}
              </span>
            ) : null}
          </button>

          <div
            className={`fixed left-3 right-3 top-[76px] z-50 max-h-[70vh] w-auto max-w-none origin-top overflow-y-auto rounded-2xl border border-[#e1ebe6] bg-white p-2 shadow-[0_18px_30px_rgba(7,53,45,0.12)] transition duration-150 sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:w-[360px] sm:max-w-sm sm:origin-top-right sm:p-3 ${
              openMenu === "notifications"
                ? "pointer-events-auto scale-100 opacity-100"
                : "pointer-events-none scale-95 opacity-0"
            }`}
          >
            <div className="flex items-center justify-between border-b border-[#edf3f0] px-2 pb-3">
              <div>
                <p className="text-sm font-bold text-[#06201c]">Notifications</p>
                <p className="text-xs font-semibold text-[#7f9d94]">
                  {unreadNotificationCount} unread
                </p>
              </div>
              <div className="flex items-center gap-2">
                {unreadNotificationCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      closeMenu();
                      void markAllNotificationsAsRead().catch(() => undefined);
                    }}
                    className="rounded-full bg-[#eef7f2] px-2.5 py-1 text-[11px] font-bold text-[#1f6a58] transition hover:bg-[#e2f2ea]"
                  >
                    Mark all read
                  </button>
                ) : null}
                <span className="rounded-full bg-[#e8f6ee] px-2.5 py-1 text-[11px] font-bold text-[#16825b]">
                  {unreadNotificationCount} unread
                </span>
              </div>
            </div>

            <div className="space-y-1 py-2">
              {isLoadingNotifications ? (
                <div className="rounded-xl px-3 py-4 text-sm text-[#52736a]">Loading notifications...</div>
              ) : notificationError ? (
                <div className="rounded-xl bg-[#fff6f6] px-3 py-4 text-sm text-[#b42318]">
                  {notificationError}
                </div>
              ) : visibleNotifications.length > 0 ? (
                visibleNotifications.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNotificationClick(item)}
                    className={`flex w-full gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-[#f7fbf9] ${
                      item.is_read ? "opacity-80" : ""
                    }`}
                  >
                    <span
                      className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${
                        item.is_read ? "bg-[#d0dbd7]" : "bg-[#1f6a58]"
                      }`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className="min-w-0">
                          <span className="block text-sm font-bold text-[#06201c]">{item.title}</span>
                          <span className="mt-0.5 block text-xs leading-5 text-[#52736a]">
                            {item.body}
                          </span>
                        </span>
                        <span className="shrink-0 text-[11px] font-semibold text-[#7f9d94]">
                          {formatNotificationTime(item.created_at)}
                        </span>
                      </span>
                    </span>
                  </button>
                ))
              ) : (
                <div className="rounded-xl px-3 py-4 text-sm text-[#52736a]">No notifications yet.</div>
              )}
            </div>

            {hasMoreNotifications ? (
              <button
                type="button"
                onClick={() => {
                  void loadMoreNotifications().catch(() => undefined);
                }}
                className="mt-1 flex w-full items-center justify-between rounded-xl bg-[#f7fbf9] px-3 py-2 text-sm font-semibold text-[#1f6a58] transition hover:bg-[#eef7f2]"
              >
                <span>Load more</span>
                <ChevronRightIcon />
              </button>
            ) : null}

            <Link
              href={notificationsRoute}
              onClick={closeMenu}
              className="mt-1 flex items-center justify-between rounded-xl bg-[#f7fbf9] px-3 py-2 text-sm font-semibold text-[#1f6a58] transition hover:bg-[#eef7f2]"
            >
              <span>View all notifications</span>
              <ChevronRightIcon />
            </Link>
          </div>
        </div>

        {messagesRoute ? (
          <Link
            href={messagesRoute}
            className="relative flex h-9 w-9 items-center justify-center rounded-full text-[#52736a] hover:bg-[#f1f7f4]"
            aria-label="Messages"
            title="Messages"
          >
            <MessageIcon />
            {unreadMessageBadge ? (
              <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-[#d92d20] px-1 text-[10px] font-bold leading-4 text-white">
                {unreadMessageBadge}
              </span>
            ) : null}
          </Link>
        ) : null}

        <div className="relative">
          <button
            type="button"
            onClick={() => toggleMenu("settings")}
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#52736a] hover:bg-[#f1f7f4]"
            aria-label="Settings"
            aria-expanded={openMenu === "settings"}
          >
            <SettingsIcon />
          </button>

          <div
            className={`absolute right-0 top-[calc(100%+10px)] w-64 origin-top-right rounded-2xl border border-[#e1ebe6] bg-white p-2 shadow-[0_18px_30px_rgba(7,53,45,0.12)] transition duration-150 ${
              openMenu === "settings"
                ? "pointer-events-auto scale-100 opacity-100"
                : "pointer-events-none scale-95 opacity-0"
            }`}
          >
            {settingsItems.map((item) => (
              <button
                key={item}
                type="button"
                onClick={closeMenu}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium text-[#06201c] hover:bg-[#f7fbf9]"
              >
                <span>{item}</span>
                <ChevronRightIcon />
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => toggleMenu("profile")}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e8f6ee] font-bold text-[#1f6a58] hover:bg-[#def0e7]"
            aria-label="Profile"
            aria-expanded={openMenu === "profile"}
          >
            {isAdminRoute ? getInitials(user?.fullName, user?.email) : "IH"}
          </button>

          <div
            className={`absolute right-0 top-[calc(100%+10px)] w-60 origin-top-right rounded-2xl border border-[#e1ebe6] bg-white p-2 shadow-[0_18px_30px_rgba(7,53,45,0.12)] transition duration-150 ${
              openMenu === "profile"
                ? "pointer-events-auto scale-100 opacity-100"
                : "pointer-events-none scale-95 opacity-0"
            }`}
          >
            {profileItems.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => void handleProfileItemClick(item)}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium text-[#06201c] hover:bg-[#f7fbf9]"
              >
                <span>{item}</span>
                <ChevronRightIcon />
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
