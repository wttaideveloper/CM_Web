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
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

type AppSidebarProps = {
  mobileOpen: boolean;
  onClose: () => void;
};

function LoginIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path d="M10 17l5-5-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 12H3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 4h6a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

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

function PlusCircleIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
      <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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

const superAdminNavGroups: NavGroup[] = [
  {
    title: "AUTH",
    items: [{ label: "Login", href: "/auth/login", icon: <LoginIcon /> }],
  },
  {
    title: "WEB PORTAL",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: <DashboardIcon /> },
      { label: "Enterprises", href: "/enterprises", icon: <BuildingIcon /> },
      { label: "Create Enterprise", href: "/enterprises/create", icon: <PlusCircleIcon />, child: true },
      { label: "Enterprise Details", href: "/enterprises", icon: <DetailsIcon />, child: true },
      { label: "Products", href: "/products", icon: <PackageIcon /> },
      { label: "Create Product", href: "/products/create", icon: <PlusCircleIcon />, child: true },
      { label: "Services", href: "/services", icon: <ServiceIcon /> },
      { label: "Create Service", href: "/services/create", icon: <PlusCircleIcon />, child: true },
      { label: "Events", href: "/events", icon: <CalendarIcon /> },
      { label: "Trainings", href: "/trainings", icon: <TrainingIcon /> },
      { label: "Integrations", href: "/integrations", icon: <IntegrationIcon /> },
      { label: "Attributes", href: "/attributes", icon: <TagIcon /> },
    ],
  },
];

const adminNavGroups: NavGroup[] = [
  {
    title: "ADMIN PORTAL",
    items: [
      { label: "Dashboard", href: "/admin/dashboard", icon: <DashboardIcon /> },
      { label: "My Enterprise", href: "/admin/enterprise", icon: <BuildingIcon /> },
      { label: "Edit Enterprise", href: "/admin/enterprise/edit", icon: <DetailsIcon />, child: true },
      { label: "Products", href: "/admin/products", icon: <PackageIcon /> },
      { label: "Create Product", href: "/admin/products/create", icon: <PlusCircleIcon />, child: true },
      { label: "Services", href: "/admin/services", icon: <ServiceIcon /> },
      { label: "Create Service", href: "/admin/services/create", icon: <PlusCircleIcon />, child: true },
      { label: "Events", href: "/admin/events", icon: <CalendarIcon /> },
      { label: "Trainings", href: "/admin/trainings", icon: <TrainingIcon /> },
    ],
  },
];

function isActive(pathname: string, href: string) {
  return pathname === href;
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
    <nav className="h-auto overflow-visible px-3 py-4 pb-8">
      <div className="space-y-6">
        {navGroups.map((group) => (
          <div key={group.title}>
            <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.22em] text-[#8ca69e]">
              {group.title}
            </p>

            <div className="space-y-1">
              {group.items.map((item) => {
                const resolvedHref =
                  !pathname.startsWith("/admin") && item.label === "Enterprise Details"
                    ? "/enterprises"
                    : item.href;
                const active = isActive(pathname, resolvedHref);

                return (
                  <Link
                    key={`${item.label}-${resolvedHref}`}
                    href={resolvedHref}
                    onClick={onNavigate}
                    className={`flex items-center gap-3 rounded-xl py-2 text-sm font-medium transition ${
                      item.child ? "ml-5 px-3" : "px-3"
                    } ${
                      active
                        ? "bg-[#e9f4ee] font-bold text-[#0f5d4a]"
                        : "text-[#4f6f67] hover:bg-[#f4faf7] hover:text-[#0f5d4a]"
                    }`}
                  >
                    <span className="flex w-4 shrink-0 items-center justify-center text-current">
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
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
      <aside className="fixed left-0 top-[72px] hidden h-[calc(100vh-72px)] w-[240px] border-r border-[#e3eee9] bg-white transition-colors lg:block">
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
          className={`absolute left-0 top-[72px] flex max-h-[calc(100vh-72px)] w-[280px] max-w-[86vw] flex-col overflow-y-auto border-r border-[#e3eee9] bg-white shadow-[0_20px_40px_rgba(7,53,45,0.18)] transition-transform duration-200 ${
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
