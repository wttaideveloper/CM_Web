"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { AppFrame, HeaderFrame, SidebarFrame } from "@ihp/ui";

import {
  enterpriseNavigationGroups,
  type EnterpriseNavigationIcon,
  type EnterpriseNavigationItem,
} from "./enterprise-navigation";

type EnterpriseAdminLayoutProps = {
  children: ReactNode;
  profileHref: string;
  messagesHref?: string;
  notificationsHref?: string;
  resolveNavigationHref?: (item: EnterpriseNavigationItem) => string;
  user?: {
    fullName?: string;
    email?: string;
  } | null;
  onLogout: () => Promise<void> | void;
};

type OpenMenu = "notifications" | "settings" | "profile" | null;

function DashboardIcon() {
  return <Icon path="M4 4h7v7H4V4Zm9 0h7v5h-7V4ZM4 13h5v7H4v-7Zm7 0h9v7h-9v-7Z" />;
}

function BuildingIcon() {
  return <Icon path="M4 20V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v15M14 8h5a1 1 0 0 1 1 1v11M8 8h.01M8 12h.01M8 16h.01M11 8h.01M11 12h.01M11 16h.01M17 12h.01M17 16h.01" />;
}

function DetailsIcon() {
  return <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="12" r="2" fill="currentColor" /></svg>;
}

function PackageIcon() {
  return <Icon path="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5v-9ZM12 3v18M3 7.5l9 4.5 9-4.5" />;
}

function ServiceIcon() {
  return <Icon path="M14 7 7 14M6 8l2-2a2.8 2.8 0 1 1 4 4l-2 2M12 14l2-2a2.8 2.8 0 1 1 4 4l-2 2M5 19l4-4" />;
}

function CalendarIcon() {
  return <Icon path="M7 3v4M17 3v4M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />;
}

function TrainingIcon() {
  return <Icon path="M2 9.5 12 4l10 5.5-10 5.5L2 9.5ZM6 11.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5" />;
}

function ChartIcon() {
  return <Icon path="M4 19.5h16M7 16v-4M12 16V8M17 16v-7" />;
}

function SettingsIcon() {
  return <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none"><path d="M12 8.2A3.8 3.8 0 1 0 12 15.8 3.8 3.8 0 0 0 12 8.2Zm7.4 3.8a7.1 7.1 0 0 0-.1-1l2-1.5-2-3.4-2.4.8a7.2 7.2 0 0 0-1.7-1L15.1 3h-4.2l-.9 2.9a7.2 7.2 0 0 0-1.7 1l-2.4-.8-2 3.4 2 1.5a7.1 7.1 0 0 0 0 2l-2 1.5 2 3.4 2.4-.8a7.2 7.2 0 0 0 1.7 1l.9 2.9h4.2l.9-2.9a7.2 7.2 0 0 0 1.7-1l2.4.8 2-3.4-2-1.5c.1-.3.1-.7.1-1Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>;
}

function Icon({ path }: { path: string }) {
  return <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none"><path d={path} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function BellIcon() {
  return <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M13.7 21a2 2 0 0 1-3.4 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
}

function MessageIcon() {
  return <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none"><path d="M7 18.5 4 21V7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H7Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M8.5 10h7M8.5 13h4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
}

function HeaderSettingsIcon() {
  return <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="2" /><path d="M19 13.5a7.8 7.8 0 0 0 0-3l2-1.5-2-3.4-2.4 1a8.5 8.5 0 0 0-2.6-1.5L13.7 2h-3.4L10 5.1a8.5 8.5 0 0 0-2.6 1.5l-2.4-1-2 3.4 2 1.5a7.8 7.8 0 0 0 0 3L3 15l2 3.4 2.4-1a8.5 8.5 0 0 0 2.6 1.5l.3 3.1h3.4l.3-3.1a8.5 8.5 0 0 0 2.6-1.5l2.4 1 2-3.4-2-1.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function ChevronRightIcon() {
  return <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function getInitials(name: string | undefined, email: string | undefined) {
  const initials = (name ?? "").trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return initials || email?.trim().slice(0, 2).toUpperCase() || "IH";
}

const navigationIcons: Record<EnterpriseNavigationIcon, () => React.JSX.Element> = {
  dashboard: DashboardIcon,
  building: BuildingIcon,
  details: DetailsIcon,
  package: PackageIcon,
  service: ServiceIcon,
  calendar: CalendarIcon,
  training: TrainingIcon,
  chart: ChartIcon,
  settings: SettingsIcon,
};

function isActive(pathname: string, item: EnterpriseNavigationItem) {
  if (item.activeMatch === "never") return false;
  if (item.activeMatch === "exact") return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function Brand() {
  return <Link href="/admin/dashboard" className="flex items-center gap-3 transition-opacity hover:opacity-90"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1f6a58] text-white"><svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 32 32" fill="none"><path d="M25 7C15.2 7.9 8.3 13.6 7.6 23.7C15.7 24.2 23.1 18.8 25 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M8.5 22.8C12 19.4 15.4 17.5 20 16.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg></div><h1 className="text-lg font-bold text-[#07352d]">Invigorate Health</h1></Link>;
}

export function EnterpriseAdminLayout({
  children,
  profileHref,
  messagesHref,
  notificationsHref,
  resolveNavigationHref = (item) => item.href,
  user,
  onLogout,
}: EnterpriseAdminLayoutProps) {
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);

  useEffect(() => {
    document.body.style.overflow = mobileSidebarOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileSidebarOpen]);

  useEffect(() => {
    const closeMenu = (event: MouseEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) setOpenMenu(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpenMenu(null); };
    document.addEventListener("mousedown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const navigation = useMemo(
    () => enterpriseNavigationGroups.map((group) => ({ ...group, items: group.items.map((item) => ({ item, href: resolveNavigationHref(item) })) })),
    [resolveNavigationHref],
  );

  const sidebarContent = (onNavigate?: () => void) => (
    <nav className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 pb-6">
      <div className="space-y-6">
        <div className="px-3 pt-1"><p className="text-sm font-bold uppercase tracking-[0.22em] text-[#6b4fd3]">Enterprise Owner</p></div>
        {navigation.map((group) => (
          <div key={group.title}>
            <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.22em] text-[#8ca69e]">{group.title}</p>
            <div className="space-y-1">
              {group.items.map(({ item, href }) => {
                const IconComponent = navigationIcons[item.icon];
                return <Link key={`${item.label}-${item.href}`} href={href} onClick={onNavigate} className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${isActive(pathname, item) ? "bg-[#e9f4ee] font-bold text-[#0f5d4a]" : "text-[#4f6f67] hover:bg-[#f4faf7] hover:text-[#0f5d4a]"}`}><span className="flex w-4 shrink-0 items-center justify-center text-current"><IconComponent /></span><span>{item.label}</span></Link>;
              })}
            </div>
          </div>
        ))}
      </div>
    </nav>
  );

  const closeMenu = () => setOpenMenu(null);

  return (
    <AppFrame
      sidebar={<SidebarFrame desktopContent={sidebarContent()} mobileHeader={<><p className="text-sm font-bold text-[#06201c]">Menu</p><button type="button" onClick={() => setMobileSidebarOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full text-[#52736a] hover:bg-[#f4faf7]" aria-label="Close sidebar"><svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg></button></>} mobileContent={sidebarContent(() => setMobileSidebarOpen(false))} mobileOpen={mobileSidebarOpen} onMobileSidebarClose={() => setMobileSidebarOpen(false)} />}
      header={<HeaderFrame headerRef={headerRef} left={<><button type="button" onClick={() => setMobileSidebarOpen((current) => !current)} className="flex h-9 w-9 items-center justify-center rounded-full text-[#52736a] hover:bg-[#f1f7f4] lg:hidden" aria-label="Open menu"><svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg></button><Brand /></>} right={<>
        {notificationsHref ? <Link href={notificationsHref} className="flex h-9 w-9 items-center justify-center rounded-full text-[#52736a] hover:bg-[#f1f7f4]" aria-label="Notifications" title="Notifications"><BellIcon /></Link> : null}
        {messagesHref ? <Link href={messagesHref} className="flex h-9 w-9 items-center justify-center rounded-full text-[#52736a] hover:bg-[#f1f7f4]" aria-label="Messages" title="Messages"><MessageIcon /></Link> : null}
        <div className="relative"><button type="button" onClick={() => setOpenMenu((current) => current === "settings" ? null : "settings")} className="flex h-9 w-9 items-center justify-center rounded-full text-[#52736a] hover:bg-[#f1f7f4]" aria-label="Settings" aria-expanded={openMenu === "settings"}><HeaderSettingsIcon /></button><div className={`absolute right-0 top-[calc(100%+10px)] w-64 origin-top-right rounded-2xl border border-[#e1ebe6] bg-white p-2 shadow-[0_18px_30px_rgba(7,53,45,0.12)] transition duration-150 ${openMenu === "settings" ? "pointer-events-auto scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"}`}>{["Account Settings", "Platform Preferences", "Billing Settings", "Integrations"].map((label) => <button key={label} type="button" onClick={closeMenu} className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium text-[#06201c] hover:bg-[#f7fbf9]"><span>{label}</span><ChevronRightIcon /></button>)}</div></div>
        <div className="relative"><button type="button" onClick={() => setOpenMenu((current) => current === "profile" ? null : "profile")} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e8f6ee] font-bold text-[#1f6a58] hover:bg-[#def0e7]" aria-label="Profile" aria-expanded={openMenu === "profile"}>{getInitials(user?.fullName, user?.email)}</button><div className={`absolute right-0 top-[calc(100%+10px)] w-60 origin-top-right rounded-2xl border border-[#e1ebe6] bg-white p-2 shadow-[0_18px_30px_rgba(7,53,45,0.12)] transition duration-150 ${openMenu === "profile" ? "pointer-events-auto scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"}`}><Link href={profileHref} onClick={closeMenu} className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium text-[#06201c] hover:bg-[#f7fbf9]"><span>View Profile</span><ChevronRightIcon /></Link><Link href="/admin/enterprise" onClick={closeMenu} className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium text-[#06201c] hover:bg-[#f7fbf9]"><span>My Enterprise</span><ChevronRightIcon /></Link><button type="button" onClick={closeMenu} className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium text-[#06201c] hover:bg-[#f7fbf9]"><span>Help Center</span><ChevronRightIcon /></button><button type="button" onClick={() => { closeMenu(); void onLogout(); }} className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium text-[#06201c] hover:bg-[#f7fbf9]"><span>Logout</span><ChevronRightIcon /></button></div></div>
      </>} />}
    >
      {children}
    </AppFrame>
  );
}
