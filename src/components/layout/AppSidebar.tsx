"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect } from "react";

type NavItem = {
  label: string;
  href: string;
  icon: ReactNode;
  child?: boolean;
  badge?: string;
  disabled?: boolean;
  activeMatch?: "prefix" | "exact" | "never";
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

type AppSidebarProps = {
  mobileOpen: boolean;
  onClose: () => void;
};

function DashboardIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path d="M4 4h7v7H4V4Zm9 0h7v5h-7V4ZM4 13h5v7H4v-7Zm7 0h9v7h-9v-7Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path d="M4 20V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v15M14 8h5a1 1 0 0 1 1 1v11M8 8h.01M8 12h.01M8 16h.01M11 8h.01M11 12h.01M11 16h.01M17 12h.01M17 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DetailsIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  );
}

function PackageIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5v-9ZM12 3v18M3 7.5l9 4.5 9-4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ServiceIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path d="M14 7 7 14M6 8l2-2a2.8 2.8 0 1 1 4 4l-2 2M12 14l2-2a2.8 2.8 0 1 1 4 4l-2 2M5 19l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path d="M7 3v4M17 3v4M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrainingIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path d="M2 9.5 12 4l10 5.5-10 5.5L2 9.5ZM6 11.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path d="M4 19.5h16M7 16v-4M12 16V8M17 16v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IntegrationIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path d="M8 7v4m8-4v4M6 11h12M10 11v4a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path d="M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9-9-9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="8.5" cy="8.5" r="1" fill="currentColor" />
    </svg>
  );
}

function FormsIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path d="M5 4.5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-13a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M8 9h8M8 13h8M8 17h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 6.5h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function QueueIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path
        d="M5 7h14M5 12h14M5 17h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="8" cy="7" r="1.25" fill="currentColor" />
      <circle cx="14" cy="12" r="1.25" fill="currentColor" />
      <circle cx="10" cy="17" r="1.25" fill="currentColor" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 8.2A3.8 3.8 0 1 0 12 15.8 3.8 3.8 0 0 0 12 8.2Zm7.4 3.8a7.1 7.1 0 0 0-.1-1l2-1.5-2-3.4-2.4.8a7.2 7.2 0 0 0-1.7-1L15.1 3h-4.2l-.9 2.9a7.2 7.2 0 0 0-1.7 1l-2.4-.8-2 3.4 2 1.5a7.1 7.1 0 0 0 0 2l-2 1.5 2 3.4 2.4-.8a7.2 7.2 0 0 0 1.7 1l.9 2.9h4.2l.9-2.9a7.2 7.2 0 0 0 1.7-1l2.4.8 2-3.4-2-1.5c.1-.3.1-.7.1-1Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const superAdminNavGroups: NavGroup[] = [
  {
    title: "OVERVIEW",
    items: [{ label: "Dashboard", href: "/dashboard", icon: <DashboardIcon /> }],
  },
  {
    title: "APPROVALS & CONFIG",
    items: [
      { label: "Approval Queue", href: "/approval-queue", icon: <QueueIcon />, badge: "4" },
      { label: "Form Builder", href: "/onboarding-forms", icon: <FormsIcon /> },
      { label: "Enterprise Types", href: "/enterprise-types", icon: <BuildingIcon /> },
      { label: "Categories", href: "/categories", icon: <TagIcon /> },
      { label: "Sub-Admins", href: "/sub-admins", icon: <SettingsIcon /> },
      { label: "Attributes", href: "/attributes", icon: <TagIcon /> },
    ],
  },
  {
    title: "MARKETPLACE",
    items: [
      { label: "Enterprises", href: "/enterprises", icon: <BuildingIcon /> },
      { label: "Products", href: "/products", icon: <PackageIcon /> },
      { label: "Services", href: "/services", icon: <ServiceIcon /> },
      { label: "Events", href: "/events", icon: <CalendarIcon /> },
      { label: "Trainings", href: "/trainings", icon: <TrainingIcon /> },
      { label: "Integrations", href: "/integrations", icon: <IntegrationIcon /> },
    ],
  },
];

const adminNavGroups: NavGroup[] = [
  {
    title: "MY ENTERPRISE",
    items: [
      { label: "Dashboard", href: "/admin/dashboard", icon: <DashboardIcon /> },
      { label: "Enterprise Setup", href: "/admin/enterprise", icon: <BuildingIcon />, activeMatch: "exact" },
      { label: "Analytics", href: "/admin/analytics", icon: <ChartIcon /> },
    ],
  },
  {
    title: "MY LISTINGS",
    items: [
      { label: "My Products", href: "/admin/products", icon: <PackageIcon /> },
      { label: "My Services", href: "/admin/services", icon: <ServiceIcon /> },
      { label: "My Events", href: "/admin/events", icon: <CalendarIcon /> },
      { label: "My Trainings", href: "/admin/trainings", icon: <TrainingIcon /> },
    ],
  },
  {
    title: "ACCOUNT",
    items: [
      { label: "Settings", href: "/admin/settings", icon: <SettingsIcon /> },
      { label: "My Enterprise", href: "/admin/enterprise", icon: <BuildingIcon />, activeMatch: "never" },
      { label: "Edit Enterprise", href: "/admin/enterprise/edit", icon: <DetailsIcon />, activeMatch: "exact" },
    ],
  },
];

function isActive(pathname: string, item: NavItem) {
  if (item.disabled) {
    return false;
  }

  if (item.href === "#") {
    return false;
  }

  if (item.activeMatch === "never") {
    return false;
  }

  if (item.activeMatch === "exact") {
    return pathname === item.href;
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function SidebarContent({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  const navGroups = pathname.startsWith("/admin") ? adminNavGroups : superAdminNavGroups;

  return (
    <nav className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 pb-6">
      <div className="space-y-6">
        {!pathname.startsWith("/admin") ? (
          <div className="px-3 pt-1">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#06201c]">
              Super Admin
            </p>
          </div>
        ) : (
          <div className="px-3 pt-1">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#6b4fd3]">
              Enterprise Owner
            </p>
          </div>
        )}
        {navGroups.map((group) => (
          <div key={group.title}>
            <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.22em] text-[#8ca69e]">
              {group.title}
            </p>

            <div className="space-y-1">
              {group.items.map((item) => {
                const active = isActive(pathname, item);
                const isPlaceholder = item.disabled || item.href === "#";

                return (
                  <Link
                    key={`${item.label}-${item.href}`}
                    href={isPlaceholder ? "#" : item.href}
                    aria-disabled={isPlaceholder}
                    tabIndex={isPlaceholder ? -1 : 0}
                    onClick={(event) => {
                      if (isPlaceholder) {
                        event.preventDefault();
                        return;
                      }
                      onNavigate?.();
                    }}
                    className={`flex items-center gap-3 rounded-xl py-2 text-sm font-medium transition ${
                      item.child ? "ml-5 px-3" : "px-3"
                    } ${
                      isPlaceholder
                        ? "cursor-default text-[#9eb0a9] opacity-80"
                        : active
                          ? "bg-[#e9f4ee] font-bold text-[#0f5d4a]"
                          : "text-[#4f6f67] hover:bg-[#f4faf7] hover:text-[#0f5d4a]"
                    }`}
                  >
                    <span className="flex w-4 shrink-0 items-center justify-center text-current">
                      {item.icon}
                    </span>
                    <span className="flex min-w-0 flex-1 items-center gap-2">
                      <span>{item.label}</span>
                      {item.badge ? (
                        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#f59e0b] px-1.5 text-[10px] font-bold text-white">
                          {item.badge}
                        </span>
                      ) : null}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </nav>
  );
}

export default function AppSidebar({ mobileOpen, onClose }: AppSidebarProps) {
  const pathname = usePathname();

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <>
      <aside className="fixed left-0 top-[72px] hidden h-[calc(100vh-72px)] w-[240px] flex-col overflow-hidden border-r border-[#e3eee9] bg-white transition-colors lg:flex">
        <SidebarContent pathname={pathname} />
      </aside>

      <div
        className={`fixed inset-0 z-40 lg:hidden ${mobileOpen ? "pointer-events-auto" : "pointer-events-none"}`}
        aria-hidden={!mobileOpen}
      >
        <button
          type="button"
          aria-label="Close sidebar backdrop"
          onClick={onClose}
          className={`absolute inset-0 top-[72px] bg-slate-900/45 backdrop-blur-sm transition-opacity ${
            mobileOpen ? "opacity-100" : "opacity-0"
          }`}
        />

        <aside
          className={`absolute left-0 top-[72px] flex h-[calc(100vh-72px)] w-[280px] max-w-[86vw] flex-col overflow-hidden border-r border-[#e3eee9] bg-white shadow-[0_20px_40px_rgba(7,53,45,0.18)] transition-transform duration-200 ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-[#edf3f0] px-4 py-4">
            <p className="text-sm font-bold text-[#06201c]">Menu</p>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full text-[#52736a] hover:bg-[#f4faf7]"
              aria-label="Close sidebar"
            >
              <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <SidebarContent pathname={pathname} onNavigate={onClose} />
        </aside>
      </div>
    </>
  );
}
