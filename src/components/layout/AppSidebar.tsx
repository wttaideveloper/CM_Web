"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

type NavItem = {
  label: string;
  href: string;
  icon: string;
  child?: boolean;
};

type AppSidebarProps = {
  mobileOpen: boolean;
  onClose: () => void;
};

const navGroups: { title: string; items: NavItem[] }[] = [
  {
    title: "AUTH",
    items: [{ label: "Login", href: "/auth/login", icon: "↪" }],
  },
  {
    title: "WEB PORTAL",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: "▦" },
      { label: "Enterprises", href: "/enterprises", icon: "▤" },
      { label: "Create Enterprise", href: "/enterprises/create", icon: "+", child: true },
      { label: "Enterprise Details", href: "/enterprises", icon: "◉", child: true },
      { label: "Products", href: "/products", icon: "◇" },
      { label: "Create Product", href: "/products/create", icon: "+", child: true },
      { label: "Services", href: "/services", icon: "⚒" },
      { label: "Create Service", href: "/services/create", icon: "+", child: true },
      { label: "Events", href: "/events", icon: "▣" },
      { label: "Trainings", href: "/trainings", icon: "⌂" },
      { label: "Integrations", href: "/integrations", icon: "♙" },
      { label: "Attributes", href: "/attributes", icon: "◇" },
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
  return (
    <nav className="h-auto overflow-visible px-3 py-4 pb-8">
      <div className="space-y-6">
        {navGroups.map((group) => (
          <div key={group.title}>
            <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.22em] text-[#8ca69e] dark:!text-[#effff9]">
              {group.title}
            </p>

            <div className="space-y-1">
              {group.items.map((item) => {
                const resolvedHref =
                  item.label === "Enterprise Details" ? "/enterprises" : item.href;
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

  ? "bg-[#e9f4ee] font-bold text-[#0f5d4a] dark:!bg-[#124438] dark:!text-white dark:shadow-sm"
  : "text-[#4f6f67] hover:bg-[#f4faf7] hover:text-[#0f5d4a] dark:!text-[#d8eee7] dark:hover:!bg-[#103329] dark:hover:!text-white"
                    }`}
                  >
                    <span className="w-4 shrink-0 text-center text-base leading-none dark:!text-current">
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
      <aside className="fixed left-0 top-[72px] hidden h-[calc(100vh-72px)] w-[240px] border-r border-[#e3eee9] bg-white transition-colors lg:block dark:border-[#21463c] dark:bg-[#071713]">
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
          className={`absolute left-0 top-[72px] flex max-h-[calc(100vh-72px)] w-[280px] max-w-[86vw] flex-col overflow-y-auto border-r border-[#e3eee9] bg-white shadow-[0_20px_40px_rgba(7,53,45,0.18)] transition-transform duration-200 dark:border-[#21463c] dark:bg-[#071713] ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-[#edf3f0] px-4 py-4 dark:border-[#21463c]">
            <p className="text-sm font-bold text-[#06201c] dark:text-[#f8fffc]">Menu</p>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full text-[#52736a] hover:bg-[#f4faf7] dark:text-[#bdd2cb] dark:hover:bg-[#103329]"
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
