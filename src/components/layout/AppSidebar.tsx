"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navGroups = [
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
      { label: "Enterprise Details", href: "/enterprises/1", icon: "◉", child: true },
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

export default function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-[72px] hidden h-[calc(100vh-72px)] w-[240px] border-r border-[#e3eee9] bg-white lg:block">
      <nav className="h-full overflow-y-auto px-3 py-4">
        <div className="space-y-6">
          {navGroups.map((group) => (
            <div key={group.title}>
              <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.22em] text-[#8ca69e]">
                {group.title}
              </p>

              <div className="space-y-1">
                {group.items.map((item) => {
                  const active = isActive(pathname, item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 rounded-xl py-2 text-sm font-medium transition ${
                        item.child ? "ml-5 px-3" : "px-3"
                      } ${
                        active
                          ? "bg-[#e9f4ee] font-bold text-[#0f5d4a]"
                          : "text-[#4f6f67] hover:bg-[#f4faf7] hover:text-[#0f5d4a]"
                      }`}
                    >
                      <span className="w-4 shrink-0 text-center text-base leading-none">
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
    </aside>
  );
}