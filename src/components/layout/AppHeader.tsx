"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type OpenMenu = "notifications" | "settings" | "profile" | null;

const notificationItems = [
  {
    title: "Pending Approval",
    subtitle: "MindFlow Center is awaiting verification",
  },
  {
    title: "Stripe Webhook Failed",
    subtitle: "Pinnacle Wellness - check integration config",
  },
  {
    title: "New 5-Star Review",
    subtitle: "FlexFit Academy received a 5-star product review",
  },
];

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

type AppHeaderProps = {
  onMenuClick: () => void;
};

export default function AppHeader({ onMenuClick }: AppHeaderProps) {
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const headerRef = useRef<HTMLElement | null>(null);

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

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-[#e3eee9] bg-white/95 px-6 backdrop-blur transition-colors lg:px-8 dark:border-[#21463c] dark:bg-[#071713]/95"
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onMenuClick}
          className="flex h-9 w-9 items-center justify-center rounded-full text-[#52736a] hover:bg-[#f1f7f4] lg:hidden dark:text-[#bdd2cb] dark:hover:bg-[#103329]"
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
          <h1 className="text-lg font-bold text-[#07352d] dark:text-[#f8fffc]">Invigorate Health</h1>
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            type="button"
            onClick={() => toggleMenu("notifications")}
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#52736a] hover:bg-[#f1f7f4] dark:text-[#bdd2cb] dark:hover:bg-[#103329]"
            aria-label="Notifications"
            aria-expanded={openMenu === "notifications"}
          >
            <BellIcon />
          </button>

          <div
            className={`fixed left-3 right-3 top-[76px] z-50 max-h-[70vh] w-auto max-w-none origin-top overflow-y-auto rounded-2xl border border-[#e1ebe6] bg-white p-2 shadow-[0_18px_30px_rgba(7,53,45,0.12)] transition duration-150 sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:w-[360px] sm:max-w-sm sm:origin-top-right sm:p-3 dark:border-[#21463c] dark:bg-[#0b211b] ${
              openMenu === "notifications"
                ? "pointer-events-auto scale-100 opacity-100"
                : "pointer-events-none scale-95 opacity-0"
            }`}
          >
            <div className="flex items-center justify-between border-b border-[#edf3f0] px-2 pb-3 dark:border-[#21463c]">
              <div>
                <p className="text-sm font-bold text-[#06201c] dark:text-[#f8fffc]">Notifications</p>
                <p className="text-xs font-semibold text-[#7f9d94] dark:text-[#a7c3ba]">3 unread</p>
              </div>
              <span className="rounded-full bg-[#e8f6ee] px-2.5 py-1 text-[11px] font-bold text-[#16825b]">
                3 unread
              </span>
            </div>

            <div className="space-y-1 py-2">
              {notificationItems.map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl px-2 py-2 transition hover:bg-[#f7fbf9] dark:hover:bg-[#103329]"
                >
                  <p className="text-sm font-bold text-[#06201c] dark:text-[#f8fffc]">{item.title}</p>
                  <p className="mt-0.5 text-xs leading-5 text-[#52736a] dark:text-[#a7c3ba]">{item.subtitle}</p>
                </div>
              ))}
            </div>

            <Link
              href="/notifications"
              onClick={closeMenu}
              className="mt-1 flex items-center justify-between rounded-xl bg-[#f7fbf9] px-3 py-2 text-sm font-semibold text-[#1f6a58] transition hover:bg-[#eef7f2] dark:bg-[#103329] dark:text-[#f8fffc] dark:hover:bg-[#12352d]"
            >
              <span>View all notifications</span>
              <ChevronRightIcon />
            </Link>
          </div>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => toggleMenu("settings")}
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#52736a] hover:bg-[#f1f7f4] dark:text-[#bdd2cb] dark:hover:bg-[#103329]"
            aria-label="Settings"
            aria-expanded={openMenu === "settings"}
          >
            <SettingsIcon />
          </button>

          <div
            className={`absolute right-0 top-[calc(100%+10px)] w-64 origin-top-right rounded-2xl border border-[#e1ebe6] bg-white p-2 shadow-[0_18px_30px_rgba(7,53,45,0.12)] transition duration-150 dark:border-[#21463c] dark:bg-[#0b211b] ${
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
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium text-[#06201c] hover:bg-[#f7fbf9] dark:text-[#f8fffc] dark:hover:bg-[#103329]"
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
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1f6a58] text-sm font-bold text-white"
            aria-label="Profile"
            aria-expanded={openMenu === "profile"}
          >
            SJ
          </button>

          <div
            className={`absolute right-0 top-[calc(100%+10px)] w-64 origin-top-right rounded-2xl border border-[#e1ebe6] bg-white p-3 shadow-[0_18px_30px_rgba(7,53,45,0.12)] transition duration-150 dark:border-[#21463c] dark:bg-[#0b211b] ${
              openMenu === "profile"
                ? "pointer-events-auto scale-100 opacity-100"
                : "pointer-events-none scale-95 opacity-0"
            }`}
          >
            <div className="border-b border-[#edf3f0] px-2 pb-3 dark:border-[#21463c]">
              <p className="text-sm font-bold text-[#06201c] dark:text-[#f8fffc]">Sarah Johnson</p>
              <p className="mt-0.5 text-xs text-[#52736a] dark:text-[#a7c3ba]">sarah@invigorate.com</p>
            </div>
            <div className="py-2">
              {profileItems.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={closeMenu}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium text-[#06201c] hover:bg-[#f7fbf9] dark:text-[#f8fffc] dark:hover:bg-[#103329]"
                >
                  <span>{item}</span>
                  <ChevronRightIcon />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
